const express = require('express');
const { getDb, saveDb } = require('../database/db');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const router = express.Router();

const logosDir = path.join(__dirname, '..', '..', 'uploads', 'logos');
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, logosDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `logo-${Date.now()}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Use PNG, JPG, or WebP.'));
    }
  }
});

router.get('/', async (req, res) => {
  try {
    console.log('[settings.GET] Fetching settings...');
    const db = await getDb();
    const stmt = db.prepare('SELECT key, value FROM settings WHERE user_id = ?');
    stmt.bind(['default']);
    const settings = [];
    while (stmt.step()) settings.push(stmt.getAsObject());
    stmt.free();
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });
    res.json(result);
  } catch (err) {
    console.error('[settings.GET] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/all', async (req, res) => {
  try {
    console.log('[settings.GET/all] Fetching all settings...');
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM settings WHERE user_id = ? ORDER BY key');
    stmt.bind(['default']);
    const settings = [];
    while (stmt.step()) settings.push(stmt.getAsObject());
    stmt.free();
    res.json(settings);
  } catch (err) {
    console.error('[settings.GET/all] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/upsert', async (req, res) => {
  try {
    console.log('[settings.upsert] Request body:', req.body);
    const { key, value } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, error: 'Key is required' });
    }
    const db = await getDb();

    const stmt = db.prepare('SELECT * FROM settings WHERE key = ? AND user_id = ?');
    stmt.bind([key, 'default']);
    let existing = null;
    if (stmt.step()) existing = stmt.getAsObject();
    stmt.free();

    if (existing) {
      db.run('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ? AND user_id = ?', [String(value), key, 'default']);
    } else {
      db.run('INSERT INTO settings (key, value, user_id) VALUES (?, ?, ?)', [key, String(value), 'default']);
    }

    const responseData = { key, value: String(value), user_id: 'default' };

    console.log('[settings.upsert] Sending success response before saveDb');
    res.json({ success: true, data: responseData, message: 'تم الحفظ بنجاح' });

    setImmediate(() => {
      try {
        saveDb();
        console.log('[settings.upsert] Database saved to disk');
      } catch (e) {
        console.error('[settings.upsert] Save failed (data is in memory):', e.message);
      }
    });
  } catch (err) {
    console.error('[settings.upsert] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

router.post('/batch', async (req, res) => {
  try {
    const settings = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid settings object' });
    }
    const db = await getDb();
    db.run("BEGIN");

    for (const [key, value] of Object.entries(settings)) {
      const stmt = db.prepare('SELECT * FROM settings WHERE key = ? AND user_id = ?');
      stmt.bind([key, 'default']);
      let existing = null;
      if (stmt.step()) existing = stmt.getAsObject();
      stmt.free();

      if (existing) {
        db.run('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ? AND user_id = ?', [String(value), key, 'default']);
      } else {
        db.run('INSERT INTO settings (key, value, user_id) VALUES (?, ?, ?)', [key, String(value), 'default']);
      }
    }

    db.run("COMMIT");

    console.log('[settings.batch] Sending success response before saveDb');
    res.json({ success: true, data: settings, message: 'تم الحفظ بنجاح' });

    setImmediate(() => {
      try {
        saveDb();
        console.log('[settings.batch] Database saved to disk');
      } catch (e) {
        console.error('[settings.batch] Save failed (data is in memory):', e.message);
      }
    });
  } catch (err) {
    console.error('[settings.batch] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

router.post('/upload/logo', upload.single('logo'), async (req, res) => {
  try {
    console.log('[settings.uploadLogo] Uploading logo...');
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    const db = await getDb();

    const stmt = db.prepare('SELECT * FROM settings WHERE key = ? AND user_id = ?');
    stmt.bind(['store_logo', 'default']);
    let existing = null;
    if (stmt.step()) existing = stmt.getAsObject();
    stmt.free();

    if (existing) {
      db.run('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ? AND user_id = ?', [logoUrl, 'store_logo', 'default']);
    } else {
      db.run('INSERT INTO settings (key, value, user_id) VALUES (?, ?, ?)', ['store_logo', logoUrl, 'default']);
    }

    console.log('[settings.uploadLogo] Sending success response before saveDb');
    res.json({ success: true, data: { url: logoUrl }, message: 'تم رفع الشعار بنجاح' });

    setImmediate(() => {
      try {
        saveDb();
        console.log('[settings.uploadLogo] Database saved to disk');
      } catch (e) {
        console.error('[settings.uploadLogo] Save failed (data is in memory):', e.message);
      }
    });
  } catch (err) {
    console.error('[settings.uploadLogo] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

router.get('/documentation', (req, res) => {
  try {
    const readmePath = path.join(__dirname, '..', '..', 'README.md');
    if (!fs.existsSync(readmePath)) {
      return res.status(404).json({ success: false, error: 'Documentation file not found' });
    }
    res.download(readmePath, 'Parle_Noire_POS_Documentation.md');
  } catch (err) {
    console.error('[settings.documentation] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
