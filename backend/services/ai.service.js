const db = require('../database/db');

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function searchProduct(msg, userId) {
  const products = db.prepare(`
    SELECT p.*, c.name_ar AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE user_id = ?
  `).all(userId);

  const exact = products.find(p =>
    p.name_ar && msg.includes(p.name_ar)
  );
  if (exact) return { type: 'single', product: exact };

  const words = msg.split(/\s+/);
  for (const w of words) {
    if (w.length < 2) continue;
    const found = products.find(p =>
      (p.name_ar && p.name_ar.includes(w)) ||
      (p.name_en && p.name_en.toLowerCase().includes(w.toLowerCase()))
    );
    if (found) return { type: 'single', product: found };
  }

  const categories = db.prepare('SELECT * FROM categories').all();
  const catWords = msg.split(/\s+/).filter(w => w.length >= 2);
  for (const cat of categories) {
    if (!cat.name_ar) continue;
    const match = catWords.find(w => cat.name_ar.includes(w) || w.includes(cat.name_ar));
    if (match) {
      const catProducts = products.filter(p => p.category_id === cat.id);
      if (catProducts.length > 0) return { type: 'category', category: cat.name_ar, products: catProducts };
    }
  }

  return null;
}

function getPeakHours(userId) {
  const sales = db.prepare('SELECT created_at, final_amount FROM sales WHERE user_id = ?').all(userId);
  const hourBuckets = {};
  sales.forEach(s => {
    const h = new Date(s.created_at).getHours();
    hourBuckets[h] = (hourBuckets[h] || 0) + s.final_amount;
  });
  if (Object.keys(hourBuckets).length === 0) return null;

  let bestHour = 0, bestAmount = 0;
  for (const [h, amt] of Object.entries(hourBuckets)) {
    if (amt > bestAmount) { bestAmount = amt; bestHour = Number(h); }
  }

  const dir = bestHour < 12 ? 'صباحاً' : 'مساءً';
  const displayHour = bestHour <= 12 ? bestHour : bestHour - 12;
  return {
    bestHour,
    display: `${displayHour}:00 ${dir}`,
    amount: bestAmount
  };
}

function processLocalQuery(userMessage, userId) {
  const msg = userMessage.trim();
  const lowerMsg = msg.toLowerCase();
  const today = getTodayStr();

  const isGreeting = /^(السلام|مرحبا|أهلاً|hello|hi)/i.test(lowerMsg);
  const hasKeywords = /(مخزون|مخزن|سطوك|stock|بعنا|مبيعات|فواتير|فواتر|اليوم|ناقص|نواقص|خلاص|عدد|إجمالي|منتج|قطعة|بيع|أرباح|سلسلة|عطر|حقيبة|فستان|ساعة|محفظة)/i.test(lowerMsg);

  if (isGreeting && !hasKeywords) {
    return { type: 'text', text: 'وعليكم السلام ورحمة الله وبركاته! أنا مساعدك المحلي، كيف يمكنني مساعدتك في جرد المخزن أو حساب مبيعات اليوم؟' };
  }

  const productSearch = searchProduct(msg, userId);
  if (productSearch) {
    if (productSearch.type === 'single') {
      const p = productSearch.product;
      return {
        type: 'product',
        product: {
          id: p.id,
          name_ar: p.name_ar,
          name_en: p.name_en,
          category: p.category_name || 'بدون تصنيف',
          quantity: p.quantity,
          sale_price: p.sale_price,
          purchase_price: p.purchase_price,
          image_url: p.image_url || ''
        }
      };
    }
    if (productSearch.type === 'category') {
      const catProducts = productSearch.products.map(p => ({
        id: p.id,
        name_ar: p.name_ar,
        quantity: p.quantity,
        sale_price: p.sale_price,
        purchase_price: p.purchase_price,
        image_url: p.image_url || ''
      }));
      return {
        type: 'category_list',
        category: productSearch.category,
        products: catProducts
      };
    }
  }

  if (/(جرد\s*الأصناف|جرد\s*الأنواع|أصناف\s*المخزن|أنواع\s*المنتجات|تصنيفات\s*المخزن|inventory\s*categories|category\s*list)/i.test(lowerMsg)) {
    const categories = db.prepare('SELECT * FROM categories').all();
    const products = db.prepare('SELECT * FROM products WHERE user_id = ?').all(userId);
    const totalQty = products.reduce((s, p) => s + p.quantity, 0);
    const lines = [];
    for (const cat of categories) {
      if (!cat.name_ar) continue;
      const catQty = products.filter(p => p.category_id === cat.id).reduce((s, p) => s + p.quantity, 0);
      if (catQty === 0) continue;
      const pct = totalQty > 0 ? ((catQty / totalQty) * 100).toFixed(0) : 0;
      lines.push(`- ${cat.name_ar}: ${catQty} قطعة (${pct}%)`);
    }
    if (lines.length === 0) return { type: 'text', text: 'لا توجد أصناف مسجلة في المخزن حالياً.' };
    return { type: 'text', text: `نسبة توفر الأصناف في المخزن (إجمالي ${totalQty} قطعة):\n${lines.join('\n')}` };
  }

  if (/(مخزون|مخزن|سطوك|stock|كم\s*قطعة|عدد\s*القطع|إجمالي\s*القطع|إجمالي\s*المخزون|حالة\s*السطوك|حالة\s*المخزون|إجمالي\s*المخزن|إجمالي\s*السطوك|total\s*stock)/i.test(lowerMsg)) {
    const totalStock = db.prepare('SELECT * FROM products WHERE user_id = ?').all(userId).reduce((sum, p) => sum + p.quantity, 0);
    return { type: 'text', text: `إجمالي القطع المتوفرة في المخزن حالياً هي: ${totalStock} قطعة.` };
  }

  if (/(بعنا|مبيعات|فواتير|فواتر|ربح|دخل|إيراد|مبيعات\s*اليوم|^\s*اليوم|أرباح|sales\s*today)/i.test(lowerMsg)) {
    const sales = db.prepare('SELECT * FROM sales WHERE user_id = ?').all(userId);
    const todaySales = sales.filter(s => s.created_at.slice(0, 10) === today);
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.final_amount, 0);
    return { type: 'text', text: `إحصائيات اليوم الحقيقية: تم تسجيل ${todaySales.length} فواتير، بإجمالي مبيعات قدره ${todayRevenue.toLocaleString()} د.ج.` };
  }

  if (/(ناقص|نواقص|خلاص|نقص|منتجات\s*ناقصة|أوشك\s*على\s*النفاد|وشك\s*النفاد|على\s*وشك|قليل|منتجات\s*وشك|low\s*stock)/i.test(lowerMsg)) {
    const products = db.prepare(`
      SELECT p.*, c.name_ar AS category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE user_id = ?
    `).all(userId);
    const lowStock = products.filter(p => p.quantity < 3);
    if (lowStock.length === 0) {
      return { type: 'text', text: 'جميع المنتجات متوفرة بمخزون كافٍ (أكثر من 3 قطع لكل منتج).' };
    }
    const list = lowStock.map(p =>
      `- ${p.name_ar} (${p.category_name || 'بدون تصنيف'}): ${p.quantity} قطع متبقية`
    ).join('\n');
    return { type: 'text', text: `المنتجات الناقصة (أقل من 3 قطع):\n${list}` };
  }

  if (/(أفضل\s*وقت|وقت\s*البيع|ساعة\s*الذروة|peak|أعلى\s*نسبة\s*بيع|أفضل\s*ساعة|أفضل\s*وقت\s*للترويج|best\s*time\s*for|promo\s*time)/i.test(lowerMsg)) {
    const peak = getPeakHours(userId);
    if (!peak) return { type: 'text', text: 'لا توجد بيانات مبيعات كافية لحساب أوقات الذروة.' };
    return { type: 'text', text: `⏰ أفضل وقت للترويج والبيع هو ${peak.display} بإجمالي مبيعات ${peak.amount.toLocaleString()} د.ج.` };
  }

  return { type: 'text', text: 'عذراً، يرجى سؤالي بشكل محدد عن (المخزون، مبيعات اليوم، المنتجات الناقصة، أو اسم منتج معين) لأعطيك الإحصاءات الدقيقة فوراً.' };
}

