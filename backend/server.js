const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const backupsRoutes = require('./routes/backups.routes');
const productsRoutes = require('./routes/products.routes');
const categoriesRoutes = require('./routes/categories.routes');
const salesRoutes = require('./routes/sales.routes');
const customersRoutes = require('./routes/customers.routes');
const settingsRoutes = require('./routes/settings.routes');
const notesRoutes = require('./routes/notes.routes');
const calendarRoutes = require('./routes/calendar.routes');
const expensesRoutes = require('./routes/expenses.routes');
const reportsRoutes = require('./routes/reports.routes');
const backupService = require('./services/backup.service');
const setupService = require('./services/setup.service');
const licenseService = require('./services/license.service');
const licenseRoutes = require('./routes/license.routes');
const setupRoutes = require('./routes/setup.routes');
const migrationService = require('./services/migration.service');

const app = express();
const PORT = process.env.PORT || 3001;

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const { getDb } = require('./database/db');

// Ensure DB directory exists
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database and backup system
getDb()
  .then(async () => {
    console.log('Database ready');

    // Migration: fix user_id for existing data
    try {
      const migrationResults = await migrationService.migrateUserData();
      console.log('[Migration] ══════════════════════════════════════');
      for (const [table, data] of Object.entries(migrationResults)) {
        console.log(`[Migration] تم تحديث ${data.updated} سجل في ${table}`);
      }
      console.log('[Migration] ══════════════════════════════════════');
    } catch (err) {
      console.error('[Migration] خطأ:', err.message);
    }

    // Setup / First-run check
    var isFirstRun = null;
    try {
      isFirstRun = await setupService.isFirstRun();
      if (isFirstRun) {
        console.log('════════════════════════════════════');
        console.log('[Setup] حالة الإعداد: إعداد أول');
        console.log('[Setup] 🎉 مرحباً! هذا أول تشغيل للنظام');
        console.log('[Setup] 👉 افتح المتصفح على http://localhost:' + PORT + ' لإكمال الإعداد');
        console.log('════════════════════════════════════');
      } else {
        console.log('[Setup] حالة الإعداد: مكتمل');
      }
    } catch (err) {
      console.error('[Setup] خطأ في التحقق من حالة الإعداد:', err.message);
    }

    // License initialization
    try {
      var serial = licenseService.getSerial();
      var fingerprint = licenseService.getMachineFingerprint();
      console.log('════════════════════════════════════');
      console.log('[License] الرقم التسلسلي: ' + serial);
      console.log('[License] بصمة الجهاز: ' + fingerprint);
      console.log('════════════════════════════════════');
      if (!licenseService.validateSerial(serial)) {
        console.warn('[License] ⚠ تحذير: ملف الترخيص غير صحيح أو تالف');
      }
    } catch (err) {
      console.error('[License] خطأ في الترخيص:', err.message);
    }

    const integrityOk = await backupService.checkDatabaseIntegrity();
    if (!integrityOk) {
      console.warn('[Backup] ⚠ تحذير: قاعدة البيانات كانت تالفة وتمت استعادتها من آخر نسخة احتياطية');
    }

    const backupName = backupService.createAutoBackup();
    if (backupName) {
      console.log('[Backup] نسخة احتياطية جديدة: ' + backupName);
    }

    setInterval(() => {
      try {
        const name = backupService.createAutoBackup();
        if (name) {
          console.log('[Backup] نسخة احتياطية جديدة: ' + name);
        }
      } catch (err) {
        console.error('[Backup] خطأ في النسخ الاحتياطي التلقائي:', err.message);
      }
    }, 60 * 60 * 1000);
  })
  .catch(err => console.error('DB init error:', err));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/backups', backupsRoutes);

app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/license', licenseRoutes);
app.use('/api/setup', setupRoutes);

const distPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('<html><body><h1>Parle Noire POS</h1><p>Frontend not built yet. Run: cd frontend && npm run build</p></body></html>');
  }
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log('========================================');
  console.log('  Parle Noire POS Server');
  console.log('========================================');
  console.log(`  Running on: http://localhost:${PORT}`);
  console.log(`  Database: ${path.join(__dirname, '..', 'database', 'pos_store.db')}`);

});
