import { supabase } from '../lib/supabase';
import { offlineDB } from '../services/db.service';

// ─── Helper: today's date range ─────────────────────────────────────────────
function todayRange() {
  const s = new Date();
  s.setHours(0, 0, 0, 0);
  const e = new Date();
  e.setHours(23, 59, 59, 999);
  return { start: s.toISOString(), end: e.toISOString() };
}

// ─── Analytics Queries ──────────────────────────────────────────────────────

async function getTodaySales(lang) {
  let data;
  if (!navigator.onLine) {
    const { start, end } = todayRange();
    const allSales = await offlineDB.getAll('sales');
    data = allSales.filter(s => s.created_at >= start && s.created_at < end);
  } else {
    const { start, end } = todayRange();
    const { data: _data, error } = await supabase
      .from('sales')
      .select('final_amount')
      .gte('created_at', start)
      .lt('created_at', end);
    if (error) throw error;
    data = _data;
  }

  const count = data.length;
  const revenue = data.reduce((s, r) => s + Number(r.final_amount), 0);
  return lang === 'ar'
    ? `📊 أهلاً بك! إجمالي مبيعات اليوم هو ${revenue.toLocaleString()} د.ج من إجمالي ${count} طلبية.`
    : `📊 Welcome! Today's total sales are ${revenue.toLocaleString()} DZD from ${count} orders.`;
}

async function getLowStock(lang) {
  let data;
  if (!navigator.onLine) {
    const allProducts = await offlineDB.getAll('products');
    data = allProducts.filter(p => p.quantity < 5);
  } else {
    const { data: _data, error } = await supabase
      .from('products')
      .select('name_ar, name_en, quantity, min_quantity, sale_price')
      .lt('quantity', 5);
    if (error) throw error;
    data = _data;
  }

  if (data.length === 0) {
    return lang === 'ar'
      ? '✅ جميع المنتجات متوفرة بمخزون كافٍ.'
      : '✅ All products have sufficient stock.';
  }

  const lines = data.map(p =>
    `• ${p.name_ar} — متبقي ${p.quantity} قطع (الحد: ${p.min_quantity || 5})`
  );
  return lang === 'ar'
    ? `⚠️ المنتجات التي وشكت على النفاد:\n${lines.join('\n')}`
    : `⚠️ Low stock products:\n${data.map(p => `• ${p.name_en || p.name_ar} — ${p.quantity} left (min: ${p.min_quantity || 5})`).join('\n')}`;
}

async function getBestPromoTime(lang) {
  let data;
  const today = new Date().toISOString().slice(0, 10);
  if (!navigator.onLine) {
    const allSales = await offlineDB.getAll('sales');
    data = allSales.filter(s => s.created_at >= today && s.created_at < today + 'T23:59:59.999Z');
  } else {
    const { data: _data, error } = await supabase
      .from('sales')
      .select('created_at, final_amount')
      .gte('created_at', today)
      .lt('created_at', today + 'T23:59:59.999Z');
    if (error) throw error;
    data = _data;
  }

  if (data.length === 0) {
    return lang === 'ar'
      ? '💡 لا توجد مبيعات اليوم بعد. لا يمكن تحديد أفضل وقت للترويج حالياً.'
      : '💡 No sales today yet. Cannot determine best promo time.';
  }

  const hours = {};
  data.forEach(sale => {
    const h = new Date(sale.created_at).getHours();
    hours[h] = (hours[h] || 0) + 1;
  });

  let bestHour = 0;
  let bestCount = 0;
  Object.entries(hours).forEach(([h, c]) => {
    if (c > bestCount) { bestHour = parseInt(h); bestCount = c; }
  });

  const period = bestHour < 12 ? 'صباحاً' : bestHour < 18 ? 'مساءً' : 'ليلاً';
  return lang === 'ar'
    ? `💡 أكثر وقت تشهد فيه المبيعات نشاطاً هو الساعة ${bestHour}:00 ${period} (${bestCount} فاتورة). ننصح بتكثيف العروض في هذا الوقت.`
    : `💡 Peak sales hour is ${bestHour}:00 (${bestCount} invoices). We recommend focusing promotions around this time.`;
}

