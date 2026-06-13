import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useInventoryStore from '../store/useInventoryStore';
import useSettingsStore from '../store/useSettingsStore';
import useSalesStore from '../store/useSalesStore';
import useNotification from '../hooks/useNotification';
import { getBreakdownApi } from '../api/reports.api';
import formatCurrency from '../utils/formatCurrency';
import {
  Receipt,
  TrendingDown,
  AlertTriangle,
  Star,
  ArrowRight,
  Sparkles,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

// UI components
import KpiCard from '../components/ui/KpiCard';
import AreaChart from '../components/charts/AreaChart';
import DonutChart from '../components/charts/DonutChart';
import AiAssistant from '../components/ai/AiAssistant';

export default function Dashboard() {
  const navigate = useNavigate();
  const { showError } = useNotification();
  const { fetchProducts, fetchCategories } = useInventoryStore();
  const { language } = useSettingsStore();
  const { summary, chartsData, recentSales, loadDashboardStats, isLoading: isStatsLoading } = useSalesStore();
  const isEn = language === 'en';

  const [timeFilter, setTimeFilter] = useState('day'); // day, week, month, year
  const [breakdown, setBreakdown] = useState(null);

  function getRangeDates(period) {
    const now = new Date();
    let from, to;
    switch (period) {
      case 'day':
        from = now.toISOString().slice(0, 10);
        to = from;
        break;
      case 'week': {
        const start = new Date(now);
        start.setDate(start.getDate() - start.getDay());
        from = start.toISOString().slice(0, 10);
        to = now.toISOString().slice(0, 10);
        break;
      }
      case 'month':
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        to = now.toISOString().slice(0, 10);
        break;
      case 'year':
        from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
        to = now.toISOString().slice(0, 10);
        break;
      default:
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        to = now.toISOString().slice(0, 10);
    }
    return { from, to };
  }

  const loadData = async (force = false, period) => {
    try {
      const p = period || timeFilter;
      const { from, to } = getRangeDates(p);
      await Promise.all([
        fetchProducts(),
        fetchCategories(),
        loadDashboardStats(force, p),
        getBreakdownApi({ from, to }).then(setBreakdown).catch(() => {})
      ]);
    } catch (err) {
      showError(isEn ? 'Error loading dashboard data' : 'حدث خطأ أثناء تحميل بيانات لوحة التحكم');
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    loadDashboardStats(false, timeFilter);
    const { from, to } = getRangeDates(timeFilter);
    getBreakdownApi({ from, to }).then(setBreakdown).catch(() => {});
  }, [timeFilter]);

  useEffect(() => {
    const handleRefresh = () => {
      loadDashboardStats(true, timeFilter);
      const { from, to } = getRangeDates(timeFilter);
      getBreakdownApi({ from, to }).then(setBreakdown).catch(() => {});
    };
    window.addEventListener('sale-completed', handleRefresh);
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => {
      window.removeEventListener('sale-completed', handleRefresh);
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, [timeFilter]);

  const isInitialLoading = isStatsLoading && summary.totalRevenue === 0;

  return (
    <div className="flex flex-col gap-6 text-right pb-10 pt-6 select-none">
      {/* Page Title Header */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none ${isEn ? 'text-left' : 'text-right'}`}>
        <div className="flex flex-col">
          <h2 className="text-2xl lg:text-3xl font-black text-text-primary">{isEn ? 'Dashboard' : 'لوحة التحكم'}</h2>
          <p className="text-xs font-semibold text-text-secondary mt-1">{isEn ? 'Welcome back, here is what is happening in your store today' : 'مرحباً بك، هذا ما يحدث في متجرك اليوم'}</p>
        </div>
        <div className="text-xs font-black text-accent-primary bg-hover border border-accent-primary/20 px-4 py-2 rounded-xl">
          {isEn ? 'Auto-sync: Active' : 'تحديث تلقائي: نشط'}
        </div>
      </div>

      {/* 1. KPIs Row (4 Cards): Revenue, COGS, Net Profit, Top Product */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <KpiCard
          title={isEn ? 'Total Revenue' : 'إجمالي الإيرادات'}
          value={formatCurrency(breakdown ? breakdown.revenue : summary.totalRevenue)}
          icon={Receipt}
          trendText={breakdown ? `${breakdown.invoice_count} ${isEn ? 'Invoices' : 'فواتير'}` : `${summary.invoiceCount} ${isEn ? 'Invoices' : 'فواتير'}`}
          trendType="up"
          isLoading={isInitialLoading}
          iconColorClass="text-accent-primary bg-active"
        />

        <KpiCard
          title={isEn ? 'Cost of Goods Sold' : 'تكلفة البضاعة المباعة'}
          value={formatCurrency(breakdown ? breakdown.cogs : 0)}
          icon={TrendingDown}
          trendText={breakdown && breakdown.gross_margin_percent > 0 ? `${breakdown.gross_margin_percent}% ${isEn ? 'gross margin' : 'هامش الربح الإجمالي'}` : ''}
          trendType="down"
          isLoading={isInitialLoading}
          iconColorClass="text-status-danger bg-status-danger/10"
        />

        <KpiCard
          title={isEn ? 'Net Profit' : 'صافي الربح'}
          value={formatCurrency(breakdown ? breakdown.net_profit : (summary.netProfit || 0))}
          icon={DollarSign}
          trendText={breakdown ? (breakdown.revenue > 0 ? `${breakdown.net_margin_percent}% ${isEn ? 'net margin' : 'هامش صافي'}` : (breakdown.expenses > 0 ? (isEn ? 'Expenses exceed revenue' : 'مصاريف تفوق الإيرادات') : '')) : (summary.profitMargin > 0 ? `${summary.profitMargin}% ${isEn ? 'margin' : 'هامش صافي'}` : '')}
          trendType={(breakdown ? breakdown.net_profit : summary.netProfit || 0) > 0 ? 'up' : (breakdown ? breakdown.net_profit : summary.netProfit || 0) < 0 ? 'down' : 'neutral'}
          isLoading={isInitialLoading}
          iconColorClass={(breakdown ? breakdown.net_profit : summary.netProfit || 0) > 0 ? 'text-emerald-400 bg-emerald-400/10' : (breakdown ? breakdown.net_profit : summary.netProfit || 0) < 0 ? 'text-red-400 bg-red-400/10' : 'text-sky-400 bg-sky-400/10'}
        />

        <KpiCard
          title={isEn
            ? (timeFilter === 'day' ? 'Top Selling Today' : timeFilter === 'week' ? 'Top This Week' : timeFilter === 'month' ? 'Top This Month' : 'Top This Year')
            : (timeFilter === 'day' ? 'الأكثر مبيعاً اليوم' : timeFilter === 'week' ? 'الأكثر مبيعاً أسبوعياً' : timeFilter === 'month' ? 'الأكثر مبيعاً شهرياً' : 'الأكثر مبيعاً سنوياً')}
          value={breakdown ? (breakdown.top_selling ? breakdown.top_selling.name_ar : summary.topProduct) : summary.topProduct}
          icon={Star}
          trendText={breakdown ? `${breakdown.top_selling ? breakdown.top_selling.units_sold : summary.topProductQty} ${isEn ? 'sold' : 'قطع مباعة'}` : `${summary.topProductQty} ${isEn ? 'sold' : 'قطع مباعة'}`}
          trendType="up"
          isLoading={isInitialLoading}
          iconColorClass="text-status-warning bg-status-warning/10"
        />
      </div>

      {/* 2. Metrics Row (3 Cards): Inventory Value, Expected Profit, Low Stock */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        <KpiCard
          title={isEn ? 'Total Inventory Value' : 'قيمة المخزون'}
          value={formatCurrency(breakdown ? breakdown.inventory_value : summary.totalInventoryValue)}
          icon={DollarSign}
          trendText={isEn ? 'At purchase price' : 'سعر الشراء'}
          trendType="neutral"
          isLoading={isInitialLoading}
          iconColorClass="text-accent-primary bg-active"
        />
        <KpiCard
          title={isEn ? 'Expected Profit' : 'الفائدة المتوقعة'}
          value={formatCurrency(breakdown ? breakdown.expected_inventory_profit : summary.expectedProfit)}
          icon={TrendingUp}
          trendText={isEn ? 'Sale price - Purchase price' : 'سعر البيع - سعر الشراء'}
          trendType="up"
          isLoading={isInitialLoading}
          iconColorClass="text-accent-secondary bg-accent-secondary/10"
        />
        <KpiCard
          title={isEn ? "Items to Reorder" : "منتجات تحتاج إعادة طلب"}
          value={`${summary.lowStockCount} ${isEn ? 'Items' : 'منتج'}`}
          icon={AlertTriangle}
          trendText={isEn ? "View shortages" : "عرض تفاصيل النواقص"}
          trendType="neutral"
          isLoading={isInitialLoading}
          iconColorClass="text-status-warning bg-status-warning/10"
          onClick={() => navigate('/inventory')}
        />
      </div>

      {/* 3. Middle Row: Sales Trend (65%) & Recent Invoices (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Area Chart (65%) */}
        <div className="lg:col-span-2 glass-panel p-4 md:p-6 rounded-2xl border border-medium flex flex-col justify-between min-h-[260px] md:min-h-[380px]">
          <div className="flex items-center justify-between pb-4 border-b border-light">
            {/* Filter buttons */}
            <div className="flex gap-2">
              {['day', 'week', 'month', 'year'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`text-[10px] font-extrabold px-3 py-1.5 rounded-full border transition-all duration-200 ${
                    timeFilter === filter
                      ? 'bg-accent-primary text-on-accent border-accent-primary shadow-accent'
                      : 'border-default text-text-secondary hover:bg-hover hover:text-text-primary'
                  }`}
                >
                  {isEn 
                    ? (filter === 'day' ? 'Day' : filter === 'week' ? 'Week' : filter === 'month' ? 'Month' : 'Year')
                    : (filter === 'day' ? 'يوم' : filter === 'week' ? 'أسبوع' : filter === 'month' ? 'شهر' : 'سنة')}
                </button>
              ))}
            </div>

            {/* Title */}
            <h3 className="text-sm font-extrabold text-text-primary">{isEn ? 'Sales Trend' : 'تطور المبيعات'}</h3>
          </div>

          <div className="mt-4 flex-grow relative">
            {isInitialLoading && (
              <div className="absolute inset-0 bg-subtle/20 animate-pulse rounded-xl z-10" />
            )}
            <AreaChart data={chartsData.salesTrend} xKey="label" yKey="sales" />
          </div>
        </div>

        {/* Recent sales logs (35%) */}
        <div className="glass-panel p-4 md:p-6 rounded-2xl border border-medium flex flex-col justify-between min-h-[260px] md:min-h-[380px]">
          <div className="flex items-center justify-between pb-4 border-b border-light">
            <button
              onClick={() => navigate('/reports')}
              className={`text-[10px] font-extrabold text-accent-primary hover:underline flex items-center gap-1 ${isEn ? 'flex-row-reverse' : ''}`}
            >
              {isEn ? 'View All' : 'عرض الكل'}
              <ArrowRight className={`w-3 h-3 ${isEn ? 'rotate-180' : ''}`} />
            </button>
            <h3 className="text-sm font-extrabold text-text-primary">{isEn ? 'Recent Transactions' : 'آخر العمليات'}</h3>
          </div>

          <div className="flex-grow mt-4 flex flex-col gap-3.5 overflow-y-auto">
            {isInitialLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="h-16 w-full bg-subtle/40 animate-pulse rounded-xl" />
              ))
            ) : recentSales.length === 0 ? (
              <div className="my-auto text-center text-xs text-text-secondary select-none">
                {isEn ? 'No recent transactions today.' : 'لا توجد عمليات مبيعات مسجلة اليوم.'}
              </div>
            ) : (
              recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-subtle border border-light hover:border-accent-primary/20 transition-all cursor-pointer"
                  onClick={() => navigate('/reports')}
                >
                  <span className="text-xs font-black text-accent-primary tracking-tight">
                    {formatCurrency(sale.final_amount)}
                  </span>
                  <div className={`flex flex-col ${isEn ? 'text-left' : 'text-right'}`}>
                    <span className="text-xs font-bold text-text-primary">{sale.invoice_number}</span>
                    <span className="text-[10px] text-text-disabled mt-0.5">
                      {sale.payment_method === 'cash' ? (isEn ? 'Cash' : 'نقداً') : (isEn ? 'Card' : 'بطاقة بنكية')}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-selected border border-accent-primary/20 flex items-center justify-center font-extrabold text-accent-primary text-xs">
                    🛍️
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. Lower Row: Top products (33%) / Category Split (33%) / AI Assistant (33%) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Top products list (33%) */}
        <div className="glass-panel p-4 md:p-6 rounded-2xl border border-medium flex flex-col justify-between min-h-[300px] md:min-h-[450px]">
          <h3 className={`text-sm font-extrabold text-text-primary pb-3 border-b border-light ${isEn ? 'text-left' : ''}`}>
            {isEn
              ? (timeFilter === 'day' ? 'Top Selling Today' : timeFilter === 'week' ? 'Top Selling This Week' : timeFilter === 'month' ? 'Top Selling This Month' : 'Top Selling This Year')
              : (timeFilter === 'day' ? 'الأكثر مبيعاً اليوم' : timeFilter === 'week' ? 'الأكثر مبيعاً هذا الأسبوع' : timeFilter === 'month' ? 'الأكثر مبيعاً هذا الشهر' : 'الأكثر مبيعاً هذه السنة')}
          </h3>

          <div className="flex-grow mt-4 flex flex-col gap-4 overflow-y-auto justify-center">
            {isInitialLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <div className="w-12 h-3 bg-subtle animate-pulse rounded" />
                    <div className="w-24 h-3 bg-subtle animate-pulse rounded" />
                  </div>
                  <div className="h-2 w-full bg-subtle animate-pulse rounded-full" />
                </div>
              ))
            ) : chartsData.topProducts.length === 0 ? (
              <div className="text-center text-xs text-text-secondary">{isEn ? 'Not enough sales data' : 'لا تتوفر مبيعات كافية للتحليل'}</div>
            ) : (
              chartsData.topProducts.map((prod, idx) => (
                <div key={idx} className="flex flex-col gap-1 text-right">
                  <div className={`flex justify-between items-center text-xs font-bold ${isEn ? 'flex-row-reverse' : ''}`}>
                    <span className="text-accent-primary font-black">{prod.sales} {isEn ? 'units' : 'قطع'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-text-primary">{prod.name}</span>
                      <span className="w-5 h-5 rounded-full bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center text-[10px] text-accent-primary font-extrabold">
                        {idx + 1}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-subtle border border-light rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (prod.sales / (chartsData.topProducts[0]?.sales || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Category donut distribution (33%) */}
        <div className="glass-panel p-4 md:p-6 rounded-2xl border border-medium flex flex-col justify-between min-h-[300px] md:min-h-[450px]">
          <h3 className={`text-sm font-extrabold text-text-primary pb-3 border-b border-light ${isEn ? 'text-left' : ''}`}>
            {isEn ? 'Sales by Category' : 'توزيع المبيعات بالفئات'}
          </h3>

          <div className="flex-grow mt-4 flex items-center justify-center relative">
            {isInitialLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 rounded-full border-8 border-subtle animate-pulse" />
              </div>
            )}
            {chartsData.categorySplit.length === 0 && !isInitialLoading ? (
              <div className="text-center text-xs text-text-secondary my-auto">{isEn ? 'No category data' : 'لا تتوفر بيانات للتقسيم'}</div>
            ) : (
              <DonutChart data={chartsData.categorySplit} />
            )}
          </div>
        </div>

        {/* AI Assistant (33%) */}
        <div className="lg:col-span-1 md:col-span-2">
          <AiAssistant />
        </div>
      </div>
    </div>
  );
}
