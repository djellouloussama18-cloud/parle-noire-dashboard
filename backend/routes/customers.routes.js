const express = require('express');
const { getDb, saveDb } = require('../database/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    console.log('[customers.GET] Fetching customers...');
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM customers WHERE user_id = ? ORDER BY id DESC');
    stmt.bind(['default']);
    const customers = [];
    while (stmt.step()) customers.push(stmt.getAsObject());
    stmt.free();
    console.log('[customers.GET] Found', customers.length, 'customers');
    res.json(customers);
  } catch (err) {
    console.error('[customers.GET] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    console.log('[customers.GET/:id] Fetching customer', req.params.id);
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM customers WHERE id = ? AND user_id = ?');
    stmt.bind([req.params.id, 'default']);
    let customer = null;
    if (stmt.step()) customer = stmt.getAsObject();
    stmt.free();
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json(customer);
  } catch (err) {
    console.error('[customers.GET/:id] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    console.log('[customers.POST] Request body:', req.body);
    const { name, phone, email, address } = req.body;
    if (!name) {
      console.log('[customers.POST] Missing name');
      return res.status(400).json({ success: false, error: 'Customer name is required' });
    }

    const db = await getDb();
    console.log('[customers.POST] Inserting customer...');
    const result = db.run(
      'INSERT INTO customers (name, phone, email, address, total_purchases, user_id) VALUES (?, ?, ?, ?, 0, ?)',
      [name, phone, email, address, 'default']
    );
    const newId = result.lastInsertRowid || result.lastID;
    console.log('[customers.POST] Customer inserted, ID:', newId);

    const responseData = {
      id: newId,
      name: name || '',
      phone: phone || '',
      email: email || '',
      address: address || '',
      total_purchases: 0,
      user_id: 'default'
    };

    console.log('[customers.POST] Sending success response before saveDb');
    res.status(201).json({ success: true, data: responseData, message: 'تمت الإضافة بنجاح' });

    setImmediate(() => {
      try {
        saveDb();
        console.log('[customers.POST] Database saved to disk');
      } catch (e) {
        console.error('[customers.POST] Save failed (data is in memory):', e.message);
      }
    });
  } catch (err) {
    console.error('[customers.POST] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

router.put('/:id', async (req, res) => {
  try {
    console.log('[customers.PUT] Updating customer', req.params.id, 'body:', req.body);
    const { name, phone, email, address, total_purchases } = req.body;
    const db = await getDb();

    const stmt = db.prepare('SELECT * FROM customers WHERE id = ? AND user_id = ?');
    stmt.bind([req.params.id, 'default']);
    let existing = null;
    if (stmt.step()) existing = stmt.getAsObject();
    stmt.free();
    if (!existing) {
      console.log('[customers.PUT] Customer not found');
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const mergedName = name || existing.name;
    const mergedPhone = phone || existing.phone;
    const mergedEmail = email || existing.email;
    const mergedAddress = address || existing.address;
    const mergedTotalPurchases = total_purchases ?? existing.total_purchases;

    console.log('[customers.PUT] Updating customer in DB...');
    db.run(
      `UPDATE customers SET
        name = ?, phone = ?, email = ?, address = ?,
        total_purchases = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?`,
      [mergedName, mergedPhone, mergedEmail, mergedAddress, mergedTotalPurchases, req.params.id, 'default']
    );

    const responseData = {
      id: Number(req.params.id),
      name: mergedName,
      phone: mergedPhone,
      email: mergedEmail,
      address: mergedAddress,
      total_purchases: mergedTotalPurchases,
      user_id: 'default'
    };

    console.log('[customers.PUT] Sending success response before saveDb');
    res.json({ success: true, data: responseData, message: 'تم التحديث بنجاح' });

    setImmediate(() => {
      try {
        saveDb();
        console.log('[customers.PUT] Database saved to disk');
      } catch (e) {
        console.error('[customers.PUT] Save failed (data is in memory):', e.message);
      }
    });
  } catch (err) {
    console.error('[customers.PUT] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

router.delete('/:id', async (req, res) => {
  try {
    console.log('[customers.DELETE] Deleting customer', req.params.id);
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM customers WHERE id = ? AND user_id = ?');
    stmt.bind([req.params.id, 'default']);
    let customer = null;
    if (stmt.step()) customer = stmt.getAsObject();
    stmt.free();
    if (!customer) {
      console.log('[customers.DELETE] Customer not found');
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    db.run('UPDATE sales SET customer_id = NULL WHERE customer_id = ?', [req.params.id]);
    db.run('DELETE FROM customers WHERE id = ? AND user_id = ?', [req.params.id, 'default']);

    console.log('[customers.DELETE] Sending success response before saveDb');
    res.json({ success: true, data: { id: Number(req.params.id) }, message: 'تم الحذف بنجاح' });

    setImmediate(() => {
      try {
        saveDb();
        console.log('[customers.DELETE] Database saved to disk');
      } catch (e) {
        console.error('[customers.DELETE] Save failed (data is in memory):', e.message);
      }
    });
  } catch (err) {
    console.error('[customers.DELETE] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

module.exports = router;
