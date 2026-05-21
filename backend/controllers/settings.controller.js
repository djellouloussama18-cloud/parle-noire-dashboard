const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../database/db');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'logo.png');
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files allowed'), false);
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 }
}).single('logo');

exports.getSettings = (req, res) => {
  try {
    const settingsRows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    settingsRows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

exports.updateSettings = (req, res) => {
  try {
    const newSettings = req.body;

    for (const [key, value] of Object.entries(newSettings)) {
      const exists = db.prepare('SELECT * FROM settings WHERE key = ?').get(key);
      if (exists) {
        db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(String(value), key);
      } else {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
      }
    }
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

exports.uploadLogo = (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Failed to upload logo' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const logoUrl = '/uploads/logo.png';

    const exists = db.prepare('SELECT * FROM settings WHERE key = ?').get('store_logo');
    if (exists) {
      db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(logoUrl, 'store_logo');
    } else {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('store_logo', logoUrl);
    }

    res.json({ store_logo: logoUrl, message: 'Logo uploaded successfully' });
  });
};