const db = require('../database/db');

function getPeriodStartDate(period) {
  const now = new Date();
  switch (period) {
    case 'day':
    case 'today':
      now.setHours(0, 0, 0, 0);
      return now.toISOString();
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case 'year':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
}

const monthsAr = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function pad(n) { return n.toString().padStart(2, '0'); }

function buildTrendData(period, sales, products) {
  if (period === 'day') {
    const hourly = [];
    for (let h = 0; h < 24; h++) {
      hourly.push({ label: pad(h) + ':00', sales: 0, profit: 0 });
    }
    sales.forEach(sale => {
      const h = new Date(sale.created_at).getHours();
      let cost = 0;
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
      items.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        cost += (prod ? prod.purchase_price : 0) * item.quantity;
      });
      hourly[h].sales += sale.final_amount;
      hourly[h].profit += (sale.final_amount - cost);
    });
    return hourly;
  }

  if (period === 'year') {
    const monthly = monthsAr.map((m, idx) => ({ label: m, sales: 0, profit: 0 }));
    sales.forEach(sale => {
      const m = new Date(sale.created_at).getMonth();
      let cost = 0;
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
      items.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        cost += (prod ? prod.purchase_price : 0) * item.quantity;
      });
      monthly[m].sales += sale.final_amount;
      monthly[m].profit += (sale.final_amount - cost);
    });
    return monthly;
  }

  const daysCount = period === 'week' ? 7 : 30;
  const daily = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    daily.push({ label: pad(d.getDate()) + '/' + pad(d.getMonth() + 1), sales: 0, profit: 0 });
  }
  sales.forEach(sale => {
    const saleDate = sale.created_at.slice(0, 10);
    const dayObj = daily.find(d => {
      const dd = new Date(Date.now() - daily.indexOf(d) * 24 * 60 * 60 * 1000);
      return dd.toISOString().slice(0, 10) === saleDate;
    });
    if (dayObj) {
      let cost = 0;
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
      items.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        cost += (prod ? prod.purchase_price : 0) * item.quantity;
      });
      dayObj.sales += sale.final_amount;
      dayObj.profit += (sale.final_amount - cost);
    }
  });
  return daily;
}

function buildFinancialTimeline(period, sales, products) {
  if (period === 'day') {
    const hourly = [];
    for (let h = 0; h < 24; h++) {
      hourly.push({ month: pad(h) + ':00', revenues: 0, expenses: 0, profit: 0 });
    }
    sales.forEach(sale => {
      const h = new Date(sale.created_at).getHours();
      let cost = 0;
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
      items.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        cost += (prod ? prod.purchase_price : 0) * item.quantity;
      });
      hourly[h].revenues += sale.final_amount;
      hourly[h].expenses += cost;
      hourly[h].profit += (sale.final_amount - cost);
    });
    return hourly;
  }

  if (period === 'year') {
    const monthly = monthsAr.map((m, idx) => ({ month: m, revenues: 0, expenses: 0, profit: 0 }));
    sales.forEach(sale => {
      const m = new Date(sale.created_at).getMonth();
      let cost = 0;
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
      items.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        cost += (prod ? prod.purchase_price : 0) * item.quantity;
      });
      monthly[m].revenues += sale.final_amount;
      monthly[m].expenses += cost;
      monthly[m].profit += (sale.final_amount - cost);
    });
    return monthly;
  }

  const daysCount = period === 'week' ? 7 : 30;
  const daily = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    daily.push({ month: pad(d.getDate()) + '/' + pad(d.getMonth() + 1), revenues: 0, expenses: 0, profit: 0 });
  }
  sales.forEach(sale => {
    const saleDate = sale.created_at.slice(0, 10);
    const dayObj = daily.find(d => {
      const idx = daily.indexOf(d);
      const dd = new Date(Date.now() - idx * 24 * 60 * 60 * 1000);
      return dd.toISOString().slice(0, 10) === saleDate;
    });
    if (dayObj) {
      let cost = 0;
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
      items.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        cost += (prod ? prod.purchase_price : 0) * item.quantity;
      });
      dayObj.revenues += sale.final_amount;
      dayObj.expenses += cost;
      dayObj.profit += (sale.final_amount - cost);
    }
  });
  return daily;
}

