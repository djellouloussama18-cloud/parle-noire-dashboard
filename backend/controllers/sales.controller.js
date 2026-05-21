const db = require('../database/db');

exports.getSales = (req, res, next) => {
  try {
    const salesList = db.prepare('SELECT * FROM sales WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
    
    // Attach items to each sale
    const fullSales = salesList.map(sale => {
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
      return {
        ...sale,
        items
      };
    });

    return res.json(fullSales);
  } catch (err) {
    next(err);
  }
};

exports.createSale = (req, res, next) => {
  try {
    const {
      items, // array of { product_id, quantity, unit_price }
      discount_amount,
      tax_amount,
      payment_method,
      amount_paid,
      notes
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'سلة المبيعات فارغة' });
    }

    // Wrap the checkout in a TRANSACTION
    const transaction = db.transaction(() => {
      let total_amount = 0;

      // 1. Verify products & quantities first
      const validatedItems = items.map(item => {
        const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
        if (!prod) {
          throw new Error(`المنتج ذو الرمز ${item.product_id} غير موجود في المخزن`);
        }
        if (prod.quantity < item.quantity) {
          throw new Error(`الكمية غير كافية للمنتج: ${prod.name_ar}. المتوفر: ${prod.quantity}`);
        }
        
        const item_total = prod.sale_price * item.quantity;
        total_amount += item_total;

        return {
          product_id: prod.id,
          product_name: prod.name_ar,
          quantity: item.quantity,
          unit_price: prod.sale_price,
          total_price: item_total
        };
      });

      const discount = parseFloat(discount_amount || 0);
      const tax = parseFloat(tax_amount || 0);
      const final_amount = total_amount - discount + tax;
      const paid = parseFloat(amount_paid || final_amount);
      const change_amount = Math.max(0, paid - final_amount);

      // Generate invoice number
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const countToday = db.prepare('SELECT * FROM sales').all().length + 1;
      const invoice_number = `INV-${dateStr}-${String(countToday).padStart(4, '0')}`;

      // 2. Insert into sales
      const saleInfo = db.prepare(`
        INSERT INTO sales (
          invoice_number, total_amount, discount_amount, tax_amount,
          final_amount, payment_method, amount_paid, change_amount, notes, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invoice_number,
        total_amount,
        discount,
        tax,
        final_amount,
        payment_method || 'cash',
        paid,
        change_amount,
        notes || '',
        req.user.id
      );

      const saleId = saleInfo.lastInsertRowid;

      // 3. Insert items and decrement stock
      validatedItems.forEach(item => {
        db.prepare(`
          INSERT INTO sale_items (
            sale_id, product_id, product_name, quantity, unit_price, total_price
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          saleId,
          item.product_id,
          item.product_name,
          item.quantity,
          item.unit_price,
          item.total_price
        );

        // Update product quantity
        const prod = db.prepare('SELECT quantity FROM products WHERE id = ?').get(item.product_id);
        const newQty = prod.quantity - item.quantity;
        db.prepare('UPDATE products SET quantity = ? WHERE id = ?').run(newQty, item.product_id);
      });

      return {
        id: saleId,
        invoice_number,
        total_amount,
        discount_amount: discount,
        tax_amount: tax,
        final_amount,
        payment_method,
        amount_paid: paid,
        change_amount,
        notes,
        items: validatedItems,
        created_at: new Date().toISOString()
      };
    });

    const result = transaction();
    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ error: 'TRANSACTION_FAILED', message: err.message });
  }
};
