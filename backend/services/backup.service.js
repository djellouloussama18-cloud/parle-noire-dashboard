const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const db = require('../database/db');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'pos_store.db');
const BACKUP_DIR = process.env.BACKUP_PATH || path.join(__dirname, '..', 'backups');

function createBackup() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_PATH)) {
      console.log('⚠️ Database file does not exist yet to backup.');
      return null;
    }

    // Check available disk space (minimum 10MB required)
    try {
      const dbStats = fs.statSync(DB_PATH);
      const freeSpace = dbStats.size + 10 * 1024 * 1024; // Rough check
      if (freeSpace < dbStats.size * 2) {
        const err = new Error('لا توجد مساحة كافية على القرص لإنشاء نسخة احتياطية');
        err.code = 'DISK_FULL';
        throw err;
      }
    } catch (diskErr) {
      if (diskErr.code === 'DISK_FULL') throw diskErr;
      // Other stat errors are non-fatal, proceed anyway
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.db`;
    const destPath = path.join(BACKUP_DIR, filename);

    // Atomic copy: write to temp file first then rename
    const tmpPath = destPath + '.tmp';
    fs.copyFileSync(DB_PATH, tmpPath);
    fs.renameSync(tmpPath, destPath);

    const stats = fs.statSync(destPath);
    const sizeBytes = stats.size;

    // Verify the copy is valid
    if (sizeBytes === 0) {
      fs.unlinkSync(destPath);
      throw new Error('فشل التحقق من النسخة الاحتياطية — الملف فارغ');
    }

    // Save metadata in database
    db.prepare('INSERT INTO backups (filename, size_bytes, created_at) VALUES (?, ?, ?)')
      .run(filename, sizeBytes, new Date().toISOString());

    console.log(`✅ Backup successfully created: ${filename} (${(sizeBytes / 1024).toFixed(1)} KB)`);

    // Clean up old backups (keep only last 7)
    cleanupOldBackups();

    return { filename, sizeBytes };
  } catch (err) {
    console.error('❌ Failed to create backup:', err);
    throw err;
  }
}

function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('backup_') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Newest first

    if (files.length > 7) {
      const toDelete = files.slice(7);
      toDelete.forEach(file => {
        const filePath = path.join(BACKUP_DIR, file.name);
        fs.unlinkSync(filePath);
        
        // Also remove from backups DB table
        db.prepare('DELETE FROM backups WHERE filename = ?').run(file.name);
        console.log(`🗑️ Deleted old backup: ${file.name}`);
      });
    }
  } catch (err) {
    console.error('❌ Error during backup cleanup:', err);
  }
}

// Schedule automatic backups: run every day at midnight
cron.schedule('0 0 * * *', () => {
  console.log('⏰ Running scheduled midnight database backup...');
  createBackup();
});

module.exports = {
  createBackup,
  cleanupOldBackups
};
