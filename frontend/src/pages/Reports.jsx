import React, { useEffect, useState } from 'react';
import { getReportsSummaryApi, getReportsChartsApi } from '../api/reports.api';
import { getSalesApi } from '../api/sales.api';
import useNotification from '../hooks/useNotification';
import useSettingsStore from '../store/useSettingsStore';
import formatCurrency from '../utils/formatCurrency';
import formatDate from '../utils/formatDate';
import {
  FileSpreadsheet,
  FileDown,
  Calendar,
  DollarSign,
  TrendingUp,
  Percent,
  Clock,
  Shirt,
  ClipboardList
} from 'lucide-react';

import KpiCard from '../components/ui/KpiCard';
import BarChart from '../components/charts/BarChart';
import DonutChart from '../components/charts/DonutChart';
import DataTable from '../components/ui/DataTable';

export default function Reports() {
  const { showSuccess, showError } = useNotification();
  const { language } = useSettingsStore();
  const isEn = language === 'en';
  
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('month'); // today, week, month, year
  const [activeTab, setActiveTab] = useState('invoices'); // invoices, products, returns

  // Summary KPIs & Charts state
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    netProfit: 0,
    profitMargin: 0,
    avgInvoice: 0,
    lowStockCount: 0,
    topProduct: 'لا يوجد',
    invoiceCount: 0
  });

  const [chartsData, setChartsData] = useState({
    salesTrend: [],
    categorySplit: [],
    topProducts: [],
    financialTimeline: []
  });

  const [salesLogs, setSalesLogs] = useState([]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const sumRes = await getReportsSummaryApi(period);
      setSummary(sumRes);

      const chartsRes = await getReportsChartsApi(period);
      setChartsData(chartsRes);

      const logsRes = await getSalesApi(period);
      setSalesLogs(logsRes);
    } catch (e) {
      showError(isEn ? 'Failed to load reports and analytics' : 'فشل تحميل التقارير والتحليلات');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [period]);

  useEffect(() => {
    const handleNewSale = () => loadReports();
    window.addEventListener('sale-completed', handleNewSale);
    window.addEventListener('dashboard-refresh', handleNewSale);
    return () => {
      window.removeEventListener('sale-completed', handleNewSale);
      window.removeEventListener('dashboard-refresh', handleNewSale);
    };
  }, [period]);

  const handleExportPDF = () => {
    // This previously relied on a Node.js backend to generate HTML
    // With Supabase, we would implement a client-side PDF generation like jspdf
    showError(isEn ? 'PDF Export is not yet implemented for the serverless version' : 'تصدير PDF غير مفعل حالياً في النسخة السحابية');
  };

  return (
    <div className={`flex flex-col gap-6 pb-10 pt-6 select-none ${isEn ? 'text-left' : 'text-right'}`}>
      
      {/* Header bar */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print ${isEn ? 'flex-row-reverse' : ''}`}>
        <div className="flex flex-col">
          <h2 className="text-2xl lg:text-3xl font-black text-text-primary">{isEn ? 'Financial Reports & Analytics' : 'التقارير والتحليلات المالية'}</h2>
          <p className="text-xs font-semibold text-text-secondary mt-1">
            {isEn ? 'Monitor net profits, expenses, and business performance KPIs' : 'مراقبة الأرباح الصافية، النفقات، ومؤشرات الأداء التجاري'}
          </p>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={handleExportPDF}
            className={`h-11 px-4 text-xs font-bold bg-bg-card border border-default text-accent-primary rounded-xl hover:bg-hover flex items-center gap-2 focus:outline-none ${isEn ? 'flex-row-reverse' : ''}`}
          >
            <FileDown className="w-4.5 h-4.5" />
            {isEn ? 'Export PDF Report' : 'تصدير تقرير PDF'}
          </button>
        </div>
      </div>

      {/* Period select bar */}
      <div className={`glass-panel p-5 rounded-2xl border border-medium flex items-center justify-between no-print ${isEn ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 ${isEn ? 'flex-row-reverse' : ''}`}>
          {['today', 'week', 'month', 'year'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs font-black px-4 py-2 rounded-xl transition-all ${
                period === p
                  ? 'bg-accent-primary text-on-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {isEn 
                ? (p === 'today' ? 'Today' : p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'Year')
                : (p === 'today' ? 'اليوم' : p === 'week' ? 'أسبوع' : p === 'month' ? 'شهر' : 'سنة')}
            </button>
          ))}
        </div>

        <div className={`flex items-center gap-2.5 text-xs font-bold text-text-secondary ${isEn ? 'flex-row-reverse' : ''}`}>
          <span>{isEn ? 'Time Period Filter' : 'تصفية الفترة الزمنية'}</span>
          <Calendar className="w-4.5 h-4.5 text-accent-primary" />
        </div>
      </div>

      {/* 1. Statistics Summary cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 ${isEn ? 'dir-ltr' : ''}`}>
        <KpiCard
          title={isEn ? "Total Revenue" : "إجمالي الإيرادات"}
          value={formatCurrency(summary.totalRevenue)}
          icon={DollarSign}
          trendText={isEn ? "+12.5% from last month" : "+12.5% عن الشهر السابق"}
          trendType="up"
          iconColorClass="text-accent-primary bg-active"
        />

        <KpiCard
          title={isEn ? "Net Profit" : "صافي الأرباح"}
          value={formatCurrency(summary.netProfit)}
          icon={TrendingUp}
          trendText={isEn ? `Profit Margin: ${summary.profitMargin}%` : `معدل الربح: ${summary.profitMargin}%`}
          trendType="up"
          iconColorClass="text-accent-secondary bg-accent-secondary/10"
        />

        <KpiCard
          title={isEn ? "Avg Invoice Value" : "متوسط قيمة الفاتورة"}
          value={formatCurrency(summary.avgInvoice)}
          icon={Percent}
          trendText={isEn ? "Per customer average" : "معدل الزبون الواحد"}
          trendType="neutral"
          iconColorClass="text-status-warning bg-status-warning/10"
        />

        <KpiCard
          title={isEn ? "Total Invoices" : "عدد الفواتير الكلي"}
          value={`${summary.invoiceCount} ${isEn ? 'Invoices' : 'فاتورة'}`}
          icon={ClipboardList}
          trendText={isEn ? "Successfully completed" : "تمت بنجاح"}
          trendType="neutral"
          iconColorClass="text-accent-primary bg-active"
        />
      </div>

      {/* 2. Charts central section */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${isEn ? 'dir-ltr' : ''}`}>
        {/* Revenues vs Expenses (2/3 width) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-medium flex flex-col justify-between min-h-[380px]">
          <h3 className={`text-sm font-extrabold text-text-primary pb-3 border-b border-light mb-4 ${isEn ? 'text-left' : ''}`}>
            {isEn ? 'Revenue, Expenses & Net Profit Analysis' : 'تحليل الإيرادات والنفقات وصافي الربح'}
          </h3>
          <div className="flex-grow">
            <BarChart data={chartsData.financialTimeline} />
          </div>
        </div>

        {/* Categories Split (1/3 width) */}
        <div className="glass-panel p-6 rounded-2xl border border-medium flex flex-col justify-between min-h-[380px]">
          <h3 className={`text-sm font-extrabold text-text-primary pb-3 border-b border-light mb-4 ${isEn ? 'text-left' : ''}`}>
            {isEn ? 'Sales by Category' : 'توزيع مبيعات الأقسام'}
          </h3>
          <div className="flex-grow flex items-center justify-center">
            {chartsData.categorySplit.length === 0 ? (
              <div className="text-xs text-text-secondary">{isEn ? 'No data available' : 'لا توجد بيانات'}</div>
            ) : (
              <DonutChart data={chartsData.categorySplit} />
            )}
          </div>
        </div>
      </div>

      {/* 3. Bottom Tabs and Details Table */}
      <div className="glass-panel rounded-2xl border border-medium overflow-hidden no-print">
        {/* Tabs switcher header */}
        <div className={`flex items-center justify-between border-b border-light bg-bg-secondary select-none px-6 ${isEn ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-6 ${isEn ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-4 text-xs font-black border-b-2 transition-all relative ${
                activeTab === 'invoices'
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {isEn ? 'Issued Invoices Log' : 'سجل الفواتير الصادرة'}
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 text-xs font-black border-b-2 transition-all relative ${
                activeTab === 'products'
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {isEn ? 'Top Selling Products' : 'المنتجات الأكثر مبيعاً'}
            </button>
            <button
              onClick={() => setActiveTab('returns')}
              className={`py-4 text-xs font-black border-b-2 transition-all relative ${
                activeTab === 'returns'
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {isEn ? 'Returns & Refunds Log' : 'سجل المرتجعات والمستردات'}
            </button>
          </div>

          <span className="text-xs font-extrabold text-text-primary">{isEn ? 'Operations Records & Details' : 'سجلات وتفاصيل العمليات'}</span>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'invoices' && (
            <DataTable
              headers={isEn 
                ? ['Invoice #', 'Date & Time', 'Payment Method', 'Total Amount']
                : ['المبلغ الإجمالي', 'طريقة الدفع', 'التاريخ والوقت', 'رقم الفاتورة']
              }
              data={salesLogs}
              isLoading={isLoading}
              renderRow={(sale) => (
                <tr key={sale.id} className={`hover:bg-subtle transition-colors text-xs font-bold ${isEn ? 'text-left' : ''}`}>
                  {isEn ? (
                    <>
                      <td className="p-4 text-text-primary">{sale.invoice_number}</td>
                      <td className="p-4 text-text-disabled">{formatDate(sale.created_at)}</td>
                      <td className="p-4 text-text-secondary">{sale.payment_method === 'cash' ? 'Cash' : 'Card'}</td>
                      <td className="p-4 text-accent-primary font-black">{formatCurrency(sale.final_amount)}</td>
                    </>
                  ) : (
                    <>
                      <td className="p-4 text-accent-primary font-black">{formatCurrency(sale.final_amount)}</td>
                      <td className="p-4 text-text-secondary">{sale.payment_method === 'cash' ? 'نقداً' : 'بطاقة بنكية'}</td>
                      <td className="p-4 text-text-disabled">{formatDate(sale.created_at)}</td>
                      <td className="p-4 text-text-primary">{sale.invoice_number}</td>
                    </>
                  )}
                </tr>
              )}
            />
          )}

          {activeTab === 'products' && (
            <DataTable
              headers={isEn 
                ? ['Product Name', 'Quantity Sold']
                : ['الكمية المباعة', 'اسم المنتج المبيع']
              }
              data={chartsData.topProducts}
              isLoading={isLoading}
              renderRow={(prod, idx) => (
                <tr key={idx} className={`hover:bg-subtle transition-colors text-xs font-bold ${isEn ? 'text-left' : ''}`}>
                  {isEn ? (
                    <>
                      <td className="p-4 text-text-primary">{prod.name}</td>
                      <td className="p-4 text-accent-primary font-black">{prod.sales} sold</td>
                    </>
                  ) : (
                    <>
                      <td className="p-4 text-accent-primary font-black">{prod.sales} قطع مباعة</td>
                      <td className="p-4 text-text-primary">{prod.name}</td>
                    </>
                  )}
                </tr>
              )}
            />
          )}

          {activeTab === 'returns' && (
            <DataTable
              headers={isEn 
                ? ['Original Invoice #', 'Return Reason', 'Return Date', 'Refunded Amount']
                : ['القيمة المستردة', 'تاريخ الارتجاع', 'سبب الارتجاع', 'رقم فاتورة المرجع']
              }
              data={[]} // Simulated empty returns list
              isLoading={isLoading}
              emptyMessage={isEn ? "The returns and refunds log is completely empty" : "سجل المرتجعات فارغ تماماً حالياً"}
              renderRow={() => null}
            />
          )}
        </div>
      </div>
    </div>
  );
}
