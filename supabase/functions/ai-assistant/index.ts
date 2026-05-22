// Supabase Edge Function: AI Assistant with RAG
// Setup: supabase secrets set OPENROUTER_API_KEY=sk-or-...
//        supabase secrets set SERVICE_ROLE_KEY=<project-service-role-key>

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── Database Queries ───────────────────────────────────────────────────────

async function getTodaySales() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('sales')
    .select('final_amount, discount_amount, tax_amount, created_at')
    .gte('created_at', today)
    .lt('created_at', today + 'T23:59:59.999Z');

  if (error) return null;
  const count = data.length;
  const revenue = data.reduce((s, r) => s + Number(r.final_amount), 0);
  const discounts = data.reduce((s, r) => s + Number(r.discount_amount), 0);
  const taxes = data.reduce((s, r) => s + Number(r.tax_amount), 0);
  return { count, revenue, discounts, taxes };
}

async function getYesterdaySales() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const day = d.toISOString().slice(0, 10);
  const { data } = await supabase
    .from('sales')
    .select('final_amount')
    .gte('created_at', day)
    .lt('created_at', day + 'T23:59:59.999Z');
  return (data || []).reduce((s, r) => s + Number(r.final_amount), 0);
}

async function getLowStockProducts() {
  const { data } = await supabase
    .from('products')
    .select('id, name_ar, name_en, quantity, min_quantity, sale_price, purchase_price, image_url, category_id')
    .lte('quantity', supabase.rpc('coalesce', { 'min_quantity': 5 }));
  return (data || []).filter(p => p.quantity <= (p.min_quantity || 5));
}

async function getProductCount() {
  const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
  return count || 0;
}

async function getCategoryBreakdown() {
  const { data } = await supabase
    .from('categories')
    .select('id, name_ar, name_en');

  if (!data) return [];
  const breakdown = [];
  for (const cat of data) {
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', cat.id);
    breakdown.push({
      name_ar: cat.name_ar,
      name_en: cat.name_en,
      count: count || 0
    });
  }
  return breakdown;
}

async function getTopProduct() {
  const { data } = await supabase
    .from('sale_items')
    .select('product_id, product_name, quantity, unit_price');

  if (!data || data.length === 0) return null;
  const counts = {};
  data.forEach(item => {
    const id = item.product_id;
    if (!counts[id]) counts[id] = { name: item.product_name, qty: 0 };
    counts[id].qty += item.quantity;
  });
  let top = null;
  for (const id of Object.keys(counts)) {
    if (!top || counts[id].qty > top.qty) top = { id: Number(id), ...counts[id] };
  }
  return top;
}

async function getProfitMargin() {
  const { data } = await supabase.from('products').select('purchase_price, sale_price, quantity');
  if (!data) return 0;
  return data.reduce((s, p) => {
    const cost = Number(p.purchase_price) * Number(p.quantity);
    const revenue = Number(p.sale_price) * Number(p.quantity);
    return s + (revenue - cost);
  }, 0);
}

async function getStockValue() {
  const { data } = await supabase.from('products').select('purchase_price, quantity');
  if (!data) return 0;
  return data.reduce((s, p) => s + Number(p.purchase_price) * Number(p.quantity), 0);
}

async function searchProducts(query: string) {
  const t = query.toLowerCase();
  const { data } = await supabase
    .from('products')
    .select('id, name_ar, name_en, sku, barcode, sale_price, purchase_price, quantity, min_quantity, image_url, category_id')
    .or(`name_ar.ilike.%${t}%,name_en.ilike.%${t}%,sku.ilike.%${t}%,barcode.ilike.%${t}%`)
    .limit(8);
  return data || [];
}

// ─── Intent Classification ───────────────────────────────────────────────────

function classifyIntent(message: string): string {
  const m = message.toLowerCase();
  if (/مبيعات|sales|revenue|إيرادات|today|اليوم|دخل/i.test(m)) return 'sales';
  if (/مخزون|stock|منتج|product|quantity|كمية/i.test(m)) return 'stock';
  if (/ناقص|low|نفاد|alert|warning/i.test(m)) return 'low_stock';
  if /^(بحث|find|search|product|منتج)\s/i.test(m) return 'product_search';
  if (/تحليل|analysis|تقرير|report|full/i.test(m)) return 'analysis';
  return 'general';
}

// ─── Gather Context Data ────────────────────────────────────────────────────