function getFullAnalysis(userId) {
  const today = getTodayStr();
  const sales = db.prepare('SELECT * FROM sales WHERE user_id = ?').all(userId);
  const products = db.prepare(`
    SELECT p.*, c.name_ar AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE user_id = ?
  `).all(userId);

  const todaySales = sales.filter(s => s.created_at.slice(0, 10) === today);
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.final_amount, 0);
  const todayProfit = todaySales.reduce((sum, s) => {
    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(s.id);
    const cost = items.reduce((c, i) => {
      const prod = products.find(p => p.id === i.product_id);
      return c + (prod ? prod.purchase_price * i.quantity : 0);
    }, 0);
    return sum + s.final_amount - cost;
  }, 0);

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const yesterdaySales = sales.filter(s => s.created_at.slice(0, 10) === yesterday);
  const yesterdayRevenue = yesterdaySales.reduce((sum, s) => sum + s.final_amount, 0);
  const vsYesterday = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1) : '0';

  const lowStock = products.filter(p => p.quantity < 3);
  const peak = getPeakHours(userId);

  const popItems = db.prepare(`
    SELECT product_id, product_name, SUM(quantity) AS total_qty
    FROM sale_items
    GROUP BY product_id
    ORDER BY total_qty DESC
    LIMIT 1
  `).all();
  const topProduct = popItems.length > 0
    ? products.find(p => p.id === popItems[0].product_id)
    : null;

  const sellPriceTotal = products.reduce((s, p) => s + p.sale_price * p.quantity, 0);
  const purchasePriceTotal = products.reduce((s, p) => s + p.purchase_price * p.quantity, 0);
  const stockValue = sellPriceTotal - purchasePriceTotal;

  return {
    todaySales: {
      count: todaySales.length,
      revenue: todayRevenue,
      profit: todayProfit,
      vsYesterday: vsYesterday
    },
    lowStock: lowStock.map(p => ({
      name: p.name_ar,
      category: p.category_name || 'بدون تصنيف',
      quantity: p.quantity,
      image_url: p.image_url || ''
    })),
    peakHours: peak,
    topProduct: topProduct ? {
      name: topProduct.name_ar,
      quantity: popItems[0].total_qty,
      image_url: topProduct.image_url || ''
    } : null,
    stockValue: stockValue
  };
}

async function askAi(userMessage, userId) {
  return processLocalQuery(userMessage, userId);
}

module.exports = {
  askAi,
  getFullAnalysis
};