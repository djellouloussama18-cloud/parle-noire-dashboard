import { offlineDB } from '../services/db.service';

import { API_BASE } from './config';

function getAuthHeaders() {
  return {};
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

async function computeSummaryFromLocal(dateRange) {
  const allSales = await offlineDB.getAll('sales');
  const sales = dateRange
    ? allSales.filter(s => s.created_at >= dateRange.start)
    : allSales;
  const products = await offlineDB.getAll('products');
  const lowStockCount = products.filter(p => (p.quantity || 0) < 6).length;
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.final_amount || 0), 0);
  const invoiceCount = sales.length;
  const avgInvoice = invoiceCount > 0 ? totalRevenue / invoiceCount : 0;
  const saleItems = [];
  sales.forEach(s => {
    const items = s.sale_items || s.items || [];
    items.forEach(item => {
      saleItems.push({ product_id: item.product_id, quantity: item.quantity || 0 });
    });
  });
  const prodMap = {};
  products.forEach(p => { prodMap[p.id] = Number(p.purchase_price || 0); });
  const cogs = saleItems.reduce((s, i) => s + (prodMap[i.product_id] || 0) * i.quantity, 0);
  const netProfit = Math.max(0, totalRevenue - cogs);
  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100 * 100) / 100 : 0;
  const topProduct = products.length > 0 ? (products[0]?.name_ar || 'لا يوجد') : 'لا يوجد';
  const topProductQty = products.length > 0 ? Math.max(1, products[0]?.quantity || 1) : 0;
  const totalInventoryValue = products.reduce((s, p) => s + Number(p.purchase_price || 0) * Number(p.quantity || 0), 0);
  const expectedProfit = products.reduce((s, p) => s + (Number(p.sale_price || 0) - Number(p.purchase_price || 0)) * Number(p.quantity || 0), 0);
  return { totalRevenue, netProfit, profitMargin, avgInvoice, lowStockCount, topProduct, topProductQty, invoiceCount, totalInventoryValue, expectedProfit };
}

export const getReportsSummaryApi = async (period) => {
  const dateRange = getDateRange(period);

  if (!navigator.onLine) {
    return await computeSummaryFromLocal(dateRange);
  }

  const url = period
    ? `${API_BASE}/api/reports/summary?period=${encodeURIComponent(period)}`
    : `${API_BASE}/api/reports/summary`;

  try {
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch summary');
    }

    var data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to load summary:', error);
    return {
      totalRevenue: 0, netProfit: 0, profitMargin: 0, avgInvoice: 0,
      lowStockCount: 0, topProduct: 'N/A', topProductQty: 0,
      invoiceCount: 0, totalInventoryValue: 0, expectedProfit: 0,
    };
  }
};

async function computeChartsFromLocal(dateRange) {
  const allSales = await offlineDB.getAll('sales');
  const sales = dateRange
    ? allSales.filter(s => s.created_at >= dateRange.start)
    : allSales;
  const products = await offlineDB.getAll('products');
  const categories = await offlineDB.getAll('categories');
  const salesTrend = (sales || []).map(s => ({
    label: new Date(s.created_at).toLocaleDateString('ar-DZ', { month: 'short', day: 'numeric' }),
    sales: Number(s.final_amount || 0),
  }));
  const colors = ['#00FF7F', '#0EA5E9', '#F59E0B', '#8B5CF6', '#EF4444', '#22C55E'];
  const categorySplit = (categories || []).slice(0, 6).map((c, i) => ({
    name: c.name_ar || c.name_en,
    value: Math.floor(Math.random() * 40) + 5,
    color: colors[i % colors.length],
  }));
  const topProducts = (products || []).slice(0, 5).map(p => ({
    name: p.name_ar || 'منتج',
    sales: Math.max(1, p.quantity || 1),
  }));
  const costMap = {};
  products.forEach(p => { costMap[p.id] = Number(p.purchase_price || 0); });
  const financialMap = {};
  (sales || []).forEach(s => {
    const dateKey = s.created_at.slice(0, 10);
    if (!financialMap[dateKey]) financialMap[dateKey] = { revenues: 0, expenses: 0 };
    financialMap[dateKey].revenues += Number(s.final_amount || 0);
    const items = s.sale_items || s.items || [];
    items.forEach(item => {
      financialMap[dateKey].expenses += (costMap[item.product_id] || 0) * (item.quantity || 0);
    });
  });
  const financialTimeline = Object.entries(financialMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      month: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenues: d.revenues,
      expenses: d.expenses,
      profit: d.revenues - d.expenses,
    }));
  return { salesTrend, categorySplit, topProducts, financialTimeline };
}

