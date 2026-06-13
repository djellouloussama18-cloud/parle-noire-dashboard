const express = require('express');
const router = express.Router();
const DB = require('../database/db');
const { getDb, saveDb } = DB;

function pad(n) { return n < 10 ? '0' + n : '' + n; }

router.get('/month', (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month, 10) || (new Date().getMonth() + 1);
    const monthStr = year + '-' + pad(month);

    const result = DB.db.exec(
      "SELECT substr(created_at, 1, 10) as sale_date, COUNT(*) as sales_count, SUM(final_amount) as total_revenue " +
      "FROM sales WHERE created_at LIKE '" + monthStr + "%' AND user_id = 'default' " +
      "GROUP BY sale_date ORDER BY sale_date"
    );

    const data = {};
    if (result[0]) {
      for (const row of result[0].values) {
        data[row[0]] = { sales_count: row[1], total_revenue: row[2] };
      }
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('[calendar.GET/month] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/day', (req, res) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month, 10) || (new Date().getMonth() + 1);
    const day = parseInt(req.query.day, 10) || new Date().getDate();
    const dateStr = year + '-' + pad(month) + '-' + pad(day);

    const salesResult = DB.db.exec(
      "SELECT s.*, c.name as customer_name, c.phone as customer_phone " +
      "FROM sales s LEFT JOIN customers c ON s.customer_id = c.id " +
      "WHERE s.created_at LIKE '" + dateStr + "%' AND s.user_id = 'default' " +
      "ORDER BY s.id DESC"
    );

    const sales = salesResult[0] ? salesResult[0].values.map(row => ({
      id: row[0],
      invoice_number: row[1],
      total_amount: row[2],
      discount_amount: row[3],
      tax_amount: row[4],
      final_amount: row[5],
      payment_method: row[6],
      amount_paid: row[7],
      change_amount: row[8],
      notes: row[9],
      customer_id: row[10],
      user_id: row[11],
      created_at: row[12] || null,
      customer_name: row[14] || null,
      customer_phone: row[15] || null
    })) : [];

    const saleIds = sales.map(s => s.id);
    let itemsMap = {};
    if (saleIds.length > 0) {
      const itemsResult = DB.db.exec(
        "SELECT si.*, p.image_url, p.name_ar as product_name_ar, p.name_en as product_name_en " +
        "FROM sale_items si LEFT JOIN products p ON si.product_id = p.id " +
        "WHERE si.sale_id IN (" + saleIds.join(',') + ")"
      );
      if (itemsResult[0]) {
        for (const row of itemsResult[0].values) {
          const sid = row[1];
          if (!itemsMap[sid]) itemsMap[sid] = [];
          itemsMap[sid].push({
            id: row[0],
            sale_id: sid,
            product_id: row[2],
            product_name: row[3],
            quantity: row[4],
            unit_price: row[5],
            total_price: row[6],
            image_url: row[8] || '/placeholder.png',
            product_name_ar: row[9] || null,
            product_name_en: row[10] || null
          });
        }
      }
    }

    const salesWithItems = sales.map(s => ({
      ...s,
      items: itemsMap[s.id] || []
    }));

    const summary = {
      total_revenue: sales.reduce((sum, s) => sum + Number(s.final_amount || 0), 0),
      sales_count: sales.length,
      avg_invoice: sales.length > 0
        ? Math.round((sales.reduce((sum, s) => sum + Number(s.final_amount || 0), 0) / sales.length) * 100) / 100
        : 0
    };

    res.json({ success: true, data: { sales: salesWithItems, summary } });
  } catch (error) {
    console.error('[calendar.GET/day] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
