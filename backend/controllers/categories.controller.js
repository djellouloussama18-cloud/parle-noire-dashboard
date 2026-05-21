const db = require('../database/db');

exports.getCategories = (req, res, next) => {
  try {
    const list = db.prepare('SELECT * FROM categories ORDER BY id ASC').all();
    return res.json(list);
  } catch (err) {
    next(err);
  }
};

exports.createCategory = (req, res, next) => {
  try {
    const { name_ar, name_en, color, icon } = req.body;
    if (!name_ar) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'اسم الفئة بالعربية مطلوب' });
    }

    const info = db.prepare('INSERT INTO categories (name_ar, name_en, color, icon) VALUES (?, ?, ?, ?)')
      .run(name_ar, name_en || null, color || '#00FF7F', icon || 'Tag');

    const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
    return res.status(201).json(newCategory);
  } catch (err) {
    next(err);
  }
};

exports.updateCategory = (req, res, next) => {
  try {
    const { id } = req.params;
    const { name_ar, name_en, color, icon } = req.body;

    if (!name_ar) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'اسم الفئة بالعربية مطلوب' });
    }

    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'الفئة غير موجودة' });
    }

    // SQLite update
    db.prepare('UPDATE categories SET name_ar = ?, name_en = ?, color = ?, icon = ? WHERE id = ?')
      .run(name_ar, name_en || null, color || '#00FF7F', icon || existing.icon || 'Tag', id);

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    return res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'الفئة غير موجودة' });
    }

    // Check if products exist in this category for the current user
    const productsCount = db.prepare('SELECT * FROM products WHERE category_id = ? AND user_id = ?').all(id, req.user.id).length;
    if (productsCount > 0) {
      return res.status(400).json({ error: 'CONSTRAINT_ERROR', message: 'لا يمكن حذف هذه الفئة لوجود منتجات مرتبطة بها' });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return res.json({ message: 'تم حذف الفئة بنجاح' });
  } catch (err) {
    next(err);
  }
};