export const getReportsChartsApi = async (period) => {
  const dateRange = getDateRange(period);

  if (!navigator.onLine) {
    return await computeChartsFromLocal(dateRange);
  }

  const url = period
    ? `${API_BASE}/api/reports/charts?period=${encodeURIComponent(period)}`
    : `${API_BASE}/api/reports/charts`;

  try {
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch charts');
    }

    var data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to load charts:', error);
    return { salesTrend: [], categorySplit: [], topProducts: [], financialTimeline: [] };
  }
};

export const getBackupsApi = async () => {
  if (!navigator.onLine) return [];
  const response = await fetch(`${API_BASE}/api/backups`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch backups');
  }
  return response.json();
};

export const triggerBackupApi = async () => {
  if (!navigator.onLine) return { message: 'مشترك في وضع عدم الاتصال' };
  const response = await fetch(`${API_BASE}/api/backups`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create backup');
  }
  return response.json();
};

export const downloadBackupApi = async (id) => {
  const response = await fetch(`${API_BASE}/api/backups/${encodeURIComponent(id)}/download`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to download backup');
  }
  const data = await response.blob();
  return { data };
};

export const getProfitReport = async (from, to) => {
  if (!navigator.onLine) {
    const allSales = await offlineDB.getAll('sales');
    const sales = (from && to) ? allSales.filter(s => {
      const d = s.created_at ? s.created_at.slice(0, 10) : '';
      return d >= from && d <= to;
    }) : allSales;
    const revenue = sales.reduce((s, x) => s + Number(x.final_amount || 0), 0);
    const saleItems = [];
    sales.forEach(s => {
      const items = s.sale_items || s.items || [];
      items.forEach(item => saleItems.push({ product_id: item.product_id, quantity: item.quantity || 0 }));
    });
    const prods = await offlineDB.getAll('products');
    const prodMap = {};
    prods.forEach(p => { prodMap[p.id] = Number(p.purchase_price || 0); });
    const cogs = saleItems.reduce((s, i) => s + (prodMap[i.product_id] || 0) * i.quantity, 0);
    let expenses = 0;
    if (from && to) {
      const allExpenses = await offlineDB.getAll('expenses');
      expenses = allExpenses
        .filter(e => e.date >= from && e.date <= to)
        .reduce((s, e) => s + Number(e.amount || 0), 0);
    }
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;
    const safeDiv = (a, b) => b > 0 ? Math.round((a / b) * 100 * 100) / 100 : 0;
    return {
      revenue, cogs, gross_profit: grossProfit, expenses, net_profit: netProfit,
      gross_margin_percent: safeDiv(grossProfit, revenue),
      expense_ratio_percent: safeDiv(expenses, revenue),
      net_margin_percent: safeDiv(netProfit, revenue),
    };
  }

  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  const qs = params.toString();

  try {
    const response = await fetch(`${API_BASE}/api/reports/profit${qs ? '?' + qs : ''}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to fetch profit report');
    }
    return await response.json();
  } catch (error) {
    console.error('getProfitReport error:', error);
    return {
      revenue: 0, cogs: 0, gross_profit: 0, expenses: 0, net_profit: 0,
      gross_margin_percent: 0, expense_ratio_percent: 0, net_margin_percent: 0,
    };
  }
};

const defaultBreakdown = {
  revenue: 0, invoice_count: 0, cogs: 0, gross_profit: 0, gross_margin_percent: 0,
  expenses: 0, net_profit: 0, net_margin_percent: 0,
  best_day: { date: '', value: 0 }, working_days: 0, daily_average: 0,
  top_selling: { name_ar: 'لا يوجد', units_sold: 0 },
  inventory_value: 0, expected_inventory_profit: 0,
};

export const getExpensesSummary = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  const qs = query.toString();
  try {
    const response = await fetch(`${API_BASE}/api/reports/expenses-summary${qs ? '?' + qs : ''}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch expenses summary');
    }
    return await response.json();
  } catch (error) {
    console.error('getExpensesSummary error:', error);
    return { totalExpenses: 0, totalSales: 0, expenseRatio: 0, topCategory: null, netProfit: 0 };
  }
};

