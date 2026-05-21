const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const backupService = require('../services/backup.service');
const db = require('../database/db');
const authMiddleware = require('../middleware/auth.middleware');

const BACKUP_DIR = process.env.BACKUP_PATH || path.join(__dirname, '..', 'backups');

// GET all backups
router.get('/', authMiddleware, (req, res, next) => {
  try {
    const list = db.prepare('SELECT * FROM backups ORDER BY id DESC').all();
    return res.json(list);
  } catch (err) {
    next(err);
  }
});

// POST to create backup now
router.post('/now', authMiddleware, (req, res, next) => {
  try {
    const result = backupService.createBackup();
    if (result) {
      return res.status(201).json({
        message: 'تم إنشاء النسخة الاحتياطية بنجاح',
        backup: result
      });
    } else {
      return res.status(500).json({ error: 'BACKUP_FAILED', message: 'فشل إنشاء نسخة احتياطية' });
    }
  } catch (err) {
    console.error('❌ Backup creation error:', err.message || err);
    return res.status(500).json({ error: 'BACKUP_FAILED', message: err.message || 'فشل إنشاء نسخة احتياطية' });
  }
});

// GET download a specific backup by id
router.get('/:id/download', authMiddleware, (req, res, next) => {
  try {
    const { id } = req.params;
    const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(id);
    if (!backup) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'النسخة الاحتياطية غير موجودة' });
    }

    const filePath = path.join(BACKUP_DIR, backup.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'FILE_NOT_FOUND', message: 'ملف النسخة الاحتياطية غير موجود على القرص' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', backup.size_bytes);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