async function getTotalStockStatus(lang) {
  let products;
  if (!navigator.onLine) {
    products = await offlineDB.getAll('products');
  } else {
    const { data: _products, error } = await supabase
      .from('products')
      .select('quantity, min_quantity, purchase_price, sale_price');
    if (error) throw error;
    products = _products;
  }

  const totalItems = products.reduce((s, p) => s + Number(p.quantity), 0);
  const totalProducts = products.length;
  const lowCount = products.filter(p => p.quantity < (p.min_quantity || 5)).length;
  const stockCost = products.reduce((s, p) => s + Number(p.purchase_price || 0) * Number(p.quantity), 0);
  const stockValue = products.reduce((s, p) => s + Number(p.sale_price) * Number(p.quantity), 0);

  return lang === 'ar'
    ? `📦 حالة المخزون الإجمالية:\n• إجمالي الأصناف: ${totalProducts}\n• إجمالي القطع: ${totalItems}\n• المنتجات المنخفضة: ${lowCount}\n• قيمة المخزون (تكلفة): ${stockCost.toLocaleString()} د.ج\n• قيمة المخزون (بيع): ${stockValue.toLocaleString()} د.ج`
    : `📦 Total Stock Status:\n• Total products: ${totalProducts}\n• Total items: ${totalItems}\n• Low stock items: ${lowCount}\n• Stock cost: ${stockCost.toLocaleString()} DZD\n• Stock value (retail): ${stockValue.toLocaleString()} DZD`;
}

async function getCategoryInventory(lang) {
  let categories;
  if (!navigator.onLine) {
    categories = await offlineDB.getAll('categories');
  } else {
    const { data: _categories, error: catErr } = await supabase
      .from('categories')
      .select('id, name_ar, name_en');
    if (catErr) throw catErr;
    categories = _categories;
  }

  const lines = [];
  if (!navigator.onLine) {
    const allProducts = await offlineDB.getAll('products');
    for (const cat of categories) {
      const count = allProducts.filter(p => p.category_id === cat.id).length;
      lines.push(`• ${cat.name_ar}: ${count} منتج`);
    }
  } else {
    for (const cat of categories) {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', cat.id);
      if (!error) {
        lines.push(`• ${cat.name_ar}: ${count} منتج`);
      }
    }
  }

  return lang === 'ar'
    ? `🏷️ جرد الأصناف والأنواع:\n${lines.join('\n')}`
    : `🏷️ Category Inventory:\n${lines.join('\n')}`;
}

async function searchProducts(query, lang) {
  const t = query.toLowerCase();
  let data;
  if (!navigator.onLine) {
    const allProducts = await offlineDB.getAll('products');
    data = allProducts.filter(p =>
      (p.name_ar && p.name_ar.toLowerCase().includes(t)) ||
      (p.name_en && p.name_en.toLowerCase().includes(t)) ||
      (p.sku && p.sku.toLowerCase().includes(t)) ||
      (p.barcode && p.barcode.toLowerCase().includes(t))
    ).slice(0, 5);
  } else {
    const { data: _data, error } = await supabase
      .from('products')
      .select('name_ar, name_en, sku, barcode, sale_price, quantity, image_url')
      .or(`name_ar.ilike.%${t}%,name_en.ilike.%${t}%,sku.ilike.%${t}%,barcode.ilike.%${t}%`)
      .limit(5);
    if (error) throw error;
    data = _data;
  }

  if (data.length === 0) {
    return lang === 'ar'
      ? `🔍 لم يتم العثور على نتائج لـ "${query}".`
      : `🔍 No results found for "${query}".`;
  }

  const lines = data.map(p =>
    `• ${p.name_ar} — ${p.sale_price.toLocaleString()} د.ج (متبقي ${p.quantity})`
  );
  return lang === 'ar'
    ? `🔍 نتائج البحث عن "${query}":\n${lines.join('\n')}`
    : `🔍 Search results for "${query}":\n${lines.join('\n')}`;
}

// ─── Main Router ────────────────────────────────────────────────────────────

function detectIntent(text) {
  const m = text.toLowerCase().trim();
  if (/مبيعات\s?اليوم|today.*sales|إيرادات\s?اليوم|revenue.*today|دخل\s?اليوم/.test(m)) return 'today_sales';
  if (/منتج\w*\s*(ناقص|وشك|منخفض|low|alert)|low\s*stock|نفاد/.test(m)) return 'low_stock';
  if (/أفضل\s*وقت\s*(للترويج|للبيع)|peak.*(hour|time)|best.*promo|ترويج/.test(m)) return 'best_time';
  if (/حالة\s*(السطوك|المخزون)|total.*stock|stock.*status|المخزون\s*الإجمال/.test(m)) return 'stock_status';
  if (/جرد\s*(الأصناف|الأنواع)|category.*inventory|الأصناف\s*والأنواع|تصنيف/.test(m)) return 'category_inventory';
  if (/تحليل\s*كامل|full.*analysis|تقرير|report/.test(m)) return 'full_analysis';
  return 'search';
}

