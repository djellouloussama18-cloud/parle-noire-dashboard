const db = require('../database/db');
const cron = require('node-cron');

function generateInventoryNotes() {
  const products = db.prepare('SELECT * FROM products').all();
  const categories = db.prepare('SELECT * FROM categories').all();
  let notesCreated = 0;

  const outOfStock = products.filter(p => p.quantity <= 0);
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= p.min_quantity);

  outOfStock.forEach(product => {
    const catName = categories.find(c => c.id === product.category_id)?.name_ar || '';
    const existing = db.prepare('SELECT * FROM notes WHERE type = ? AND title = ? AND read = ?')
      .all('system', `المنتج "${product.name_ar}" نفد من المخزون`, 0);

    if (existing.length === 0) {
      db.prepare(`
        INSERT INTO notes (type, title, content, priority, product_id, read, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'system',
        `المنتج "${product.name_ar}" نفد من المخزون`,
        `المنتج ${product.name_ar} (${product.sku}) في قسم "${catName}" نفد تماماً. الكمية الحالية: 0. يُرجى إعادة الطلب فوراً.`,
        'high',
        product.id,
        0,
        null
      );
      notesCreated++;
    }
  });

  lowStock.forEach(product => {
    const existing = db.prepare('SELECT * FROM notes WHERE type = ? AND title = ? AND read = ?')
      .all('system', `المنتج "${product.name_ar}" كمية منخفضة`, 0);

    if (existing.length === 0) {
      db.prepare(`
        INSERT INTO notes (type, title, content, priority, product_id, read, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'system',
        `المنتج "${product.name_ar}" كمية منخفضة`,
        `المنتج ${product.name_ar} (${product.sku}) تبقى منه ${product.quantity} قطعة فقط (الحد الأدنى: ${product.min_quantity}).`,
        'medium',
        product.id,
        0,
        null
      );
      notesCreated++;
    }
  });

  return notesCreated;
}

function generateSalesInsightsNotes() {
  const sales = db.prepare('SELECT * FROM sales').all();
  const products = db.prepare('SELECT * FROM products').all();
  let notesCreated = 0;

  if (sales.length === 0) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter(s => s.created_at && s.created_at.slice(0, 10) === today);
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.final_amount, 0);

  const existingToday = db.prepare('SELECT * FROM notes WHERE type = ? AND title = ?')
    .all('system', `ملخص مبيعات اليوم`);

  if (existingToday.length === 0 && todaySales.length > 0) {
    const totalItems = todaySales.reduce((sum, s) => {
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(s.id);
      return sum + items.reduce((s2, i) => s2 + i.quantity, 0);
    }, 0);

    const avgInvoice = Math.round(todayRevenue / todaySales.length);

    let topProduct = 'لا يوجد';
    let topQty = 0;
    const prodCount = {};
    todaySales.forEach(sale => {
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
      items.forEach(item => {
        prodCount[item.product_name] = (prodCount[item.product_name] || 0) + item.quantity;
      });
    });
    Object.keys(prodCount).forEach(name => {
      if (prodCount[name] > topQty) {
        topQty = prodCount[name];
        topProduct = name;
      }
    });

    db.prepare(`
      INSERT INTO notes (type, title, content, priority, read, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'system',
      'ملخص مبيعات اليوم',
      `إجمالي المبيعات اليوم: ${todaySales.length} فاتورة بقيمة ${todayRevenue.toLocaleString()} د.ج. متوسط الفاتورة: ${avgInvoice.toLocaleString()} د.ج. تم بيع ${totalItems} قطعة. المنتج الأكثر مبيعاً: ${topProduct} (${topQty} قطعة).`,
      'low',
      0,
      null
    );
    notesCreated++;
  }

  return notesCreated;
}

function generatePricingSuggestions() {
  const products = db.prepare('SELECT * FROM products').all();
  const sales = db.prepare('SELECT * FROM sales').all();
  let notesCreated = 0;

  if (sales.length === 0) return 0;

  const prodSales = {};
  sales.forEach(sale => {
    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
    items.forEach(item => {
      prodSales[item.product_id] = (prodSales[item.product_id] || 0) + item.quantity;
    });
  });

  const zeroSalesProducts = products.filter(p => !prodSales[p.id] && p.quantity > 5);

  zeroSalesProducts.slice(0, 5).forEach(product => {
    const existing = db.prepare('SELECT * FROM notes WHERE type = ? AND title = ? AND read = ?')
      .all('system', `المنتج "${product.name_ar}" مبيعاته منخفضة جداً`, 0);

    if (existing.length === 0) {
      db.prepare(`
        INSERT INTO notes (type, title, content, priority, product_id, read, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'system',
        `المنتج "${product.name_ar}" مبيعاته منخفضة جداً`,
        `المنتج ${product.name_ar} (${product.sku}) لديه ${product.quantity} قطعة في المخزون ولم يُبع مؤخراً. يُنصح بتخفيض السعر أو عرض ترويجي. سعر الشراء: ${product.purchase_price.toLocaleString()} د.ج، سعر البيع: ${product.sale_price.toLocaleString()} د.ج.`,
        'medium',
        product.id,
        0,
        null
      );
      notesCreated++;
    }
  });

  return notesCreated;
}

function generateAllSystemNotes() {
  let total = 0;
  total += generateInventoryNotes();
  total += generateSalesInsightsNotes();
  total += generatePricingSuggestions();

  if (total > 0) {
    console.log(`📝 Generated ${total} system notes`);
  }
  return total;
}

cron.schedule('0 8 * * *', () => {
  console.log('⏰ Running daily system note generation...');
  generateAllSystemNotes();
});

cron.schedule('0 0 * * *', () => {
  console.log('⏰ Running midnight inventory check notes...');
  generateInventoryNotes();
});

module.exports = {
  generateAllSystemNotes,
  generateInventoryNotes,
  generateSalesInsightsNotes,
  generatePricingSuggestions
};