exports.getSummary = (req, res, next) => {
  try {
    const period = req.query.period || 'month';
    const startDate = getPeriodStartDate(period);
    const sales = db.prepare('SELECT * FROM sales WHERE created_at >= ? AND user_id = ?').all(startDate, req.user.id);
    const products = db.prepare('SELECT * FROM products WHERE user_id = ?').all(req.user.id);

    // 1. Total revenue
    const totalRevenue = sales.reduce((sum, s) => sum + s.final_amount, 0);

    // 2. Cost of goods sold (expenses) & net profit
    let totalExpenses = 0;
    sales.forEach(sale => {
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
      items.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        const purchasePrice = prod ? prod.purchase_price : 0;
        totalExpenses += purchasePrice * item.quantity;
      });
    });

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    // 3. Average Invoice value
    const avgInvoice = sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0;

    // 4. Low stock count
    const lowStockCount = products.filter(p => p.quantity <= p.min_quantity).length;

    // 5. Best Category
    const categories = db.prepare('SELECT * FROM categories').all();
    const catSales = {};
    sales.forEach(sale => {
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
      items.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        if (prod && prod.category_id) {
          catSales[prod.category_id] = (catSales[prod.category_id] || 0) + item.total_price;
        }
      });
    });

    let bestCategoryId = null;
    let maxCatSale = 0;
    Object.keys(catSales).forEach(catId => {
      if (catSales[catId] > maxCatSale) {
        maxCatSale = catSales[catId];
        bestCategoryId = catId;
      }
    });

    const bestCat = categories.find(c => c.id == bestCategoryId);
    const bestCategoryName = bestCat ? bestCat.name_ar : 'لا يوجد';

    // 6. Top Selling Product
    const prodSales = {};
    sales.forEach(sale => {
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
      items.forEach(item => {
        prodSales[item.product_name] = (prodSales[item.product_name] || 0) + item.quantity;
      });
    });

    let topProduct = 'لا يوجد';
    let maxProdQty = 0;
    Object.keys(prodSales).forEach(name => {
      if (prodSales[name] > maxProdQty) {
        maxProdQty = prodSales[name];
        topProduct = name;
      }
    });

    return res.json({
      totalRevenue,
      netProfit,
      profitMargin,
      avgInvoice,
      lowStockCount,
      bestCategory: bestCategoryName,
      topProduct,
      topProductQty: maxProdQty,
      invoiceCount: sales.length
    });
  } catch (err) {
    next(err);
  }
};