export const askAiApi = async (message, history = [], lang = 'ar') => {
  const intent = detectIntent(message);

  let reply;
  switch (intent) {
    case 'today_sales':
      reply = await getTodaySales(lang);
      break;
    case 'low_stock':
      reply = await getLowStock(lang);
      break;
    case 'best_time':
      reply = await getBestPromoTime(lang);
      break;
    case 'stock_status':
      reply = await getTotalStockStatus(lang);
      break;
    case 'category_inventory':
      reply = await getCategoryInventory(lang);
      break;
    case 'full_analysis':
      reply = await getFullAnalysis(lang);
      break;
    default:
      reply = await searchProducts(message, lang);
      break;
  }

  return { reply };
};

export const getAnalysisApi = async (lang = 'ar') => {
  if (!navigator.onLine) {
    const [allSales, allProducts, allCategories, allSaleItems] = await Promise.all([
      offlineDB.getAll('sales'),
      offlineDB.getAll('products'),
      offlineDB.getAll('categories'),
      offlineDB.getAll('sale_items')
    ]);

    const { start, end } = todayRange();
    const todaySalesData = allSales.filter(s => s.created_at >= start && s.created_at < end);
    const count = todaySalesData.length;
    const revenue = todaySalesData.reduce((s, r) => s + Number(r.final_amount), 0);

    const y = new Date(); y.setDate(y.getDate() - 1);
    const yStart = new Date(y.setHours(0,0,0,0)).toISOString();
    const yEnd = new Date(y.setHours(23,59,59,999)).toISOString();
    const yesterdaySalesData = allSales.filter(s => s.created_at >= yStart && s.created_at < yEnd);
    const yRev = yesterdaySalesData.reduce((s, r) => s + Number(r.final_amount), 0);
    const vsY = yRev > 0 ? ((revenue - yRev) / yRev * 100).toFixed(1) : null;

    const profit = allProducts.reduce((s, p) => s + (Number(p.sale_price) - Number(p.purchase_price || 0)) * Number(p.quantity), 0);
    const lowStock = allProducts.filter(p => p.quantity < 5).map(p => ({ name: p.name_ar, quantity: p.quantity, category: '', image_url: p.image_url }));
    const productCount = allProducts.length;

    const categories = allCategories.map(c => ({
      name_ar: c.name_ar,
      count: allProducts.filter(p => p.category_id === c.id).length
    }));

    const counts = {};
    allSaleItems.forEach(item => {
      if (!counts[item.product_id]) counts[item.product_id] = { name: item.product_name, qty: 0 };
      counts[item.product_id].qty += item.quantity;
    });
    let top = null;
    Object.entries(counts).forEach(([id, info]) => {
      if (!top || info.qty > top.qty) top = { id: Number(id), name: info.name, qty_sold: info.qty };
    });

    const stockValue = allProducts.reduce((s, p) => s + Number(p.purchase_price || 0) * Number(p.quantity), 0);

    return {
      context: {
        todaySales: { count, revenue, profit, vsYesterday: vsY ? Number(vsY) : null },
        lowStock,
        productCount,
        categories,
        topProduct: top ? { name: top.name } : null,
        stockValue
      }
    };
  }

  const [todaySales, lowStock, prodCount, categories, topProductData, stockValue] = await Promise.all([
    (async () => {
      const { start, end } = todayRange();
      const { data } = await supabase.from('sales').select('final_amount').gte('created_at', start).lt('created_at', end);
      const count = data?.length || 0;
      const revenue = data?.reduce((s, r) => s + Number(r.final_amount), 0) || 0;

      const y = new Date(); y.setDate(y.getDate() - 1);
      const yStart = new Date(y.setHours(0,0,0,0)).toISOString();
      const yEnd = new Date(y.setHours(23,59,59,999)).toISOString();
      const { data: yData } = await supabase.from('sales').select('final_amount').gte('created_at', yStart).lt('created_at', yEnd);
      const yRev = yData?.reduce((s, r) => s + Number(r.final_amount), 0) || 0;
      const vsY = yRev > 0 ? ((revenue - yRev) / yRev * 100).toFixed(1) : null;

      const { data: allProds } = await supabase.from('products').select('purchase_price, sale_price, quantity');
      const profit = allProds?.reduce((s, p) => s + (Number(p.sale_price) - Number(p.purchase_price || 0)) * Number(p.quantity), 0) || 0;

      return { count, revenue, profit, vsYesterday: vsY ? Number(vsY) : null };
    })(),
    (async () => {
      const { data } = await supabase.from('products').select('name_ar, name_en, quantity, image_url').lt('quantity', 5);
      return (data || []).map(p => ({ name: p.name_ar, quantity: p.quantity, category: '', image_url: p.image_url }));
    })(),
    (async () => {
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
      return count || 0;
    })(),
    (async () => {
      const { data: cats } = await supabase.from('categories').select('id, name_ar');
      const result = [];
      if (cats) {
        for (const c of cats) {
          const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('category_id', c.id);
          result.push({ name_ar: c.name_ar, count: count || 0 });
        }
      }
      return result;
    })(),
    (async () => {
      const { data } = await supabase.from('sale_items').select('product_id, product_name, quantity');
      if (!data || data.length === 0) return null;
      const counts = {};
      data.forEach(item => {
        if (!counts[item.product_id]) counts[item.product_id] = { name: item.product_name, qty: 0 };
        counts[item.product_id].qty += item.quantity;
      });
      let top = null;
      Object.entries(counts).forEach(([id, info]) => {
        if (!top || info.qty > top.qty) top = { id: Number(id), name: info.name, qty_sold: info.qty };
      });
      return top ? { name: top.name } : null;
    })(),
    (async () => {
      const { data } = await supabase.from('products').select('purchase_price, quantity');
      return data?.reduce((s, p) => s + Number(p.purchase_price || 0) * Number(p.quantity), 0) || 0;
    })()
  ]);

  return {
    context: {
      todaySales,
      lowStock,
      productCount: prodCount,
      categories,
      topProduct: topProductData,
      stockValue
    }
  };
};