async function gatherContext() {
  const [todaySales, yesterdayRev, lowStock, prodCount, categories, topProduct, profit, stockVal] =
    await Promise.all([
      getTodaySales(),
      getYesterdaySales(),
      getLowStockProducts(),
      getProductCount(),
      getCategoryBreakdown(),
      getTopProduct(),
      getProfitMargin(),
      getStockValue()
    ]);

  const vsYesterday = yesterdayRev > 0 && todaySales && todaySales.revenue > 0
    ? ((todaySales.revenue - yesterdayRev) / yesterdayRev * 100).toFixed(1)
    : null;

  return {
    todaySales: todaySales ? {
      count: todaySales.count,
      revenue: todaySales.revenue,
      discounts: todaySales.discounts,
      taxes: todaySales.taxes,
      vsYesterday: vsYesterday ? Number(vsYesterday) : null
    } : null,
    lowStock: lowStock.map(p => ({
      name: p.name_ar,
      quantity: p.quantity,
      min_quantity: p.min_quantity,
      price: Number(p.sale_price),
      image_url: p.image_url
    })),
    productCount: prodCount,
    categories,
    topProduct: topProduct ? { name: topProduct.name, qty_sold: topProduct.qty } : null,
    profitMargin: profit,
    stockValue: stockVal
  };
}

// ─── Build System Prompt ────────────────────────────────────────────────────

function buildSystemPrompt(context: any, lang: string): string {
  const ctx = context;
  const revenue = ctx.todaySales?.revenue?.toLocaleString() || '0';
  const count = ctx.todaySales?.count || '0';
  const vsYest = ctx.todaySales?.vsYesterday;
  const vsYestStr = vsYest !== null
    ? (vsYest >= 0 ? `📈 زيادة بنسبة ${vsYest}% مقارنة بالأمس` : `📉 انخفاض بنسبة ${Math.abs(vsYest)}% مقارنة بالأمس`)
    : 'لا توجد بيانات كافية للمقارنة مع الأمس';

  const lowStockStr = ctx.lowStock.length > 0
    ? ctx.lowStock.map((p: any) => `- ${p.name}: متبقي ${p.quantity} قطع (الحد الأدنى: ${p.min_quantity})`).join('\n')
    : 'جميع المنتجات متوفرة بمخزون كافٍ.';

  const catStr = ctx.categories.map((c: any) => `- ${c.name_ar}: ${c.count} منتج`).join('\n');
  const topStr = ctx.topProduct
    ? `المنتج الأكثر مبيعاً: ${ctx.topProduct.name} (${ctx.topProduct.qty_sold} قطعة)`
    : 'لا توجد مبيعات كافية لتحديد المنتج الأكثر مبيعاً.';

  const systemLang = lang === 'ar'
    ? `أنت مساعد ذكاء اصطناعي خبير في إدارة متجر أزياء فاخر.
أجب باللغة العربية الفصحى أو الدارجة الجزائرية حسب سياق السؤال.
اعتمد فقط على البيانات الحقيقية المسترجعة من قاعدة البيانات أدناه.
لا تخترع معلومات غير موجودة في البيانات.
استخدم رموزاً تعبيرية مناسبة لتجميل الرد.`

    : `You are an elite e-commerce fashion store AI consultant.
Answer in English.
Only use the real database context below.
Do not invent data not present in the context.
Use appropriate emojis to format your response.`;

  return `${systemLang}

=== 📊 بيانات المتجر الحية (Live Store Metrics) ===

🛒 مبيعات اليوم:
- الفواتير: ${count}
- الإيرادات: ${revenue} د.ج
- ${vsYestStr}

📦 المخزون:
- إجمالي المنتجات: ${ctx.productCount} صنف
- قيمة المخزون (التكلفة): ${ctx.stockValue?.toLocaleString() || '0'} د.ج
- هامش الربح الإجمالي: ${ctx.profitMargin?.toLocaleString() || '0'} د.ج

⚠️ المنتجات المنخفضة:
${lowStockStr}

🏷️ توزيع الفئات:
${catStr}

🏆 ${topStr}`;
}

// ─── Call OpenRouter API ────────────────────────────────────────────────────

async function callAI(messages: any[], systemContent: string) {
  const body = {
    model: 'mistralai/mistral-7b-instruct',
    messages: [
      { role: 'system', content: systemContent },
      ...messages
    ],
    max_tokens: 1024,
    temperature: 0.7,
  };

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter API error: ${res.status} ${errText}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { message, history, lang } = await req.json();
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400, headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    const userLang = lang || 'ar';
    const context = await gatherContext();
    const systemPrompt = buildSystemPrompt(context, userLang);

    const msgs = (history || []).slice(-10).map((m: any) => ({
      role: m.role,
      content: m.content
    }));
    msgs.push({ role: 'user', content: message });

    const reply = await callAI(msgs, systemPrompt);

    return new Response(JSON.stringify({
      reply,
      context: {
        todaySales: context.todaySales,
        lowStock: context.lowStock,
        productCount: context.productCount,
        categories: context.categories,
        topProduct: context.topProduct
      }
    }), {
      headers: { ...headers, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('AI Assistant error:', err.message);
    return new Response(JSON.stringify({
      error: err.message || 'Internal server error'
    }), {
      status: 500, headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }
});
