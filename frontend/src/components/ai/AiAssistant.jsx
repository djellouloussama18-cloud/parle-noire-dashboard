import React, { useState, useEffect, useRef } from 'react';
import { askAiApi, getAnalysisApi } from '../../api/ai.api';
import useNotification from '../../hooks/useNotification';
import useSettingsStore from '../../store/useSettingsStore';
import useAuthStore from '../../store/useAuthStore';
import {
  Cpu,
  Send,
  Sparkles,
  BarChart3,
  Lightbulb,
  AlertTriangle,
  FileSpreadsheet,
  ShoppingBag,
  TrendingUp,
  Package,
  Clock,
  Layers,
  Boxes,
  Tag
} from 'lucide-react';
import Button from '../ui/Button';

export default function AiAssistant() {
  const { showError } = useNotification();
  const { language } = useSettingsStore();
  const user = useAuthStore(s => s.user);
  const isEn = language === 'en';
  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);
  const lastUserIdRef = useRef(null);

  useEffect(() => {
    const currentId = user?.id;
    if (currentId && currentId !== lastUserIdRef.current) {
      lastUserIdRef.current = currentId;
      localStorage.removeItem('chat_history');
      setMessages([
        {
          role: 'assistant',
          content: isEn
            ? '👋 Welcome! Ask about sales, stock, or click one of the quick cards below.'
            : '👋 مرحباً! اسأل عن المبيعات، المخزون، أو اضغط على بطاقة من الأسئلة السريعة أدناه.',
          type: 'text'
        }
      ]);
      setAnalysisData(null);
      setIsAnalysisOpen(false);
    }
  }, [user?.id]);

  const t = (ar, en) => isEn ? en : ar;

  const seedQueries = [
    {
      icon: BarChart3,
      iconColor: 'text-accent-primary',
      label: t('📊 مبيعات اليوم', '📊 Today\'s sales'),
      query: 'مبيعات اليوم'
    },
    {
      icon: AlertTriangle,
      iconColor: 'text-status-warning',
      label: t('⚠️ المنتجات وشك النفاد', '⚠️ Low stock products'),
      query: 'المنتجات الناقصة'
    },
    {
      icon: Clock,
      iconColor: 'text-accent-primary',
      label: t('💡 أفضل وقت للترويج', '💡 Best promo time'),
      query: 'أفضل وقت للترويج'
    },
    {
      icon: Boxes,
      iconColor: 'text-accent-primary',
      label: t('📦 حالة السطوك الإجمالية', '📦 Total stock status'),
      query: 'حالة السطوك الإجمالية'
    },
    {
      icon: Tag,
      iconColor: 'text-accent-primary',
      label: t('🏷️ جرد الأصناف والأنواع', '🏷️ Category inventory'),
      query: 'جرد الأصناف والأنواع'
    }
  ];

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: isEn
        ? '👋 Welcome! Ask about sales, stock, or click one of the quick cards below.'
        : '👋 مرحباً! اسأل عن المبيعات، المخزون، أو اضغط على بطاقة من الأسئلة السريعة أدناه.',
      type: 'text'
    }
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPending]);

  useEffect(() => {
    if (isAnalysisOpen && !analysisData && !analysisLoading) {
      setAnalysisLoading(true);
      getAnalysisApi(language)
        .then((res) => {
          const ctx = res.context || {};
          setAnalysisData({
            todaySales: ctx.todaySales ? {
              count: ctx.todaySales.count || 0,
              revenue: ctx.todaySales.revenue || 0,
              profit: ctx.profitMargin || 0,
              vsYesterday: ctx.todaySales.vsYesterday
            } : null,
            lowStock: (ctx.lowStock || []).map(p => ({
              name: p.name,
              quantity: p.quantity,
              category: '',
              image_url: p.image_url
            })),
            peakHours: null,
            topProduct: ctx.topProduct ? { name: ctx.topProduct.name } : null,
            stockValue: ctx.stockValue || 0
          });
        })
        .catch(() => showError(t('فشل تحميل التقرير', 'Failed to load analysis')))
        .finally(() => setAnalysisLoading(false));
    }
  }, [isAnalysisOpen]);

  const quickAsk = (q) => {
    handleSend({ preventDefault: () => {} }, q);
  };

  const handleSend = async (e, overrideText) => {
    e.preventDefault();
    const text = overrideText || inputVal.trim();
    if (!text || isPending) return;

    setInputVal('');
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsPending(true);

    try {
      const chatHistory = messages.slice(-10);
      const response = await askAiApi(text, chatHistory, language);
      const msg = {
        role: 'assistant',
        type: 'text',
        content: response.reply || response.error || ''
      };
      setMessages(prev => [...prev, msg]);
    } catch {
      showError(t('حدث خطأ أثناء الاتصال بمساعد الذكاء الاصطناعي', 'An error occurred'));
    } finally {
      setIsPending(false);
    }
  };

  function renderProductCard(p) {
    const margin = p.sale_price - p.purchase_price;
    const marginPercent = p.purchase_price > 0 ? ((margin / p.purchase_price) * 100).toFixed(0) : 0;
    const imgSrc = p.image_url && p.image_url.startsWith('/') ? p.image_url : null;

    return (
      <div className="flex gap-3 bg-bg-card border border-light rounded-xl p-3 mt-1.5">
        {imgSrc && (
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-subtle flex-shrink-0 border border-light">
            <img
              src={imgSrc}
              alt={p.name_ar}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}
        <div className={`flex-1 min-w-0 ${isEn ? 'text-left' : 'text-right'}`}>
          <div className="font-extrabold text-text-primary text-sm leading-tight">{p.name_ar}</div>
          <div className="text-[10px] text-text-secondary font-bold mt-0.5">{p.category}</div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-[11px] font-black text-accent-primary">{p.sale_price.toLocaleString()} د.ج</span>
            <span className={`text-[10px] font-bold ${p.quantity < 3 ? 'text-status-danger' : 'text-status-success'}`}>
              {p.quantity} {t('قطعة', 'pcs')}
            </span>
            <span className="text-[10px] font-bold text-status-success">+{marginPercent}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-[450px] relative border border-medium">
      {/* Header */}
      <div className={`flex items-center justify-between pb-3 border-b border-light ${isEn ? 'flex-row-reverse' : ''}`}>
        <div className="flex items-center gap-1.5 select-none">
          <span className="w-2 h-2 rounded-full bg-accent-primary animate-ping" />
          <span className="text-[10px] font-bold text-accent-primary">{t('● نشط', '● Active')}</span>
        </div>
        <div className={`flex items-center gap-2 ${isEn ? 'flex-row-reverse' : ''}`}>
          <span className="text-sm font-extrabold text-text-primary">{t('مساعد الذكاء الاصطناعي', 'AI Assistant')}</span>
          <Cpu className="w-5 h-5 text-accent-primary animate-pulse" />
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-grow my-4 overflow-y-auto flex flex-col gap-3 pr-1 pl-1">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';

          if (!isUser && msg.type === 'product' && msg.product) {
            return (
              <div key={idx} className="bg-subtle border border-light max-w-[90%] rounded-xl rounded-bl-none p-3.5 self-start">
                <div className={`text-xs font-bold text-text-primary mb-1 ${isEn ? 'text-left' : 'text-right'}`}>
                  {t('✅ تم العثور على المنتج:', '✅ Product found:')}
                </div>
                {renderProductCard(msg.product)}
              </div>
            );
          }

          if (!isUser && msg.type === 'category_list' && msg.products?.length > 0) {
            return (
              <div key={idx} className="bg-subtle border border-light max-w-[90%] rounded-xl rounded-bl-none p-3.5 self-start">
                <div className={`text-xs font-bold text-text-primary mb-1 flex items-center gap-1.5 ${isEn ? 'text-left' : 'justify-end'}`}>
                  <Layers className="w-3.5 h-3.5 text-accent-primary" />
                  {t(`منتجات ${msg.category}`, `${msg.category} Products`)}
                </div>
                <div className="flex flex-col gap-1.5">
                  {msg.products.map((p, pi) => (
                    <div key={pi} className="flex items-center gap-2 bg-bg-card/50 rounded-lg p-2 border border-light/50">
                      {p.image_url ? (
                        <div className="w-9 h-9 rounded-md overflow-hidden bg-subtle flex-shrink-0 border border-light">
                          <img src={p.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-md bg-subtle flex items-center justify-center flex-shrink-0">
                          <Package className="w-3.5 h-3.5 text-text-secondary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-extrabold text-text-primary">{p.name_ar}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-black text-accent-primary">{p.sale_price.toLocaleString()} د.ج</div>
                        <div className={`text-[9px] font-bold ${p.quantity < 3 ? 'text-status-danger' : 'text-status-success'}`}>{p.quantity} {t('قطعة', 'pcs')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          const bubbleStyle = isUser
            ? "bg-bg-card border border-accent-primary/20 text-text-primary rounded-br-none self-end"
            : "bg-subtle border border-light text-text-secondary rounded-bl-none self-start";

          return (
            <div
              key={idx}
              className={`max-w-[85%] rounded-xl p-3.5 text-xs font-semibold leading-relaxed flex gap-2.5 items-start ${isEn ? 'text-left' : 'text-right'} ${bubbleStyle}`}
            >
              {!isUser && <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-accent-primary" />}
              <span className="whitespace-pre-wrap">{msg.content}</span>
            </div>
          );
        })}

        {isPending && (
          <div className="bg-subtle border border-light max-w-[85%] rounded-xl rounded-bl-none p-3.5 self-start flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[10px] text-text-secondary font-bold">{t('يفكر المساعد...', 'Thinking...')}</span>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Action Row */}
      <div className="flex flex-col gap-3">
        {/* Quick action cards */}
        <div className="flex gap-2 flex-wrap">
          {seedQueries.map((sq, i) => (
            <button
              key={i}
              onClick={() => quickAsk(sq.query)}
              disabled={isPending}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-subtle border border-light rounded-lg hover:border-accent-primary/40 hover:bg-bg-card transition-all text-[10px] font-bold text-text-secondary disabled:opacity-30"
            >
              <sq.icon className={`w-3 h-3 ${sq.iconColor}`} />
              <span>{sq.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            placeholder={t('اسأل عن المبيعات، المخزون، أو اسم منتج...', 'Ask about sales, stock, or a product name...')}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isPending}
            className={`w-full h-11 bg-subtle border border-medium rounded-xl text-xs font-semibold focus:border-accent-primary outline-none transition-all duration-200 ${isEn ? 'pl-12 pr-4 text-left' : 'pr-4 pl-12 text-right'}`}
          />
          <button
            type="submit"
            disabled={isPending || !inputVal.trim()}
            className={`absolute top-1/2 -translate-y-1/2 p-2 bg-accent-primary hover:bg-accent-hover text-on-accent rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 ${isEn ? 'right-2' : 'left-2'}`}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <Button
          onClick={() => setIsAnalysisOpen(true)}
          variant="secondary"
          className="w-full h-10 py-0 flex items-center justify-center gap-2 border-default text-[11px] font-extrabold"
        >
          <FileSpreadsheet className="w-4 h-4" />
          {t('تحليل كامل لأداء المتجر', 'Full Store Performance Analysis')}
        </Button>
      </div>

      {/* Slide-out Analysis Panel */}
      {isAnalysisOpen && (
        <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm z-50 flex justify-end no-print animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsAnalysisOpen(false)} />
          <div
            className={`relative w-full max-w-xl h-full bg-bg-secondary ${isEn ? 'border-l' : 'border-r'} border-default flex flex-col p-6 shadow-2xl overflow-y-auto ${isEn ? 'text-left' : 'text-right'}`}
            style={{
              animation: 'panelSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards'
            }}
          >
            <div className={`flex items-center justify-between border-b border-light pb-4 ${isEn ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setIsAnalysisOpen(false)}
                className="text-xs font-bold text-status-danger bg-status-danger/10 px-3 py-1.5 rounded-lg hover:bg-status-danger/20 transition-all"
              >
                {t('إغلاق', 'Close')}
              </button>
              <h3 className={`text-lg font-black text-accent-primary flex items-center gap-2 ${isEn ? 'flex-row-reverse' : ''}`}>
                {t('تقرير التحليل الشامل للمبيعات والمخزون', 'Comprehensive Sales & Inventory Report')}
                <Sparkles className="w-5 h-5 text-accent-primary" />
              </h3>
            </div>

            <div className="flex flex-col gap-6 mt-6">
              {analysisLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs font-bold text-text-secondary">{t('جاري تحميل التقرير...', 'Loading report...')}</span>
                  </div>
                </div>
              ) : analysisData ? (
                <>
                  {/* Sales Insights */}
                  <section className="bg-subtle border border-light p-5 rounded-2xl">
                    <h4 className={`text-sm font-extrabold text-accent-primary mb-3 flex items-center gap-1.5 ${isEn ? 'flex-row-reverse justify-start' : 'justify-end'}`}>
                      {t('رؤى مبيعات اليوم', 'Today\'s Sales Insights')}
                      <TrendingUp className="w-4 h-4" />
                    </h4>
                    <div className={`grid grid-cols-2 gap-3 ${isEn ? 'text-left' : 'text-right'}`}>
                      <div className="bg-bg-card rounded-xl p-3">
                        <div className="text-[10px] font-bold text-text-secondary">{t('الفواتير', 'Invoices')}</div>
                        <div className="text-lg font-black text-text-primary">{analysisData.todaySales.count}</div>
                      </div>
                      <div className="bg-bg-card rounded-xl p-3">
                        <div className="text-[10px] font-bold text-text-secondary">{t('الإيرادات', 'Revenue')}</div>
                        <div className="text-lg font-black text-accent-primary">{analysisData.todaySales.revenue.toLocaleString()} <span className="text-[10px]">د.ج</span></div>
                      </div>
                      <div className="bg-bg-card rounded-xl p-3">
                        <div className="text-[10px] font-bold text-text-secondary">{t('الأرباح', 'Profit')}</div>
                        <div className="text-lg font-black text-status-success">{analysisData.todaySales.profit.toLocaleString()} <span className="text-[10px]">د.ج</span></div>
                      </div>
                      <div className="bg-bg-card rounded-xl p-3">
                        <div className="text-[10px] font-bold text-text-secondary">{t('مقارنة بالأمس', 'vs Yesterday')}</div>
                        <div className={`text-lg font-black ${analysisData.todaySales.vsYesterday >= 0 ? 'text-status-success' : 'text-status-danger'}`}>
                          {analysisData.todaySales.vsYesterday > 0 ? '+' : ''}{analysisData.todaySales.vsYesterday}%
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Low Stock */}
                  <section className="bg-status-warning/5 border border-status-warning/10 p-5 rounded-2xl">
                    <h4 className={`text-sm font-extrabold text-status-warning mb-3 flex items-center gap-1.5 ${isEn ? 'flex-row-reverse justify-start' : 'justify-end'}`}>
                      {t('خطة توريد المخزون العاجلة', 'Urgent Stock Replenishment')}
                      <Package className="w-4 h-4" />
                    </h4>
                    {analysisData.lowStock.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {analysisData.lowStock.map((p, i) => (
                          <div key={i} className="flex items-center gap-3 bg-bg-card rounded-xl p-2.5">
                            {p.image_url ? (
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-subtle flex-shrink-0 border border-light">
                                <img src={p.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-status-warning/10 flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4 text-status-warning" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-extrabold text-text-primary">{p.name}</div>
                              <div className="text-[10px] text-text-secondary font-bold">{p.category}</div>
                            </div>
                            <div className="text-xs font-black text-status-danger">{p.quantity} {t('قطع', 'pcs')}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-text-secondary">
                        {t('جميع المنتجات متوفرة بمخزون كافٍ.', 'All products have sufficient stock.')}
                      </div>
                    )}
                  </section>

                  {/* Peak Hours + Top Product + Stock Value */}
                  <section className="bg-subtle border border-light p-5 rounded-2xl">
                    <h4 className={`text-sm font-extrabold text-accent-primary mb-3 flex items-center gap-1.5 ${isEn ? 'flex-row-reverse justify-start' : 'justify-end'}`}>
                      {t('توصيات تسويقية مخصصة', 'Custom Marketing Recommendations')}
                      <Lightbulb className="w-4 h-4" />
                    </h4>
                    <div className={`flex flex-col gap-3 ${isEn ? 'text-left' : 'text-right'}`}>
                      {analysisData.peakHours && analysisData.peakHours.display && (
                        <div className="bg-bg-card rounded-xl p-3 flex items-center gap-3">
                          <Clock className="w-5 h-5 text-accent-primary flex-shrink-0" />
                          <div>
                            <div className="text-[10px] font-bold text-text-secondary">{t('أفضل وقت للبيع', 'Peak Sales Hour')}</div>
                            <div className="text-sm font-black text-text-primary">{analysisData.peakHours.display}</div>
                          </div>
                        </div>
                      )}
                      {analysisData.topProduct && (
                        <div className="bg-bg-card rounded-xl p-3 flex items-center gap-3">
                          <ShoppingBag className="w-5 h-5 text-accent-primary flex-shrink-0" />
                          <div>
                            <div className="text-[10px] font-bold text-text-secondary">{t('المنتج الأكثر مبيعاً', 'Top Selling Product')}</div>
                            <div className="text-sm font-black text-text-primary">{analysisData.topProduct.name}</div>
                          </div>
                        </div>
                      )}
                      <div className="bg-bg-card rounded-xl p-3 flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-status-success flex-shrink-0" />
                        <div>
                          <div className="text-[10px] font-bold text-text-secondary">{t('قيمة المخزون (ربح)', 'Stock Value (Profit)')}</div>
                          <div className="text-sm font-black text-status-success">{analysisData.stockValue.toLocaleString()} د.ج</div>
                        </div>
                      </div>
                    </div>
                  </section>
                </>
              ) : (
                <div className="text-center py-12 text-xs font-bold text-status-danger">
                  {t('فشل تحميل التقرير', 'Failed to load report')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes panelSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