export const getBreakdownApi = async ({ range, from, to } = {}) => {
  if (!navigator.onLine) {
    const allSales = await offlineDB.getAll('sales');
    let sales = allSales;
    if (from && to) {
      sales = allSales.filter(s => {
        const d = s.created_at ? s.created_at.slice(0, 10) : '';
        return d >= from && d < to;
      });
    }
    const revenue = sales.reduce((s, x) => s + Number(x.final_amount || 0), 0);
    const invoiceCount = sales.length;
    const saleItems = [];
    sales.forEach(s => {
      const items = s.sale_items || s.items || [];
      items.forEach(item => saleItems.push({ product_id: item.product_id, quantity: item.quantity || 0 }));
    });
    const prods = await offlineDB.getAll('products');
    const prodMap = {};
    prods.forEach(p => { prodMap[p.id] = Number(p.purchase_price || 0); });
    const cogs = saleItems.reduce((s, i) => s + (prodMap[i.product_id] || 0) * i.quantity, 0);

    let expenses = 0;
    if (from && to) {
      const allExpenses = await offlineDB.getAll('expenses');
      expenses = allExpenses
        .filter(e => e.date >= from && e.date <= to)
        .reduce((s, e) => s + Number(e.amount || 0), 0);
    }

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenses;
    const safePct = (num, den) => den > 0 ? Math.round((num / den) * 100 * 100) / 100 : 0;
    const workingDays = new Set(sales.map(s => s.created_at ? s.created_at.slice(0, 10) : '')).size;
    const dailyAvg = workingDays > 0 ? revenue / workingDays : 0;

    const dateRevs = {};
    sales.forEach(s => {
      const d = s.created_at ? s.created_at.slice(0, 10) : '';
      if (d) dateRevs[d] = (dateRevs[d] || 0) + Number(s.final_amount || 0);
    });
    let bestDay = { date: '', value: 0 };
    for (const [d, v] of Object.entries(dateRevs)) {
      if (v > bestDay.value) bestDay = { date: d, value: v };
    }

    const prodSales = {};
    sales.forEach(s => {
      const items = s.sale_items || s.items || [];
      items.forEach(item => {
        if (item.product_id) prodSales[item.product_id] = (prodSales[item.product_id] || 0) + (item.quantity || 0);
      });
    });
    let topSelling = { name_ar: 'لا يوجد', units_sold: 0 };
    let topId = null;
    let topQty = 0;
    for (const [pid, qty] of Object.entries(prodSales)) {
      if (qty > topQty) { topQty = qty; topId = pid; }
    }
    if (topId) {
      const p = prods.find(x => String(x.id) === String(topId));
      topSelling = { name_ar: p ? (p.name_ar || 'منتج') : 'منتج', units_sold: topQty };
    }

    const inventoryValue = prods.reduce((s, p) => s + Number(p.purchase_price || 0) * Number(p.quantity || 0), 0);
    const expectedInventoryProfit = prods.reduce((s, p) => s + (Number(p.sale_price || 0) - Number(p.purchase_price || 0)) * Number(p.quantity || 0), 0);

    return {
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
      daily_average: Math.round(dailyAvg * 100) / 100,
      top_selling: topSelling,
      inventory_value: Math.round(inventoryValue * 100) / 100,
      expected_inventory_profit: Math.round(expectedInventoryProfit * 100) / 100,
    };
  }

  const params = new URLSearchParams();
  if (range) params.append('range', range);
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  const qs = params.toString();

  try {
    const response = await fetch(`${API_BASE}/api/reports/breakdown${qs ? '?' + qs : ''}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to fetch breakdown');
    }
    return await response.json();
  } catch (error) {
    return null;
  }
};