async function getFullAnalysis(lang) {
  const a = await getAnalysisApi(lang);
  const ctx = a.context;
  const ts = ctx.todaySales;
  const ls = ctx.lowStock;

  let text = lang === 'ar'
    ? '📊 **تحليل كامل لأداء المتجر**\n\n'
    : '📊 **Full Store Performance Analysis**\n\n';

  text += lang === 'ar'
    ? `• مبيعات اليوم: ${ts.revenue.toLocaleString()} د.ج (${ts.count} فاتورة)\n`
    : `• Today's sales: ${ts.revenue.toLocaleString()} DZD (${ts.count} invoices)\n`;

  if (ts.vsYesterday !== null) {
    text += lang === 'ar'
      ? `• مقارنة بالأمس: ${ts.vsYesterday >= 0 ? '+' : ''}${ts.vsYesterday}%\n`
      : `• vs Yesterday: ${ts.vsYesterday >= 0 ? '+' : ''}${ts.vsYesterday}%\n`;
  }

  text += lang === 'ar'
    ? `• هامش الربح الإجمالي: ${ts.profit.toLocaleString()} د.ج\n`
    : `• Total profit margin: ${ts.profit.toLocaleString()} DZD\n`;

  text += `• ${lang === 'ar' ? 'قيمة المخزون' : 'Stock value'}: ${ctx.stockValue.toLocaleString()} د.ج\n`;
  text += `• ${lang === 'ar' ? 'إجمالي المنتجات' : 'Total products'}: ${ctx.productCount}\n`;

  if (ctx.topProduct) {
    text += lang === 'ar'
      ? `• الأكثر مبيعاً: ${ctx.topProduct.name}\n`
      : `• Top seller: ${ctx.topProduct.name}\n`;
  }

  if (ls.length > 0) {
    text += '\n' + (lang === 'ar' ? '⚠️ **منتجات منخفضة:**\n' : '⚠️ **Low stock items:**\n');
    ls.slice(0, 5).forEach(p => {
      text += `• ${p.name}: ${p.quantity} قطع\n`;
    });
  }

  return text;
}
