const express = require('express');
const { getDb, saveDb } = require('../database/db');

const router = express.Router();

function round2(x) { return Math.round(x * 100) / 100; }

function toDate(s) {
  if (!s) return new Date(0);
  const parts = s.split('T')[0].split('-').map(Number);
  return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
}

function getDailyRate(amount, recurringType) {
  const map = { daily: 1, weekly: 7, biweekly: 14, monthly: 30, quarterly: 90, yearly: 365 };
  const divisor = map[recurringType] || 30;
  return divisor > 0 ? amount / divisor : 0;
}

function getEffectiveStart(expense, periodStart) {
  const startRaw = expense.start_date || expense.date;
  const expStart = toDate(startRaw);
  return expStart > periodStart ? expStart : periodStart;
}

function getProratedAmountForPeriod(expense, startDate, endDate) {
  const periodStart = toDate(startDate);
  const periodEnd = toDate(endDate);
  const expStart = toDate(expense.start_date || expense.date);
  const expEnd = expense.end_date ? toDate(expense.end_date) : null;

  const calcStart = expStart > periodStart ? expStart : periodStart;
  const calcEnd = expEnd && expEnd < periodEnd ? expEnd : periodEnd;

  if (calcStart > calcEnd) return 0;

  if (!expense.is_recurring || !expense.recurring_type) {
    const expenseDate = toDate(expense.date);
    if (expenseDate >= calcStart && expenseDate <= calcEnd) return Number(expense.amount) || 0;
    return 0;
  }

  const diffMs = calcEnd - calcStart;
  const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
  const dailyRate = getDailyRate(Number(expense.amount) || 0, expense.recurring_type);
  return round2(dailyRate * days);
}

function getProratedExpenseTotal(startDate, endDate, db) {
  const allRows = db.exec(
    `SELECT * FROM expenses WHERE user_id = 'default'`
  );
  let total = 0;
  if (allRows.length > 0 && allRows[0].values.length > 0) {
    for (const row of allRows[0].values) {
      const exp = {
        amount: row[2], date: row[5],
        is_recurring: row[7] === 1 || row[7] === '1' || row[7] === true,
        recurring_type: row[8] || null,
        created_at: row[10] || null,
        start_date: row[12] || row[5], end_date: row[13] || null
      };
      total += getProratedAmountForPeriod(exp, startDate, endDate);
    }
  }
  return round2(total);
}

function getProratedSingle(expense, startDate, endDate) {
  return getProratedAmountForPeriod(expense, startDate, endDate);
}

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

