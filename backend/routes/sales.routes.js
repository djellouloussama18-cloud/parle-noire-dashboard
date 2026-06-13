const express = require('express');
const router = express.Router();
const DB = require('../database/db');
const { getDb, saveDb } = DB;

function getDateRange(period) {
  if (!period) return null;
  const now = new Date();
  let start;
  switch (period) {
    case 'today':
    case 'day':
      start = new Date();
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - start.getDay());
      break;
    case 'month':
      start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start = new Date();
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      return null;
  }
  return { start: start.toISOString(), end: now.toISOString() };
}

router.get('/', (req, res) => {
  try {
    console.log('[sales.GET] Fetching sales...');
    const result = DB.db.exec(`SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.user_id = 'default' ORDER BY s.id DESC`);
    const sales = result[0] ? result[0].values.map(row => ({
      id: row[0],
      invoice_number: row[1],
      total_amount: row[2],
      discount_amount: row[3],
      tax_amount: row[4],
      final_amount: row[5],
      payment_method: row[6],
      amount_paid: row[7],
      change_amount: row[8],
      customer_id: row[9],
      user_id: row[10],
      customer_name: row[11] || null
    })) : [];
    console.log('[sales.GET] Found', sales.length, 'sales');
    res.json({ success: true, data: sales });
  } catch (error) {
    console.error('[sales.GET] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const saleId = req.params.id;
    console.log('[sales.GET/:id] Fetching sale:', saleId);

    // جلب الفاتورة
    const saleResult = DB.db.exec(
      `SELECT s.*, c.name as customer_name, c.phone as customer_phone
       FROM sales s 
       LEFT JOIN customers c ON s.customer_id = c.id 
       WHERE s.id = ${Number(saleId)} AND s.user_id = 'default'`
    );

    if (!saleResult[0] || saleResult[0].values.length === 0) {
      return res.status(404).json({ success: false, error: 'الفاتورة غير موجودة' });
    }

    const sale = saleResult[0].values[0];
    console.log('[sales.GET/:id] Found sale');

    // جلب تفاصيل المنتجات مع الصور
    const itemsResult = DB.db.exec(
      `SELECT si.*, p.image_url, p.name_ar as product_name_ar, p.name_en as product_name_en
       FROM sale_items si
       LEFT JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = ${Number(saleId)}
       ORDER BY si.id ASC`
    );

    const items = itemsResult[0] ? itemsResult[0].values.map(row => ({
      id: row[0],
      sale_id: row[1],
      product_id: row[2],
      product_name: row[3],
      quantity: row[4],
      unit_price: row[5],
      total_price: row[6],
      image_url: row[8] || '/placeholder.png',
      product_name_ar: row[9] || null,
      product_name_en: row[10] || null
    })) : [];

    console.log('[sales.GET/:id] Items with images:', items.length);

    const responseData = {
      success: true,
      data: {
        id: sale[0],
        invoice_number: sale[1],
        total_amount: sale[2],
        discount_amount: sale[3],
        tax_amount: sale[4],
        final_amount: sale[5],
        payment_method: sale[6],
        amount_paid: sale[7],
        change_amount: sale[8],
        notes: sale[9],
        customer_id: sale[10],
        user_id: sale[11],
        created_at: sale[12] || null,
        customer_name: sale[14] || null,
        customer_phone: sale[15] || null,
        items: items
      }
    };

    res.json(responseData);
  } catch (error) {
    console.error('[sales.GET/:id] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/sales/:saleId/items/:itemId - حذف صنف واحد من الفاتورة
router.delete('/:saleId/items/:itemId', async (req, res) => {
  const saleId = Number(req.params.saleId);
  const itemId = Number(req.params.itemId);
  if (!saleId || !itemId) {
    return res.status(400).json({ success: false, message: 'معرف الفاتورة والعنصر مطلوب' });
  }
  console.log('[sales.DELETE item] called - sale:', saleId, 'item:', itemId);

  let db;
  try {
    db = await getDb();
    db.run("BEGIN");

    // 1) التأكد من وجود العنصر في الفاتورة
    const stmt = db.prepare(`
      SELECT si.id, si.product_id, si.quantity, si.unit_price, si.total_price
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      WHERE si.id = ? AND si.sale_id = ?
    `);
    stmt.bind([itemId, saleId]);
    let itemData = null;
    if (stmt.step()) itemData = stmt.getAsObject();
    stmt.free();

    if (!itemData) {
      db.run("ROLLBACK");
      return res.status(404).json({ success: false, message: 'العنصر غير موجود في هذه الفاتورة' });
    }

    const productId = itemData.product_id;
    const quantity = Number(itemData.quantity);

    // 2) حذف العنصر
    db.run(`DELETE FROM sale_items WHERE id = ? AND sale_id = ?`, [itemId, saleId]);

    // 3) إعادة الكمية للمخزون
    if (productId && quantity > 0) {
      db.run(`UPDATE products SET quantity = quantity + ? WHERE id = ?`, [quantity, productId]);
    }

    // 4) إعادة حساب الفاتورة — قراءة آمنة للأعمدة
    const sumResult = db.exec(`SELECT COALESCE(SUM(total_price), 0) FROM sale_items WHERE sale_id = ${saleId}`);
    const newTotal = sumResult[0] && sumResult[0].values[0]
      ? Number(sumResult[0].values[0][0]) || 0
      : 0;

    const saleRow = db.exec(`SELECT discount_amount, tax_amount FROM sales WHERE id = ${saleId}`);
    if (!saleRow[0] || saleRow[0].values.length === 0) {
      db.run("ROLLBACK");
      return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });
    }

    // saleRow[0].values[0] هو الصف الأول (array). values[0][0] = discount_amount, values[0][1] = tax_amount
    const discount = Number(saleRow[0].values[0][0]) || 0;
    const tax = Number(saleRow[0].values[0][1]) || 0;
    const newFinal = Math.max(0, newTotal - discount + tax);

    db.run(
      `UPDATE sales
         SET total_amount   = ?,
             discount_amount = ?,
             tax_amount     = ?,
             final_amount   = ?,
             updated_at     = datetime('now')
       WHERE id = ?`,
      [newTotal, discount, tax, newFinal, saleId]
    );

    db.run("COMMIT");
    saveDb();

    console.log('[sales.DELETE item] success - sale:', saleId, 'item:', itemId);

    res.json({
      success: true,
      message: 'تم حذف العنصر من الفاتورة',
      data: {
        id: saleId,
        total_amount: newTotal,
        final_amount: newFinal
      }
    });
  } catch (error) {
    if (db) {
      try { db.run("ROLLBACK"); } catch (e) {}
    }
    console.error('[sales.DELETE item] error:', error.message);
    res.status(500).json({ success: false, message: 'فشل حذف العنصر', error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  const saleId = req.params.id;
  console.log('[sales.DELETE] Starting deletion of sale:', saleId);

  try {
    // 1. تحقق من وجود الفاتورة
    const sale = DB.db.exec(`SELECT * FROM sales WHERE id = ${Number(saleId)} AND user_id = 'default'`);
    if (!sale || sale.length === 0 || sale[0].values.length === 0) {
      console.log('[sales.DELETE] Sale not found (already deleted?):', saleId);
      return res.status(200).json({
        success: true,
        message: 'الفاتورة محذوفة بالفعل',
        alreadyDeleted: true
      });
    }

    const saleData = sale[0].values[0];
    const customerId = saleData[9];
    const finalAmount = saleData[5];
    console.log('[sales.DELETE] Found sale, customer_id:', customerId, 'amount:', finalAmount);

    // 2. احصل على المنتجات في الفاتورة
    const itemsResult = DB.db.exec(`SELECT product_id, quantity FROM sale_items WHERE sale_id = ${Number(saleId)}`);
    const items = itemsResult.length > 0 ? itemsResult[0].values : [];
    console.log('[sales.DELETE] Items to restore:', items.length);

    // 3. أعد الكميات للمخزون
    for (const item of items) {
      const productId = item[0];
      const quantity = item[1];
      console.log(`[sales.DELETE] Restoring product ${productId} quantity +${quantity}`);
      DB.db.run(`UPDATE products SET quantity = quantity + ? WHERE id = ?`, [quantity, productId]);
    }

    // 4. حدّث مجموع مشتريات العميل
    if (customerId) {
      console.log(`[sales.DELETE] Updating customer ${customerId} total_purchases -${finalAmount}`);
      DB.db.run(`UPDATE customers SET total_purchases = MAX(0, total_purchases - ?) WHERE id = ?`, [finalAmount, customerId]);
    }

    // 5. احذف sale_items
    console.log('[sales.DELETE] Deleting sale_items');
    DB.db.run(`DELETE FROM sale_items WHERE sale_id = ?`, [Number(saleId)]);

    // 6. احذف الفاتورة
    console.log('[sales.DELETE] Deleting sale');
    DB.db.run(`DELETE FROM sales WHERE id = ?`, [Number(saleId)]);

    // 7. أرسل الرد فوراً
    console.log('[sales.DELETE] Sending success response');
    res.status(200).json({
      success: true,
      message: 'تم حذف الفاتورة بنجاح'
    });

    // 8. احفظ في الخلفية
    setImmediate(() => {
      try {
        saveDb();
        console.log('[sales.DELETE] Database saved');
      } catch (e) {
        console.error('[sales.DELETE] saveDb failed:', e.message);
      }
    });
  } catch (error) {
    console.error('[sales.DELETE] CAUGHT ERROR:', error);
    console.error('[sales.DELETE] Stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'حدث خطأ أثناء الحذف',
        details: error.stack
      });
    }
  }
});

router.post('/', async (req, res) => {
  try {
    console.log('[sales.POST] Request body:', JSON.stringify(req.body).slice(0, 500));
    const {
      items, total_amount, discount_amount, tax_amount, final_amount,
      payment_method, amount_paid, change_amount, notes, customer_id
    } = req.body;

    const invoice_number = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const db = await getDb();
    db.run("BEGIN");
    console.log('[sales.POST] Transaction started');

    const now = new Date().toISOString();
    console.log('[sales.POST] Inserting sale...');
    db.run(
      `INSERT INTO sales (
        invoice_number, total_amount, discount_amount, tax_amount,
        final_amount, payment_method, amount_paid, change_amount,
        notes, customer_id, user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice_number, total_amount || 0, discount_amount || 0, tax_amount || 0,
        final_amount, payment_method || 'cash', amount_paid || 0, change_amount || 0,
        notes, customer_id || null, 'default', now, now
      ]
    );

    const saleId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
    console.log('[sales.POST] Sale inserted, ID:', saleId);
    const insertedItems = [];

    if (items && items.length > 0) {
      console.log('[sales.POST] Inserting', items.length, 'sale items');
      // math: validate stock + fetch sale_price before deducting
      const productCache = {};
      for (const item of items) {
        if (!item.product_id) continue;
        const prodStmt = db.prepare('SELECT sale_price, quantity FROM products WHERE id = ?');
        prodStmt.bind([item.product_id]);
        let prod = null;
        if (prodStmt.step()) prod = prodStmt.getAsObject();
        prodStmt.free();
        if (!prod) {
          db.run("ROLLBACK");
          saveDb();
          return res.status(400).json({ success: false, error: `المنتج رقم ${item.product_id} غير موجود` });
        }
        if (prod.quantity < item.quantity) {
          db.run("ROLLBACK");
          saveDb();
          return res.status(400).json({ success: false, error: `الكمية المطلوبة تتجاوز المتاح للمنتج رقم ${item.product_id}` });
        }
        productCache[item.product_id] = prod;
      }
      for (const item of items) {
        const prod = productCache[item.product_id];
        const unitPrice = prod ? Number(prod.sale_price) : Number(item.unit_price || 0); // math: recalc from DB
        const totalPrice = Math.round(unitPrice * item.quantity * 100) / 100; // math: recalc + round to 2dp
        db.run(
          `INSERT INTO sale_items (
            sale_id, product_id, product_name, quantity, unit_price, total_price
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [saleId, item.product_id, item.product_name, item.quantity, unitPrice, totalPrice]
        );
        insertedItems.push({
          id: db.exec("SELECT last_insert_rowid()")[0].values[0][0],
          sale_id: saleId,
          ...item,
          unit_price: unitPrice,
          total_price: totalPrice
        });

        if (item.product_id) {
          db.run('UPDATE products SET quantity = quantity - ? WHERE id = ?', [item.quantity, item.product_id]);
        }
      }
    }

    db.run("COMMIT");
    console.log('[sales.POST] Transaction committed');

    // math: update customer cumulative purchases
    if (customer_id) {
      const finalAmt = final_amount || 0;
      db.run('UPDATE customers SET total_purchases = COALESCE(total_purchases, 0) + ? WHERE id = ?', [finalAmt, customer_id]);
      saveDb();
    }

    const responseData = {
      id: saleId,
      invoice_number,
      total_amount: total_amount || 0,
      discount_amount: discount_amount || 0,
      tax_amount: tax_amount || 0,
      final_amount: final_amount || 0,
      payment_method: payment_method || 'cash',
      amount_paid: amount_paid || 0,
      change_amount: change_amount || 0,
      notes: notes || null,
      customer_id: customer_id || null,
      user_id: 'default',
      created_at: now,
      updated_at: now,
      items: insertedItems
    };

    console.log('[sales.POST] Sending success response before saveDb');
    res.status(201).json({ success: true, data: responseData, message: 'تمت الإضافة بنجاح' });

    setImmediate(() => {
      try {
        saveDb();
        console.log('[sales.POST] Database saved to disk');
      } catch (e) {
        console.error('[sales.POST] Save failed (data is in memory):', e.message);
      }
    });
  } catch (error) {
    console.error('[sales.POST] Error:', error.message);
    try {
      const db = await getDb();
      db.run("ROLLBACK");
      console.log('[sales.POST] Transaction rolled back');
    } catch (e) {
      console.error('[sales.POST] Rollback also failed:', e.message);
    }
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Failed to create sale' });
    }
  }
});

module.exports = router;
