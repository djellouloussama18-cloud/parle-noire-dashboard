const express = require('express');
const { getDb, saveDb } = require('../database/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    console.log('[categories.GET] Fetching categories...');
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY id DESC');
    stmt.bind(['default']);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    console.log('[categories.GET] Found', rows.length, 'categories');
    res.json(rows);
  } catch (err) {
    console.error('[categories.GET] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    console.log('[categories.GET/:id] Fetching category', req.params.id);
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?');
    stmt.bind([req.params.id, 'default']);
    let category = null;
    if (stmt.step()) category = stmt.getAsObject();
    stmt.free();
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    res.json(category);
  } catch (err) {
    console.error('[categories.GET/:id] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    console.log('[categories.POST] Request body:', req.body);
    const { name_ar, name_en, color, icon } = req.body;
    const db = await getDb();

    console.log('[categories.POST] Inserting category...');
    const result = db.run(
      'INSERT INTO categories (name_ar, name_en, color, icon, user_id) VALUES (?, ?, ?, ?, ?)',
      [name_ar, name_en, color, icon, 'default']
    );
    const newId = result.lastInsertRowid || result.lastID;
    console.log('[categories.POST] Category inserted, ID:', newId);

    const responseData = {
      id: newId,
      name_ar: name_ar || '',
      name_en: name_en || '',
      color: color || '',
      icon: icon || '',
      user_id: 'default'
    };

    console.log('[categories.POST] Sending success response before saveDb');
    res.status(201).json({ success: true, data: responseData, message: 'تمت الإضافة بنجاح' });

    setImmediate(() => {
      try {
        saveDb();
        console.log('[categories.POST] Database saved to disk');
      } catch (e) {
        console.error('[categories.POST] Save failed (data is in memory):', e.message);
      }
    });
  } catch (err) {
    console.error('[categories.POST] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

router.put('/:id', async (req, res) => {
  try {
    console.log('[categories.PUT] Updating category', req.params.id, 'body:', req.body);
    const { name_ar, name_en, color, icon } = req.body;
    const db = await getDb();

    const stmt = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?');
    stmt.bind([req.params.id, 'default']);
    let existing = null;
    if (stmt.step()) existing = stmt.getAsObject();
    stmt.free();
    if (!existing) {
      console.log('[categories.PUT] Category not found');
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    const mergedNameAr = name_ar || existing.name_ar;
    const mergedNameEn = name_en || existing.name_en;
    const mergedColor = color || existing.color;
    const mergedIcon = icon || existing.icon;

    console.log('[categories.PUT] Updating category in DB...');
    db.run(
      'UPDATE categories SET name_ar = ?, name_en = ?, color = ?, icon = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [mergedNameAr, mergedNameEn, mergedColor, mergedIcon, req.params.id, 'default']
    );

    const responseData = {
      id: Number(req.params.id),
      name_ar: mergedNameAr,
      name_en: mergedNameEn,
      color: mergedColor,
      icon: mergedIcon,
      user_id: 'default'
    };

    console.log('[categories.PUT] Sending success response before saveDb');
    res.json({ success: true, data: responseData, message: 'تم التحديث بنجاح' });

    setImmediate(() => {
      try {
        saveDb();
        console.log('[categories.PUT] Database saved to disk');
      } catch (e) {
        console.error('[categories.PUT] Save failed (data is in memory):', e.message);
      }
    });
  } catch (err) {
    console.error('[categories.PUT] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

router.delete('/:id', async (req, res) => {
  try {
    console.log('[categories.DELETE] Deleting category', req.params.id);
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?');
    stmt.bind([req.params.id, 'default']);
    let category = null;
    if (stmt.step()) category = stmt.getAsObject();
    stmt.free();
    if (!category) {
      console.log('[categories.DELETE] Category not found');
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    db.run('UPDATE products SET category_id = NULL WHERE category_id = ?', [req.params.id]);
    db.run('DELETE FROM categories WHERE id = ? AND user_id = ?', [req.params.id, 'default']);

    console.log('[categories.DELETE] Sending success response before saveDb');
    res.json({ success: true, data: { id: Number(req.params.id) }, message: 'تم الحذف بنجاح' });

    setImmediate(() => {
      try {
        saveDb();
        console.log('[categories.DELETE] Database saved to disk');
      } catch (e) {
        console.error('[categories.DELETE] Save failed (data is in memory):', e.message);
      }
    });
  } catch (err) {
    console.error('[categories.DELETE] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

module.exports = router;
