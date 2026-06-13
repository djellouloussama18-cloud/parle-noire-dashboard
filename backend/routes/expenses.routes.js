const express = require('express');
const router = express.Router();
const DB = require('../database/db');
const { getDb, saveDb } = DB;

const validCategories = ['rent', 'salaries', 'utilities', 'inventory', 'marketing', 'maintenance', 'transport', 'taxes', 'other'];
const validPaymentMethods = ['cash', 'card', 'transfer'];
const validRecurringTypes = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];

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

function getExpenseStart(expense) {
  return toDate(expense.start_date || expense.date);
}

function getProratedAmountForPeriod(expense, startDate, endDate) {
  const periodStart = toDate(startDate);
  const periodEnd = toDate(endDate);
  const expStart = getExpenseStart(expense);
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

function normalizePercentages(values) {
  if (values.length === 0) return [];
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum === 0) return values.map(() => 0);
  const rounded = values.map(v => round2((v / sum) * 100));
  const total = rounded.reduce((a, b) => a + b, 0);
  const diff = round2(100 - total);
  if (Math.abs(diff) >= 0.01) {
    const maxIdx = rounded.indexOf(Math.max(...rounded));
    rounded[maxIdx] = round2(rounded[maxIdx] + diff);
  }
  return rounded;
}

function getProratedExpensesInPeriod(startDate, endDate, db) {
  const userId = 'default';
  const rows = db.db.exec(
    `SELECT * FROM expenses WHERE user_id = '${userId}'`
  );
  const items = [];
  let totalExpenses = 0;
  const byCategory = {};
  const byPaymentMethod = {};
  let recurringTotal = 0;
  let oneTimeTotal = 0;

  const periodStart = toDate(startDate);
  const periodEnd = toDate(endDate);

  if (rows.length > 0 && rows[0].values.length > 0) {
    for (const row of rows[0].values) {
      const amount = Number(row[2]) || 0;
      const date = row[5];
      const isRecurring = row[7] === 1 || row[7] === '1' || row[7] === true;
      const recurringType = row[8] || null;
      const startDateRaw = row[12] || row[10] || date;
      const endDateRaw = row[13] || null;

      const expStart = toDate(startDateRaw);
      const expEnd = endDateRaw ? toDate(endDateRaw) : null;

      const calcStart = expStart > periodStart ? expStart : periodStart;
      const calcEnd = expEnd && expEnd < periodEnd ? expEnd : periodEnd;

      if (calcStart > calcEnd) continue;

      const diffMs = calcEnd - calcStart;
      const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

      let prorated;
      if (!isRecurring || !recurringType) {
        const expenseDate = toDate(date);
        if (expenseDate >= calcStart && expenseDate <= calcEnd) {
          prorated = amount;
        } else {
          continue;
        }
      } else {
        const map = { daily: 1, weekly: 7, biweekly: 14, monthly: 30, quarterly: 90, yearly: 365 };
        const divisor = map[recurringType] || 30;
        const dailyRate = divisor > 0 ? amount / divisor : 0;
        prorated = round2(dailyRate * days);
      }

      if (prorated <= 0) continue;
      totalExpenses += prorated;
      const category = row[3];
      const paymentMethod = row[4];
      byCategory[category] = round2((byCategory[category] || 0) + prorated);
      byPaymentMethod[paymentMethod] = round2((byPaymentMethod[paymentMethod] || 0) + prorated);
      if (isRecurring) recurringTotal += prorated;
      else oneTimeTotal += prorated;
      items.push({
        id: row[0], title: row[1], amount, category,
        payment_method: paymentMethod, date, notes: row[6] || '',
        is_recurring: isRecurring, recurring_type: recurringType,
        user_id: row[9], created_at: row[10] || null, updated_at: row[11] || null,
        start_date: row[12] || date, end_date: endDateRaw,
        prorated_amount: prorated
      });
    }
  }

  const allCategories = {};
  validCategories.forEach(c => { allCategories[c] = 0; });
  Object.entries(byCategory).forEach(([k, v]) => { allCategories[k] = round2(v); });

  const allPayments = {};
  validPaymentMethods.forEach(m => { allPayments[m] = 0; });
  Object.entries(byPaymentMethod).forEach(([k, v]) => { allPayments[k] = round2(v); });

  return {
    totalExpenses: round2(totalExpenses),
    byCategory: allCategories,
    byPaymentMethod: allPayments,
    recurringTotal: round2(recurringTotal),
    oneTimeTotal: round2(oneTimeTotal),
    rawItems: items
  };
}

