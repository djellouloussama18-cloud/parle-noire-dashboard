const express = require('express');
const { getDb, saveDb } = require('../database/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    console.log('[notes.GET] Fetching notes...');
    const unreadOnly = req.query.unreadOnly === 'true';
    const db = await getDb();

    let notes;
    if (unreadOnly) {
      const stmt = db.prepare('SELECT * FROM notes WHERE read = 0 AND created_by = ? ORDER BY created_at DESC');
      stmt.bind(['default']);
      notes = [];
      while (stmt.step()) notes.push(stmt.getAsObject());
      stmt.free();
    } else {
      const stmt = db.prepare('SELECT * FROM notes WHERE created_by = ? ORDER BY created_at DESC');
      stmt.bind(['default']);
      notes = [];
      while (stmt.step()) notes.push(stmt.getAsObject());
      stmt.free();
    }

    console.log('[notes.GET] Found', notes.length, 'notes');
    res.json(notes);
  } catch (err) {
    console.error('[notes.GET] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const db = await getDb();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM notes WHERE read = 0 AND created_by = ?');
    stmt.bind(['default']);
    stmt.step();
    const result = stmt.getAsObject();
    stmt.free();
    res.json({ count: result.count });
  } catch (err) {
    console.error('[notes.unread-count] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    console.log('[notes.GET/:id] Fetching note', req.params.id);
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM notes WHERE id = ? AND created_by = ?');
    stmt.bind([req.params.id, 'default']);
    let note = null;
    if (stmt.step()) note = stmt.getAsObject();
    stmt.free();
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    res.json(note);
  } catch (err) {
    console.error('[notes.GET/:id] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    console.log('[notes.POST] Request body:', req.body);
    const { type, title, content, priority, product_id, reminder_date } = req.body;

    const db = await getDb();
    console.log('[notes.POST] Inserting note...');
    const result = db.run(
      `INSERT INTO notes (
        type, title, content, priority, product_id,
        reminder_date, read, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [type || 'general', title, content, priority || 'normal', product_id || null, reminder_date || null, 'default']
    );
    const newId = result.lastInsertRowid || result.lastID;
    console.log('[notes.POST] Note inserted, ID:', newId);

    const responseData = {
      id: newId,
      type: type || 'general',
      title: title || '',
      content: content || '',
      priority: priority || 'normal',
      product_id: product_id || null,
      reminder_date: reminder_date || null,
      read: 0,
      created_by: 'default'
    };

    console.log('[notes.POST] Sending success response before saveDb');
    res.status(201).json({ success: true, data: responseData, message: 'تمت الإضافة بنجاح' });

    setImmediate(() => {
      try {
        saveDb();
        console.log('[notes.POST] Database saved to disk');
      } catch (e) {
        console.error('[notes.POST] Save failed (data is in memory):', e.message);
      }
    });
  } catch (err) {
    console.error('[notes.POST] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

router.put('/:id', async (req, res) => {
  try {
    console.log('[notes.PUT] Updating note', req.params.id, 'body:', req.body);
    const { type, title, content, priority, product_id, reminder_date, read } = req.body;

    const db = await getDb();

    const stmt = db.prepare('SELECT * FROM notes WHERE id = ? AND created_by = ?');
    stmt.bind([req.params.id, 'default']);
    let existing = null;
    if (stmt.step()) existing = stmt.getAsObject();
    stmt.free();
    if (!existing) {
      console.log('[notes.PUT] Note not found');
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const mergedType = type || existing.type;
    const mergedTitle = title || existing.title;
    const mergedContent = content || existing.content;
    const mergedPriority = priority || existing.priority;
    const mergedProductId = product_id ?? existing.product_id;
    const mergedReminderDate = reminder_date || existing.reminder_date;
    const mergedRead = read ?? existing.read;

    console.log('[notes.PUT] Updating note in DB...');
    db.run(
      `UPDATE notes SET
        type = ?, title = ?, content = ?, priority = ?,
        product_id = ?, reminder_date = ?, read = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [mergedType, mergedTitle, mergedContent, mergedPriority, mergedProductId, mergedReminderDate, mergedRead, req.params.id]
    );

    const responseData = {
      id: Number(req.params.id),
      type: mergedType,
      title: mergedTitle,
      content: mergedContent,
      priority: mergedPriority,
      product_id: mergedProductId,
      reminder_date: mergedReminderDate,
      read: mergedRead,
      created_by: 'default'
    };

    console.log('[notes.PUT] Sending success response before saveDb');
    res.json({ success: true, data: responseData, message: 'تم التحديث بنجاح' });

    setImmediate(() => {
      try {
        saveDb();
        console.log('[notes.PUT] Database saved to disk');
      } catch (e) {
        console.error('[notes.PUT] Save failed (data is in memory):', e.message);
      }
    });
  } catch (err) {
    console.error('[notes.PUT] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    console.log('[notes.PATCH/read] Marking note', req.params.id, 'as read');
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM notes WHERE id = ? AND created_by = ?');
    stmt.bind([req.params.id, 'default']);
    let existing = null;
    if (stmt.step()) existing = stmt.getAsObject();
    stmt.free();
    if (!existing) {
      console.log('[notes.PATCH/read] Note not found');
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    db.run('UPDATE notes SET read = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);

    const responseData = { ...existing, read: 1 };

    console.log('[notes.PATCH/read] Sending success response before saveDb');
    res.json({ success: true, data: responseData, message: 'تم التحديث بنجاح' });

    setImmediate(() => {
      try {
        saveDb();
        console.log('[notes.PATCH/read] Database saved to disk');
      } catch (e) {
        console.error('[notes.PATCH/read] Save failed (data is in memory):', e.message);
      }
    });
  } catch (err) {
    console.error('[notes.PATCH/read] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

router.delete('/:id', async (req, res) => {
  try {
    console.log('[notes.DELETE] Deleting note', req.params.id);
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM notes WHERE id = ? AND created_by = ?');
    stmt.bind([req.params.id, 'default']);
    let note = null;
    if (stmt.step()) note = stmt.getAsObject();
    stmt.free();
    if (!note) {
      console.log('[notes.DELETE] Note not found');
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    db.run('DELETE FROM notes WHERE id = ?', [req.params.id]);

    console.log('[notes.DELETE] Sending success response before saveDb');
    res.json({ success: true, data: { id: Number(req.params.id) }, message: 'تم الحذف بنجاح' });

    setImmediate(() => {
      try {
        saveDb();
        console.log('[notes.DELETE] Database saved to disk');
      } catch (e) {
        console.error('[notes.DELETE] Save failed (data is in memory):', e.message);
      }
    });
  } catch (err) {
    console.error('[notes.DELETE] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

module.exports = router;
