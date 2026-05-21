const db = require('../database/db');

exports.getNotes = (req, res, next) => {
  try {
    const { type, priority, product_id, search, unread_only } = req.query;
    let notes = db.prepare('SELECT * FROM notes ORDER BY id DESC').all();

    if (type) {
      notes = db.prepare('SELECT * FROM notes WHERE type = ? ORDER BY id DESC').all(type);
    }

    if (priority) {
      notes = notes.filter(n => n.priority === priority);
    }

    if (product_id) {
      notes = notes.filter(n => n.product_id == product_id);
    }

    if (unread_only === 'true') {
      notes = db.prepare('SELECT * FROM notes WHERE read = ? ORDER BY id DESC').all(0);
    }

    if (search) {
      const t = search.toLowerCase();
      notes = notes.filter(n =>
        (n.title && n.title.toLowerCase().includes(t)) ||
        (n.content && n.content.toLowerCase().includes(t))
      );
    }

    return res.json(notes);
  } catch (err) {
    next(err);
  }
};

exports.createNote = (req, res, next) => {
  try {
    const { type, title, content, priority, product_id, reminder_date } = req.body;

    if (!type || !title) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'النوع والعنوان مطلوبان' });
    }

    const validTypes = ['system', 'merchant'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'نوع الملاحظة غير صالح' });
    }

    const validPriorities = ['high', 'medium', 'low'];
    const finalPriority = priority && validPriorities.includes(priority) ? priority : 'medium';

    const note = db.prepare(`
      INSERT INTO notes (type, title, content, priority, product_id, reminder_date, read, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      type,
      title,
      content || '',
      finalPriority,
      product_id || null,
      reminder_date || null,
      0,
      req.user?.id || null
    );

    const createdNote = db.prepare('SELECT * FROM notes WHERE id = ?').get(note.lastInsertRowid);
    return res.status(201).json(createdNote);
  } catch (err) {
    next(err);
  }
};

exports.updateNote = (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, priority, read, reminder_date } = req.body;

    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'الملاحظة غير موجودة' });
    }

    db.prepare('UPDATE notes SET title = ?, content = ?, priority = ?, read = ?, reminder_date = ? WHERE id = ?').run(
      title !== undefined ? title : existing.title,
      content !== undefined ? content : existing.content,
      priority !== undefined ? priority : existing.priority,
      read !== undefined ? read : existing.read,
      reminder_date !== undefined ? reminder_date : existing.reminder_date,
      id
    );

    const updated = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    return res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.deleteNote = (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'الملاحظة غير موجودة' });
    }

    db.prepare('DELETE FROM notes WHERE id = ?').run(id);
    return res.json({ message: 'تم حذف الملاحظة بنجاح' });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'الملاحظة غير موجودة' });
    }

    db.prepare('UPDATE notes SET read = ? WHERE id = ?').run(1, id);
    return res.json({ message: 'تم تحديد الملاحظة كمقروءة' });
  } catch (err) {
    next(err);
  }
};

exports.getUnreadCount = (req, res, next) => {
  try {
    const notes = db.prepare('SELECT * FROM notes WHERE read = ?').all(0);
    const byType = { system: 0, merchant: 0 };
    notes.forEach(n => {
      if (byType[n.type] !== undefined) byType[n.type]++;
    });
    return res.json({ total: notes.length, ...byType });
  } catch (err) {
    next(err);
  }
};