function validateExpense(body) {
  const errors = [];
  if (!body.title || !body.title.trim()) errors.push('Title is required');
  if (!body.amount || isNaN(body.amount) || Number(body.amount) <= 0) errors.push('Amount must be a positive number');
  if (!body.category || !validCategories.includes(body.category)) errors.push('Invalid category');
  if (body.payment_method && !validPaymentMethods.includes(body.payment_method)) errors.push('Invalid payment method');
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) errors.push('Date must be YYYY-MM-DD');
  return errors;
}

router.get('/', (req, res) => {
  try {
    const userId = 'default';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const startDate = req.query.startDate || req.query.date_from || null;
    const endDate = req.query.endDate || req.query.date_to || null;

    const conditions = ["user_id = '" + userId + "'"];

    if (startDate && endDate) {
      conditions.push("(is_recurring = 1 OR (date >= '" + startDate + "' AND date <= '" + endDate + "'))");
    } else {
      if (startDate) { conditions.push("date >= '" + startDate + "'"); }
      if (endDate) { conditions.push("date <= '" + endDate + "'"); }
    }
    if (req.query.category) { conditions.push("category = '" + req.query.category + "'"); }
    if (req.query.payment_method) { conditions.push("payment_method = '" + req.query.payment_method + "'"); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = DB.db.exec('SELECT COUNT(*) as total FROM expenses ' + where);
    const total = countResult[0] ? countResult[0].values[0][0] : 0;
    const pages = Math.ceil(total / limit);

    const dataResult = DB.db.exec(
      'SELECT * FROM expenses ' + where + " ORDER BY date DESC, created_at DESC LIMIT " + limit + " OFFSET " + offset
    );

    const expenses = dataResult[0] ? dataResult[0].values.map(row => ({
      id: row[0],
      title: row[1],
      amount: row[2],
      category: row[3],
      payment_method: row[4],
      date: row[5],
      notes: row[6] || '',
      is_recurring: row[7] === 1 || row[7] === '1' || row[7] === true,
      recurring_type: row[8] || null,
      user_id: row[9],
      created_at: row[10] || null,
      updated_at: row[11] || null,
      start_date: row[12] || row[5],
      end_date: row[13] || null
    })) : [];

    res.json({ success: true, data: { expenses, pagination: { total, page, limit, pages } } });
  } catch (error) {
    console.error('[expenses.GET] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});



router.get('/summary', (req, res) => {
  try {
    const userId = 'default';
    const dateFrom = req.query.date_from || req.query.startDate || null;
    const dateTo = req.query.date_to || req.query.endDate || null;

    if (dateFrom && dateTo) {
      const result = getProratedExpensesInPeriod(dateFrom, dateTo, DB);
      const totalExp = round2(result.totalExpenses);

      const endNext = (() => {
        const d = new Date(dateTo + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      })();

      const revenueResult = DB.db.exec(
        "SELECT COALESCE(SUM(final_amount), 0) FROM sales WHERE user_id = '" + userId + "' AND created_at >= '" + dateFrom + "' AND created_at < '" + endNext + "'"
      );
      const totalRevenue = round2(revenueResult[0] ? revenueResult[0].values[0][0] || 0 : 0);

      const cogsResult = DB.db.exec(
        "SELECT COALESCE(SUM(COALESCE(p.purchase_price, 0) * si.quantity), 0) FROM sale_items si LEFT JOIN products p ON si.product_id = p.id JOIN sales s ON si.sale_id = s.id WHERE s.user_id = '" + userId + "' AND s.created_at >= '" + dateFrom + "' AND s.created_at < '" + endNext + "'"
      );
      const cogs = round2(cogsResult[0] ? cogsResult[0].values[0][0] || 0 : 0);

      const grossProfit = round2(totalRevenue - cogs);
      const netProfitVal = round2(grossProfit - totalExp);
      const profitMargin = totalRevenue > 0 ? round2((netProfitVal / totalRevenue) * 100) : 0;

      const activeCats = validCategories.filter(c => (result.byCategory[c] || 0) > 0);
      const catTotals = activeCats.map(c => result.byCategory[c]);
      const catPcts = normalizePercentages(catTotals);
      const byCategoryList = activeCats.map((c, i) => ({ category: c, total: result.byCategory[c], percentage: catPcts[i] }));

      const activeMethods = validPaymentMethods.filter(m => (result.byPaymentMethod[m] || 0) > 0);
      const methodTotals = activeMethods.map(m => result.byPaymentMethod[m]);
      const methodPcts = normalizePercentages(methodTotals);
      const byPaymentMethodList = activeMethods.map((m, i) => ({ method: m, total: result.byPaymentMethod[m], percentage: methodPcts[i] }));

      return res.json({
        success: true,
        data: {
          totalExpenses: totalExp,
          byCategory: result.byCategory,
          byPaymentMethod: result.byPaymentMethod,
          byCategoryList,
          byPaymentMethodList,
          recurringTotal: round2(result.recurringTotal),
          oneTimeTotal: round2(result.oneTimeTotal),
          totalRevenue,
          cogs,
          grossProfit,
          netProfit: netProfitVal,
          profitMargin
        }
      });
    }

    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month, 10) || (new Date().getMonth() + 1);
    const monthStart = year + '-' + String(month).padStart(2, '0') + '-01';
    const monthEndObj = new Date(year, month, 0);
    const monthEnd = year + '-' + String(month).padStart(2, '0') + '-' + String(monthEndObj.getDate()).padStart(2, '0');

    const thisMonth = getProratedExpensesInPeriod(monthStart, monthEnd, DB);

    const prevDate = new Date(year, month - 2, 1);
    const prevMonthStart = prevDate.getFullYear() + '-' + String(prevDate.getMonth() + 1).padStart(2, '0') + '-01';
    const prevMonthEndObj = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0);
    const prevMonthEnd = prevMonthEndObj.getFullYear() + '-' + String(prevMonthEndObj.getMonth() + 1).padStart(2, '0') + '-' + String(prevMonthEndObj.getDate()).padStart(2, '0');
    const lastMonth = getProratedExpensesInPeriod(prevMonthStart, prevMonthEnd, DB);

    const growthRate = lastMonth.totalExpenses > 0 ? round2(((thisMonth.totalExpenses - lastMonth.totalExpenses) / lastMonth.totalExpenses) * 100) : 0;

    const monthStr = year + '-' + String(month).padStart(2, '0');
    const revenueResult = DB.db.exec(
      "SELECT COALESCE(SUM(final_amount), 0) FROM sales WHERE user_id = '" + userId + "' AND created_at LIKE '" + monthStr + "%'"
    );
    const totalRevenue = round2(revenueResult[0] ? revenueResult[0].values[0][0] || 0 : 0);

    const cogsResult = DB.db.exec(
      "SELECT COALESCE(SUM(COALESCE(p.purchase_price, 0) * si.quantity), 0) FROM sale_items si LEFT JOIN products p ON si.product_id = p.id JOIN sales s ON si.sale_id = s.id WHERE s.user_id = '" + userId + "' AND s.created_at LIKE '" + monthStr + "%'"
    );
    const cogs = round2(cogsResult[0] ? cogsResult[0].values[0][0] || 0 : 0);

    const grossProfit = round2(totalRevenue - cogs);
    const netProfit = round2(grossProfit - thisMonth.totalExpenses);
    const profitMargin = totalRevenue > 0 ? round2((netProfit / totalRevenue) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalExpenses: thisMonth.totalExpenses,
        byCategory: thisMonth.byCategory,
        byPaymentMethod: thisMonth.byPaymentMethod,
        total_this_month: thisMonth.totalExpenses,
        total_last_month: lastMonth.totalExpenses,
        growth_rate: growthRate,
        by_category: thisMonth.byCategory,
        by_category_list: (() => {
          const catEntries = Object.entries(thisMonth.byCategory).filter(([k, v]) => v > 0);
          const catTotals = catEntries.map(([k, v]) => v);
          const catPcts = normalizePercentages(catTotals);
          return catEntries.map(([category], i) => ({ category, total: round2(catTotals[i]), percentage: catPcts[i] }));
        })(),
        cogs,
        gross_profit: grossProfit,
        net_profit: { total_revenue: totalRevenue, total_expenses: thisMonth.totalExpenses, net: netProfit, profit_margin: profitMargin },
        real_net_profit: netProfit,
        recurring_total: thisMonth.recurringTotal,
        one_time_total: thisMonth.oneTimeTotal
      }
    });
  } catch (error) {
    console.error('[expenses.GET/summary] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/categories', (req, res) => {
  try {
    const userId = 'default';
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStart = year + '-' + String(month).padStart(2, '0') + '-01';
    const monthEndObj = new Date(year, month, 0);
    const monthEnd = year + '-' + String(month).padStart(2, '0') + '-' + String(monthEndObj.getDate()).padStart(2, '0');

    const categories = [
      { key: 'rent', name_ar: 'إيجار', name_en: 'Rent', icon: 'Home', color: '#6366f1' },
      { key: 'salaries', name_ar: 'رواتب', name_en: 'Salaries', icon: 'Users', color: '#f59e0b' },
      { key: 'utilities', name_ar: 'فواتير ومرافق', name_en: 'Utilities', icon: 'Zap', color: '#10b981' },
      { key: 'inventory', name_ar: 'شراء بضاعة', name_en: 'Inventory Purchase', icon: 'Package', color: '#3b82f6' },
      { key: 'marketing', name_ar: 'تسويق وإعلان', name_en: 'Marketing', icon: 'Megaphone', color: '#ec4899' },
      { key: 'maintenance', name_ar: 'صيانة', name_en: 'Maintenance', icon: 'Wrench', color: '#f97316' },
      { key: 'transport', name_ar: 'نقل وشحن', name_en: 'Transport', icon: 'Truck', color: '#8b5cf6' },
      { key: 'taxes', name_ar: 'ضرائب ورسوم', name_en: 'Taxes & Fees', icon: 'Receipt', color: '#ef4444' },
      { key: 'other', name_ar: 'أخرى', name_en: 'Other', icon: 'MoreHorizontal', color: '#6b7280' }
    ];

    const prorated = getProratedExpensesInPeriod(monthStart, monthEnd, DB);
    const enriched = categories.map(c => ({
      ...c,
      total_this_month: round2(prorated.byCategory[c.key] || 0)
    }));

    res.json({ success: true, data: { categories: enriched } });
  } catch (error) {
    console.error('[expenses.GET/categories] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    const errors = validateExpense(req.body);
    if (errors.length > 0) return res.status(400).json({ success: false, error: errors.join(', ') });

    const { title, amount, category, payment_method = 'cash', date, notes = '', is_recurring = false, recurring_type = null, start_date, end_date } = req.body;
    const userId = 'default';
    const now = new Date().toISOString();
    const sDate = start_date || date;
    const eDate = end_date || null;

    DB.db.run(
      "INSERT INTO expenses (title, amount, category, payment_method, date, notes, is_recurring, recurring_type, user_id, created_at, updated_at, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [title.trim(), round2(Number(amount)), category, payment_method, date, notes.trim(), is_recurring ? 1 : 0, recurring_type, userId, now, now, sDate, eDate]
    );

    const id = DB.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
    saveDb();
    console.log('[expenses.POST] Created expense:', id);

    const created = DB.db.exec("SELECT * FROM expenses WHERE id = " + id);
    const row = created[0].values[0];
    res.status(201).json({
      success: true, data: {
        id: row[0], title: row[1], amount: row[2], category: row[3],
        payment_method: row[4], date: row[5], notes: row[6] || '',
        is_recurring: row[7] === 1 || row[7] === '1',
        recurring_type: row[8] || null,
        user_id: row[9], created_at: row[10], updated_at: row[11],
        start_date: row[12] || row[5], end_date: row[13] || null
      }
    });
  } catch (error) {
    console.error('[expenses.POST] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const id = req.params.id;
    const userId = 'default';

    const existing = DB.db.exec("SELECT * FROM expenses WHERE id = " + Number(id) + " AND user_id = '" + userId + "'");
    if (!existing[0] || existing[0].values.length === 0) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    const errors = validateExpense(req.body);
    if (errors.length > 0) return res.status(400).json({ success: false, error: errors.join(', ') });

    const { title, amount, category, payment_method, date, notes, is_recurring, recurring_type, start_date, end_date } = req.body;
    const now = new Date().toISOString();
    const sDate = start_date || date;

    DB.db.run(
      "UPDATE expenses SET title = ?, amount = ?, category = ?, payment_method = ?, date = ?, notes = ?, is_recurring = ?, recurring_type = ?, updated_at = ?, start_date = ?, end_date = ? WHERE id = ? AND user_id = ?",
      [title.trim(), round2(Number(amount)), category, payment_method || 'cash', date, (notes || '').trim(), is_recurring ? 1 : 0, recurring_type || null, now, sDate, end_date || null, Number(id), userId]
    );
    saveDb();

    const updated = DB.db.exec("SELECT * FROM expenses WHERE id = " + Number(id));
    const row = updated[0].values[0];
    res.json({
      success: true, data: {
        id: row[0], title: row[1], amount: row[2], category: row[3],
        payment_method: row[4], date: row[5], notes: row[6] || '',
        is_recurring: row[7] === 1 || row[7] === '1',
        recurring_type: row[8] || null,
        user_id: row[9], created_at: row[10], updated_at: row[11],
        start_date: row[12] || row[5], end_date: row[13] || null
      }
    });
  } catch (error) {
    console.error('[expenses.PUT] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const id = req.params.id;
    const userId = 'default';

    const existing = DB.db.exec("SELECT * FROM expenses WHERE id = " + Number(id) + " AND user_id = '" + userId + "'");
    if (!existing[0] || existing[0].values.length === 0) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    DB.db.run("DELETE FROM expenses WHERE id = ? AND user_id = ?", [Number(id), userId]);
    saveDb();
    console.log('[expenses.DELETE] Deleted expense:', id);

    res.json({ success: true, message: 'تم حذف المصروف بنجاح' });
  } catch (error) {
    console.error('[expenses.DELETE] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