exports.getCharts = (req, res, next) => {
  try {
    const period = req.query.period || 'month';
    const startDate = getPeriodStartDate(period);
    const sales = db.prepare('SELECT * FROM sales WHERE created_at >= ? AND user_id = ?').all(startDate, req.user.id);
    const products = db.prepare('SELECT * FROM products WHERE user_id = ?').all(req.user.id);
    const categories = db.prepare('SELECT * FROM categories').all();

    const catRevenue = {};
    sales.forEach(sale => {
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
      items.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        const catId = prod ? prod.category_id : null;
        if (catId) {
          catRevenue[catId] = (catRevenue[catId] || 0) + item.total_price;
        }
      });
    });

    const categoryPieData = categories.map(cat => ({
      name: cat.name_ar,
      value: catRevenue[cat.id] || 0,
      color: cat.color || '#00FF7F'
    })).filter(c => c.value > 0);

    const prodSales = {};
    sales.forEach(sale => {
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
      items.forEach(item => {
        prodSales[item.product_name] = (prodSales[item.product_name] || 0) + item.quantity;
      });
    });

    const topProducts = Object.keys(prodSales).map(name => ({
      name,
      sales: prodSales[name]
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

    return res.json({
      salesTrend: buildTrendData(period, sales, products),
      categorySplit: categoryPieData,
      topProducts,
      financialTimeline: buildFinancialTimeline(period, sales, products)
    });
  } catch (err) {
    next(err);
  }
};

exports.exportPDF = (req, res, next) => {
  try {
    const period = req.query.period || 'month';
    const startDate = getPeriodStartDate(period);
    const isEn = req.query.lang === 'en';
    const sales = db.prepare('SELECT * FROM sales WHERE created_at >= ? AND user_id = ?').all(startDate, req.user.id);
    const products = db.prepare('SELECT * FROM products WHERE user_id = ?').all(req.user.id);

    const totalRevenue = sales.reduce((sum, s) => sum + s.final_amount, 0);

    let totalExpenses = 0;
    sales.forEach(sale => {
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
      items.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        totalExpenses += (prod ? prod.purchase_price : 0) * item.quantity;
      });
    });

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
    const avgInvoice = sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0;

    const prodSales = {};
    sales.forEach(sale => {
      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id);
      items.forEach(item => {
        prodSales[item.product_name] = (prodSales[item.product_name] || 0) + item.quantity;
      });
    });

    const topProducts = Object.keys(prodSales)
      .map(name => ({ name, sales: prodSales[name] }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    const periodName = isEn
      ? (period === 'today' ? 'Today' : period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'This Year')
      : (period === 'today' ? 'اليوم' : period === 'week' ? 'الأسبوع' : period === 'month' ? 'الشهر' : 'السنة');

    const dateStr = new Date().toLocaleDateString(isEn ? 'en-US' : 'ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });

    const topProductsHtml = topProducts.map(p => `
      <tr>
        <td style="text-align:${isEn ? 'left' : 'right'}; padding:8px; border-bottom:1px solid #ddd;">${p.name}</td>
        <td style="text-align:center; padding:8px; border-bottom:1px solid #ddd; font-weight:bold;">${p.sales}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html dir="${isEn ? 'ltr' : 'rtl'}" lang="${isEn ? 'en' : 'ar'}">
<head>
<meta charset="UTF-8">
<title>${isEn ? 'Financial Report' : 'التقرير المالي المبسط'}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: ${isEn ? "'Inter', sans-serif" : "'Tajawal', Arial, sans-serif"}; color: #111; line-height: 1.6; font-size: 14px; }
  h1 { text-align: center; font-size: 24px; margin-bottom: 5px; color: #000; }
  .subtitle { text-align: center; font-size: 14px; color: #555; margin-bottom: 30px; }
  .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid #00FF7F; padding-bottom: 5px; display: inline-block; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
  .summary-card { background: #f9f9f9; padding: 15px; border: 1px solid #eee; border-radius: 8px; }
  .summary-card .label { font-size: 13px; color: #666; margin-bottom: 5px; }
  .summary-card .value { font-size: 20px; font-weight: bold; color: #000; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  th { background: #f2f2f2; padding: 10px; text-align: ${isEn ? 'left' : 'right'}; font-size: 13px; border-bottom: 2px solid #ccc; }
  td { padding: 10px; font-size: 13px; border-bottom: 1px solid #eee; }
  .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 15px; }
</style>
</head>
<body>
  <h1>${isEn ? 'Financial & Analytical Report' : 'التقرير المالي والتحليلي'}</h1>
  <div class="subtitle">${isEn ? 'Commercial Performance Summary for:' : 'ملخص الأداء التجاري عن فترة:'} <strong>${periodName}</strong><br>${isEn ? 'Extraction Date:' : 'تاريخ استخراج التقرير:'} ${dateStr}</div>

  <div class="section-title">${isEn ? '1. Numbers & Indicators Summary' : '1. ملخص الأرقام والمؤشرات'}</div>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">${isEn ? 'Total Revenue' : 'إجمالي الإيرادات'}</div>
      <div class="value">${Number(totalRevenue).toLocaleString(isEn ? 'en-US' : 'ar-DZ')} ${isEn ? 'DZD' : 'د.ج'}</div>
    </div>
    <div class="summary-card">
      <div class="label">${isEn ? 'Net Profit' : 'صافي الأرباح'}</div>
      <div class="value">${Number(netProfit).toLocaleString(isEn ? 'en-US' : 'ar-DZ')} ${isEn ? 'DZD' : 'د.ج'}</div>
    </div>
    <div class="summary-card">
      <div class="label">${isEn ? 'Total Invoices' : 'إجمالي عدد الفواتير'}</div>
      <div class="value">${sales.length} ${isEn ? 'Invoices' : 'فاتورة'}</div>
    </div>
    <div class="summary-card">
      <div class="label">${isEn ? 'Average Invoice Value' : 'متوسط قيمة الفاتورة'}</div>
      <div class="value">${Number(avgInvoice).toLocaleString(isEn ? 'en-US' : 'ar-DZ')} ${isEn ? 'DZD' : 'د.ج'}</div>
    </div>
  </div>

  <div class="section-title">${isEn ? '2. Product Movement (Best Sellers)' : '2. حركة المنتجات (الأكثر مبيعاً)'}</div>
  <table>
    <thead>
      <tr>
        <th>${isEn ? 'Product Name' : 'اسم المنتج'}</th>
        <th style="text-align:center;">${isEn ? 'Quantity Sold' : 'الكمية المباعة'}</th>
      </tr>
    </thead>
    <tbody>
      ${topProductsHtml || `<tr><td colspan="2" style="text-align:center;">${isEn ? 'No sales in this period' : 'لا توجد مبيعات في هذه الفترة'}</td></tr>`}
    </tbody>
  </table>

  <div class="section-title">${isEn ? '3. Activity Overview' : '3. نظرة عامة على النشاط'}</div>
  <p style="text-align:justify;">
    ${isEn
      ? `During the current <strong>${periodName}</strong>, a total of <strong>${sales.length}</strong> successful sales were recorded, generating a total revenue of <strong>${Number(totalRevenue).toLocaleString('en-US')} DZD</strong>. The net profit achieved after deducting basic costs was approximately <strong>${Number(netProfit).toLocaleString('en-US')} DZD</strong> (with an approximate profit margin of ${profitMargin}%). The average spending per customer was <strong>${Number(avgInvoice).toLocaleString('en-US')} DZD</strong>.`
      : `خلال <strong>${periodName}</strong> الحالي، تم تسجيل ما مجموعه <strong>${sales.length}</strong> عملية بيع ناجحة، مما ولّد إيرادات إجمالية بلغت <strong>${Number(totalRevenue).toLocaleString('ar-DZ')} د.ج</strong>. وبلغ صافي الأرباح المحققة بعد خصم التكاليف الأساسية حوالي <strong>${Number(netProfit).toLocaleString('ar-DZ')} د.ج</strong> (بمعدل ربح تقريبي ${profitMargin}%). كما أن معدل إنفاق الزبون الواحد بلغ <strong>${Number(avgInvoice).toLocaleString('ar-DZ')} د.ج</strong>.`
    }
  </p>

  <div class="footer">
    ${isEn ? 'This report was automatically generated from Neon POS Fashion System' : 'تم استخراج هذا التقرير آلياً من نظام Neon POS Fashion System'}<br>
    ${isEn ? 'All rights reserved' : 'جميع الحقوق محفوظة'} &copy; ${new Date().getFullYear()}
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    next(err);
  }
};