router.get('/summary', async (req, res) => {
  try {
    const period = req.query.period;
    const dateRange = getDateRange(period);
    const db = await getDb();

    const todayResult = db.exec(`
      SELECT COALESCE(SUM(final_amount), 0) as today_sales,
             COUNT(*) as today_count
      FROM sales
      WHERE user_id = 'default' AND date(created_at) = date('now')
    `);
    const todaySales = todayResult.length > 0 ? Number(todayResult[0].values[0][0]) : 0;
    const todayCount = todayResult.length > 0 ? Number(todayResult[0].values[0][1]) : 0;

    let totalRevenue, totalSales;
    if (dateRange) {
      const totalResult = db.exec(`
        SELECT COALESCE(SUM(final_amount), 0) as total_revenue,
               COUNT(*) as total_sales
        FROM sales
        WHERE user_id = 'default' AND created_at >= '${dateRange.start}'
      `);
      totalRevenue = totalResult.length > 0 ? Number(totalResult[0].values[0][0]) : 0;
      totalSales = totalResult.length > 0 ? Number(totalResult[0].values[0][1]) : 0;
    } else {
      const totalResult = db.exec(`
        SELECT COALESCE(SUM(final_amount), 0) as total_revenue,
               COUNT(*) as total_sales
        FROM sales
        WHERE user_id = 'default'
      `);
      totalRevenue = totalResult.length > 0 ? Number(totalResult[0].values[0][0]) : 0;
      totalSales = totalResult.length > 0 ? Number(totalResult[0].values[0][1]) : 0;
    }

    const lowStockResult = db.exec(`
      SELECT COUNT(*) as low_stock_count
      FROM products
      WHERE user_id = 'default' AND quantity <= min_quantity
    `);
    const lowStockCount = lowStockResult.length > 0 ? Number(lowStockResult[0].values[0][0]) : 0;

    let topSelling;
    if (dateRange) {
      const topResult = db.exec(`
        SELECT p.id, p.name_ar, p.name_en, p.image_url,
               COALESCE(SUM(si.quantity), 0) as total_sold
        FROM products p
        LEFT JOIN sale_items si ON p.id = si.product_id
        LEFT JOIN sales s ON si.sale_id = s.id
        WHERE p.user_id = 'default' AND (s.id IS NULL OR s.created_at >= '${dateRange.start}')
        GROUP BY p.id
        ORDER BY total_sold DESC
        LIMIT 5
      `);
      topSelling = topResult.length > 0 ? topResult[0].values.map(row => ({
        id: row[0],
        name_ar: row[1],
        name_en: row[2],
        image_url: row[3],
        total_sold: Number(row[4]),
      })) : [];
    } else {
      const topResult = db.exec(`
        SELECT p.id, p.name_ar, p.name_en, p.image_url,
               COALESCE(SUM(si.quantity), 0) as total_sold
        FROM products p
        LEFT JOIN sale_items si ON p.id = si.product_id
        LEFT JOIN sales s ON si.sale_id = s.id
        WHERE p.user_id = 'default'
        GROUP BY p.id
        ORDER BY total_sold DESC
        LIMIT 5
      `);
      topSelling = topResult.length > 0 ? topResult[0].values.map(row => ({
        id: row[0],
        name_ar: row[1],
        name_en: row[2],
        image_url: row[3],
        total_sold: Number(row[4]),
      })) : [];
    }

    const productsResult = db.exec(`
      SELECT purchase_price, sale_price, quantity
      FROM products
      WHERE user_id = 'default'
    `);
    const products = productsResult.length > 0 ? productsResult[0].values.map(row => ({
      purchase_price: Number(row[0] || 0),
      sale_price: Number(row[1] || 0),
      quantity: Number(row[2] || 0),
    })) : [];

    const totalInventoryValue = products.reduce((sum, p) => sum + p.purchase_price * p.quantity, 0);
    const expectedProfit = products.reduce((sum, p) => sum + (p.sale_price - p.purchase_price) * p.quantity, 0);

    const avgInvoice = totalSales > 0 ? totalRevenue / totalSales : 0;

    // math: calculate actual COGS from sold items instead of hardcoded 30%
    let cogs = 0;
    if (dateRange) {
      const cogsResult = db.exec(`
        SELECT COALESCE(SUM(COALESCE(p.purchase_price, 0) * si.quantity), 0)
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.sale_id = s.id
        WHERE s.user_id = 'default' AND s.created_at >= '${dateRange.start}'
      `);
      cogs = cogsResult.length > 0 ? Number(cogsResult[0].values[0][0]) : 0;
    } else {
      const cogsResult = db.exec(`
        SELECT COALESCE(SUM(COALESCE(p.purchase_price, 0) * si.quantity), 0)
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.sale_id = s.id
        WHERE s.user_id = 'default'
      `);
      cogs = cogsResult.length > 0 ? Number(cogsResult[0].values[0][0]) : 0;
    }
    // Subtract operational expenses from net profit (prorated for recurring)
    let totalExpenses = 0;
    if (dateRange) {
      totalExpenses = getProratedExpenseTotal(dateRange.start.slice(0, 10), dateRange.end.slice(0, 10), db);
    } else {
      const expResult = db.exec(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE user_id = 'default'
      `);
      totalExpenses = expResult.length > 0 ? Number(expResult[0].values[0][0]) : 0;
    }

    const grossProfit = totalRevenue - cogs;
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = totalRevenue > 0 ? round2((netProfit / totalRevenue) * 100) : 0;
    const topProduct = (topSelling.length > 0 && topSelling[0]?.total_sold > 0) ? (topSelling[0]?.name_ar || 'لا يوجد') : 'لا يوجد';
    const topProductQty = (topSelling.length > 0 && topSelling[0]?.total_sold > 0) ? topSelling[0].total_sold : 0;

    res.json({
      totalRevenue,
      netProfit,
      profitMargin,
      avgInvoice,
      lowStockCount,
      topProduct,
      topProductQty,
      invoiceCount: totalSales,
      todaySales,
      todayCount,
      totalInventoryValue,
      expectedProfit,
    });
  } catch (err) {
    console.error('Error in GET /api/reports/summary:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/charts', async (req, res) => {
  try {
    const period = req.query.period;
    const dateRange = getDateRange(period);
    const db = await getDb();

    let sales;
    if (dateRange) {
      const stmt = db.prepare(`
        SELECT s.id, s.created_at, s.final_amount,
               si.product_id, si.quantity
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        WHERE s.created_at >= ? AND s.user_id = ?
        ORDER BY s.created_at
      `);
      stmt.bind([dateRange.start, 'default']);
      sales = [];
      while (stmt.step()) sales.push(stmt.getAsObject());
      stmt.free();
    } else {
      const stmt = db.prepare(`
        SELECT s.id, s.created_at, s.final_amount,
               si.product_id, si.quantity
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        WHERE s.user_id = ?
        ORDER BY s.created_at
      `);
      stmt.bind(['default']);
      sales = [];
      while (stmt.step()) sales.push(stmt.getAsObject());
      stmt.free();
    }

    const salesByDate = {};
    sales.forEach(s => {
      if (!salesByDate[s.id]) {
        salesByDate[s.id] = {
          created_at: s.created_at,
          final_amount: s.final_amount,
          items: []
        };
      }
      if (s.product_id) {
        salesByDate[s.id].items.push({ product_id: s.product_id, quantity: s.quantity });
      }
    });

    const salesTrend = Object.values(salesByDate).map(s => ({
      label: new Date(s.created_at).toLocaleDateString('ar-DZ', { month: 'short', day: 'numeric' }),
      sales: Number(s.final_amount || 0),
    }));

    const stmtCat = db.prepare(`
      SELECT c.name_ar, SUM(si.quantity) as total_sold
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE p.user_id = ?
      GROUP BY c.id, c.name_ar
      ORDER BY total_sold DESC
    `);
    stmtCat.bind(['default']);
    const catSales = [];
    while (stmtCat.step()) catSales.push(stmtCat.getAsObject());
    stmtCat.free();

    const colors = ['#00FF7F', '#0EA5E9', '#F59E0B', '#8B5CF6', '#EF4444', '#22C55E'];
    const categorySplit = catSales.slice(0, 6).map((c, i) => ({
      name: c.name_ar,
      value: Number(c.total_sold),
      color: colors[i % colors.length],
    }));

    const topSelling = [];
    if (dateRange) {
      const stmtTop = db.prepare(`
        SELECT p.name_ar, SUM(si.quantity) as total_sold
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.sale_id = s.id
        WHERE p.user_id = ? AND s.created_at >= ?
        GROUP BY p.id, p.name_ar
        HAVING total_sold > 0
        ORDER BY total_sold DESC
        LIMIT 5
      `);
      stmtTop.bind(['default', dateRange.start]);
      while (stmtTop.step()) topSelling.push(stmtTop.getAsObject());
      stmtTop.free();
    } else {
      const stmtTop = db.prepare(`
        SELECT p.name_ar, SUM(si.quantity) as total_sold
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.sale_id = s.id
        WHERE p.user_id = ?
        GROUP BY p.id, p.name_ar
        HAVING total_sold > 0
        ORDER BY total_sold DESC
        LIMIT 5
      `);
      stmtTop.bind(['default']);
      while (stmtTop.step()) topSelling.push(stmtTop.getAsObject());
      stmtTop.free();
    }

    const topProducts = topSelling.map(p => ({
      name: p.name_ar || 'منتج',
      sales: Number(p.total_sold),
    }));

    const stmt4 = db.prepare('SELECT id, purchase_price, min_quantity FROM products WHERE user_id = ?');
    stmt4.bind(['default']);
    const costProducts = [];
    while (stmt4.step()) costProducts.push(stmt4.getAsObject());
    stmt4.free();

    const costMap = {};
    costProducts.forEach(p => { costMap[p.id] = Number(p.purchase_price || 0); });

    // Fetch actual expenses with proration
    const expensesByDate = {};
    const allExpRows = db.exec(
      `SELECT * FROM expenses WHERE user_id = 'default'`
    );
    if (allExpRows.length > 0 && allExpRows[0].values.length > 0) {
      for (const row of allExpRows[0].values) {
        const exp = {
          amount: Number(row[2]), date: row[5],
          is_recurring: row[7] === 1 || row[7] === '1' || row[7] === true,
          recurring_type: row[8] || null,
          created_at: row[10] || null,
          start_date: row[12] || row[5], end_date: row[13] || null
        };
        const s = dateRange ? dateRange.start.slice(0, 10) : '2000-01-01';
        const e = dateRange ? dateRange.end.slice(0, 10) : '2099-12-31';
        if (prorated > 0) {
          if (exp.is_recurring) {
            const pStart = toDate(s);
            const pEnd = toDate(e);
            const effStart = getEffectiveStart(exp, pStart);
            const dailyRate = getDailyRate(Number(exp.amount) || 0, exp.recurring_type);
            let cursor = new Date(effStart.getFullYear(), effStart.getMonth(), 1);
            while (cursor <= pEnd) {
              const year = cursor.getFullYear();
              const month = cursor.getMonth();
              const monthStart = new Date(year, month, 1);
              const monthEnd = new Date(year, month + 1, 0);
              const segStart = effStart > monthStart ? effStart : monthStart;
              const segEnd = pEnd < monthEnd ? pEnd : monthEnd;
              const daysInSeg = Math.round((segEnd - segStart) / (1000 * 60 * 60 * 24)) + 1;
              if (daysInSeg > 0) {
                const dateKey = monthStart.toISOString().slice(0, 10);
                expensesByDate[dateKey] = round2((expensesByDate[dateKey] || 0) + dailyRate * daysInSeg);
              }
              cursor = new Date(year, month + 1, 1);
            }
          } else {
            expensesByDate[exp.date] = round2((expensesByDate[exp.date] || 0) + prorated);
          }
        }
      }
    }

    const financialMap = {};
    Object.values(salesByDate).forEach(s => {
      const dateKey = s.created_at.slice(0, 10);
      if (!financialMap[dateKey]) {
        financialMap[dateKey] = { revenues: 0, cogs: 0, expenses: 0 };
      }
      financialMap[dateKey].revenues += Number(s.final_amount || 0);
      s.items.forEach(item => {
        financialMap[dateKey].cogs += (costMap[item.product_id] || 0) * (item.quantity || 0);
      });
    });

    // Merge operational expenses into financialMap
    Object.entries(expensesByDate).forEach(([date, amount]) => {
      if (!financialMap[date]) {
        financialMap[date] = { revenues: 0, cogs: 0, expenses: 0 };
      }
      financialMap[date].expenses = amount;
    });

    const financialTimeline = Object.entries(financialMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        month: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenues: d.revenues,
        expenses: d.expenses + d.cogs,
        profit: d.revenues - d.expenses - d.cogs,
      }));

    res.json({
      salesTrend,
      categorySplit,
      topProducts,
      financialTimeline,
    });
  } catch (err) {
    console.error('Error in GET /api/reports/charts:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/profit', async (req, res) => {
  try {
    const { range, from, to } = req.query;
    const dateRange = getDateRange(range);
    const db = await getDb();

    let startDate, endDate;
    if (from && to) {
      startDate = from;
      endDate = to;
    } else if (dateRange) {
      startDate = dateRange.start.slice(0, 10);
      endDate = dateRange.end.slice(0, 10);
    }

    const userId = 'default';

    const execQuery = (sql) => {
      const r = db.exec(sql);
      return r.length > 0 ? Number(r[0].values[0][0]) : 0;
    };

    let revenue, cogs, expenses;

    if (startDate) {
      revenue = execQuery(`
        SELECT COALESCE(SUM(final_amount), 0)
        FROM sales
        WHERE user_id = '${userId}' AND date(created_at) >= '${startDate}' AND date(created_at) <= '${endDate}'
      `);
      cogs = execQuery(`
        SELECT COALESCE(SUM(COALESCE(p.purchase_price, 0) * si.quantity), 0)
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.sale_id = s.id
        WHERE s.user_id = '${userId}' AND date(s.created_at) >= '${startDate}' AND date(s.created_at) <= '${endDate}'
      `);
      expenses = getProratedExpenseTotal(startDate, endDate, db);
    } else {
      revenue = execQuery(`
        SELECT COALESCE(SUM(final_amount), 0)
        FROM sales
        WHERE user_id = '${userId}'
      `);
      cogs = execQuery(`
        SELECT COALESCE(SUM(COALESCE(p.purchase_price, 0) * si.quantity), 0)
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.sale_id = s.id
        WHERE s.user_id = '${userId}'
      `);
      expenses = execQuery(`
        SELECT COALESCE(SUM(amount), 0)
        FROM expenses
        WHERE user_id = '${userId}'
      `);
    }

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;

    const safeDiv = (a, b) => b > 0 ? Math.round((a / b) * 100 * 100) / 100 : 0;

    res.json({
      revenue: Math.round(revenue * 100) / 100,
      cogs: Math.round(cogs * 100) / 100,
      gross_profit: Math.round(grossProfit * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      net_profit: Math.round(netProfit * 100) / 100,
      gross_margin_percent: safeDiv(grossProfit, revenue),
      expense_ratio_percent: safeDiv(expenses, revenue),
      net_margin_percent: safeDiv(netProfit, revenue),
    });
  } catch (err) {
    console.error('Error in GET /api/reports/profit:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/analysis', async (req, res) => {
  try {
    const db = await getDb();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayStart = yesterday.toISOString();

    const todayResult = db.exec(`
      SELECT COALESCE(SUM(final_amount), 0) as today_sales,
             COUNT(*) as today_count
      FROM sales
      WHERE user_id = 'default' AND date(created_at) = date('now')
    `);
    const todayRevenue = todayResult.length > 0 ? Number(todayResult[0].values[0][0]) : 0;
    const todayCount = todayResult.length > 0 ? Number(todayResult[0].values[0][1]) : 0;

    const yesterdayResult = db.exec(`
      SELECT COALESCE(SUM(final_amount), 0) as yesterday_sales
      FROM sales
      WHERE user_id = 'default' AND date(created_at) = date('now', '-1 day')
    `);
    const yesterdayRev = yesterdayResult.length > 0 ? Number(yesterdayResult[0].values[0][0]) : 0;
    const vsYesterday = yesterdayRev > 0 ? ((todayRevenue - yesterdayRev) / yesterdayRev * 100).toFixed(1) : null;

    const stmt3 = db.prepare('SELECT purchase_price, sale_price, quantity FROM products WHERE user_id = ?');
    stmt3.bind(['default']);
    const allProds = [];
    while (stmt3.step()) allProds.push(stmt3.getAsObject());
    stmt3.free();

    const profit = allProds.reduce((s, p) =>
      s + (Number(p.sale_price) - Number(p.purchase_price || 0)) * Number(p.quantity), 0
    );

    const stmt4 = db.prepare('SELECT name_ar, name_en, quantity, min_quantity, image_url FROM products WHERE quantity <= min_quantity AND user_id = ?');
    stmt4.bind(['default']);
    const lowStock = [];
    while (stmt4.step()) lowStock.push(stmt4.getAsObject());
    stmt4.free();

    const lowStockFormatted = lowStock.map(p => ({
      name: p.name_ar,
      quantity: p.quantity,
      category: '',
      image_url: p.image_url
    }));

    const stmt5 = db.prepare('SELECT COUNT(*) as count FROM products WHERE user_id = ?');
    stmt5.bind(['default']);
    stmt5.step();
    const prodCount = stmt5.getAsObject().count;
    stmt5.free();

    const stmt6 = db.prepare('SELECT id, name_ar FROM categories WHERE user_id = ?');
    stmt6.bind(['default']);
    const categories = [];
    while (stmt6.step()) categories.push(stmt6.getAsObject());
    stmt6.free();

    const categoriesWithCount = categories.map(c => {
      const stmt = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ? AND user_id = ?');
      stmt.bind([c.id, 'default']);
      stmt.step();
      const countResult = stmt.getAsObject();
      stmt.free();
      return { name_ar: c.name_ar, count: countResult.count };
    });

    const stmt7 = db.prepare(`SELECT si.product_id, si.product_name, si.quantity
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.user_id = ?`);
    stmt7.bind(['default']);
    const saleItems = [];
    while (stmt7.step()) saleItems.push(stmt7.getAsObject());
    stmt7.free();

    let topProduct = null;
    if (saleItems.length > 0) {
      const counts = {};
      saleItems.forEach(item => {
        if (!counts[item.product_id]) {
          counts[item.product_id] = { name: item.product_name, qty: 0 };
        }
        counts[item.product_id].qty += item.quantity;
      });

      Object.entries(counts).forEach(([id, info]) => {
        if (!topProduct || info.qty > topProduct.qty) {
          topProduct = { id: Number(id), name: info.name, qty_sold: info.qty };
        }
      });
    }

    const stockValue = allProds.reduce((s, p) =>
      s + Number(p.purchase_price || 0) * Number(p.quantity), 0
    );

    res.json({
      context: {
        todaySales: {
          count: todayCount,
          revenue: todayRevenue,
          profit,
          vsYesterday: vsYesterday ? Number(vsYesterday) : null
        },
        lowStock: lowStockFormatted,
        productCount: prodCount,
        categories: categoriesWithCount,
        topProduct: topProduct ? { name: topProduct.name } : null,
        stockValue
      }
    });
  } catch (err) {
    console.error('Error in GET /api/reports/analysis:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/expenses-summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const db = await getDb();

    const expenses = db.exec(
      `SELECT * FROM expenses WHERE user_id = 'default' AND (is_recurring = 1 OR (date >= '${startDate || '2000-01-01'}' AND date <= '${endDate || new Date().toISOString().split('T')[0]}'))`
    );

    let totalExpenses = 0;
    if (expenses.length > 0 && expenses[0].values.length > 0) {
      for (const row of expenses[0].values) {
        const exp = {
          amount: Number(row[2] || 0),
          date: row[5] || '',
          is_recurring: row[7] === 1 || row[7] === '1' || row[7] === true,
          recurring_type: row[8] || null
        };
        if (exp.is_recurring && exp.recurring_type) {
          totalExpenses += getProratedSingle(exp, startDate || '2000-01-01', endDate || new Date().toISOString().split('T')[0]);
        } else if (exp.date >= (startDate || '2000-01-01') && exp.date <= (endDate || new Date().toISOString().split('T')[0])) {
          totalExpenses += exp.amount;
        }
      }
    }

    const totalSalesArr = db.exec(
      `SELECT COALESCE(SUM(final_amount), 0) as total FROM sales WHERE user_id = 'default' AND date(created_at) >= '${startDate || '2000-01-01'}' AND date(created_at) <= '${endDate || new Date().toISOString().split('T')[0]}'`
    );
    const totalSales = totalSalesArr.length > 0 ? Number(totalSalesArr[0].values[0][0]) : 0;

    // top category
    const catsArr = db.exec(
      `SELECT category, SUM(amount) as total FROM expenses WHERE user_id = 'default' GROUP BY category ORDER BY total DESC LIMIT 1`
    );
    let topCategory = null;
    if (catsArr.length > 0 && catsArr[0].values.length > 0) {
      topCategory = { category: catsArr[0].values[0][0], total: Number(catsArr[0].values[0][1] || 0) };
    }

    res.json({
      success: true,
      data: {
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalSales: Math.round(totalSales * 100) / 100,
        expenseRatio: totalSales > 0 ? Math.round((totalExpenses / totalSales) * 100 * 100) / 100 : 0,
        topCategory,
        netProfit: Math.round((totalSales - totalExpenses) * 100) / 100,
      }
    });
  } catch (error) {
    console.error('GET /reports/expenses-summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/breakdown', async (req, res) => {
  try {
    const { range, from, to } = req.query;
    const dateRange = getDateRange(range);
    const db = await getDb();

    let startDate, endDate;
    if (from && to) {
      startDate = from;
      endDate = to;
    } else if (dateRange) {
      startDate = dateRange.start.slice(0, 10);
      endDate = dateRange.end.slice(0, 10);
    }

    const userId = 'default';

    const execNum = (sql) => {
      const r = db.exec(sql);
      return r.length > 0 ? Number(r[0].values[0][0]) : 0;
    };

    const execRow = (sql) => {
      const r = db.exec(sql);
      if (r.length > 0 && r[0].values.length > 0) return r[0].values[0];
      return null;
    };

    const dateFilter = startDate
      ? `AND date(s.created_at) >= '${startDate}' AND date(s.created_at) <= '${endDate}'`
      : '';
    const dateFilterNoAlias = startDate
      ? `AND date(created_at) >= '${startDate}' AND date(created_at) <= '${endDate}'`
      : '';
    const expenseDateFilter = startDate
      ? `AND date >= '${startDate}' AND date <= '${endDate}'`
      : '';

    const revenue = execNum(`
      SELECT COALESCE(SUM(final_amount), 0) FROM sales
      WHERE user_id = '${userId}' ${dateFilterNoAlias}
    `);

    const invoiceCount = execNum(`
      SELECT COUNT(*) FROM sales
      WHERE user_id = '${userId}' ${dateFilterNoAlias}
    `);

    const cogs = execNum(`
      SELECT COALESCE(SUM(si.quantity * COALESCE(p.purchase_price, 0)), 0)
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      WHERE s.user_id = '${userId}' ${dateFilter}
    `);

    const expenses = startDate
      ? getProratedExpenseTotal(startDate, endDate, db)
      : execNum(`
        SELECT COALESCE(SUM(amount), 0) FROM expenses
        WHERE user_id = '${userId}'
      `);

    const workingDays = execNum(`
      SELECT COUNT(DISTINCT DATE(created_at)) FROM sales
      WHERE user_id = '${userId}' ${dateFilterNoAlias}
    `);

    let bestDay = { date: '', value: 0 };
    if (startDate) {
      const bestRow = execRow(`
        SELECT DATE(created_at) AS d, SUM(final_amount) AS v
        FROM sales
        WHERE user_id = '${userId}' ${dateFilterNoAlias}
        GROUP BY d ORDER BY v DESC LIMIT 1
      `);
      if (bestRow) {
        bestDay = { date: bestRow[0] || '', value: Number(bestRow[1] || 0) };
      }
    }

    let topSelling = { name_ar: 'لا يوجد', units_sold: 0 };
    if (startDate) {
      const topRow = execRow(`
        SELECT p.name_ar, SUM(si.quantity) AS qty
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        JOIN products p ON p.id = si.product_id
        WHERE s.user_id = '${userId}' ${dateFilter}
        GROUP BY si.product_id ORDER BY qty DESC LIMIT 1
      `);
      if (topRow) {
        topSelling = { name_ar: topRow[0] || 'لا يوجد', units_sold: Number(topRow[1] || 0) };
      }
    }

    const inventoryValue = execNum(`
      SELECT COALESCE(SUM(quantity * purchase_price), 0)
      FROM products WHERE user_id = '${userId}'
    `);

    const expectedInventoryProfit = execNum(`
      SELECT COALESCE(SUM(quantity * (sale_price - purchase_price)), 0)
      FROM products WHERE user_id = '${userId}'
    `);

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;
    const safePct = (num, den) => den > 0 ? Math.round((num / den) * 100 * 100) / 100 : 0;
    const dailyAverage = workingDays > 0 ? revenue / workingDays : 0;

    res.json({
      range: range || 'custom',
      revenue: Math.round(revenue * 100) / 100,
      invoice_count: invoiceCount,
      cogs: Math.round(cogs * 100) / 100,
      gross_profit: Math.round(grossProfit * 100) / 100,
      gross_margin_percent: safePct(grossProfit, revenue),
      expenses: Math.round(expenses * 100) / 100,
      net_profit: Math.round(netProfit * 100) / 100,
      net_margin_percent: safePct(netProfit, revenue),
      best_day: bestDay,
      working_days: workingDays,
      daily_average: Math.round(dailyAverage * 100) / 100,
      top_selling: topSelling,
      inventory_value: Math.round(inventoryValue * 100) / 100,
      expected_inventory_profit: Math.round(expectedInventoryProfit * 100) / 100,
    });
  } catch (err) {
    console.error('Error in GET /api/reports/breakdown:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
