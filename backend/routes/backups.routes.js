const express = require('express');
const path = require('path');
const fs = require('fs');
const backupService = require('../services/backup.service');

const router = express.Router();
const backupDir = path.join(__dirname, '..', '..', 'backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

router.post('/restore', (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ success: false, error: 'اسم الملف مطلوب' });
    }
    backupService.createAutoBackup();
    backupService.restoreFromBackup(filename);
    res.json({ success: true, message: 'تم الاسترجاع بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/', (req, res) => {
  try {
    const backups = backupService.getBackupList();
    res.json({ success: true, backups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const filename = backupService.createAutoBackup();
    if (!filename) {
      return res.status(400).json({ success: false, error: 'قاعدة البيانات غير موجودة' });
    }
    res.status(201).json({ success: true, filename });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/download', (req, res) => {
  try {
    const safeName = path.basename(req.params.id);
    const filePath = path.join(backupDir, safeName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'الملف غير موجود' });
    }
    res.download(filePath, safeName);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:filename', (req, res) => {
  try {
    const safeName = path.basename(req.params.filename);
    if (!safeName.startsWith('auto-backup-') || !safeName.endsWith('.db')) {
      return res.status(400).json({ success: false, error: 'اسم ملف غير صالح' });
    }
    const filePath = path.join(backupDir, safeName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'الملف غير موجود' });
    }
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
