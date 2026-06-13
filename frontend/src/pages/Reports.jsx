import React, { useEffect, useState } from 'react';
import { getReportsSummaryApi, getReportsChartsApi } from '../api/reports.api';
import { getSalesApi, getSaleByIdApi, deleteSaleApi, deleteSaleItemApi } from '../api/sales.api';
import { getProductsApi } from '../api/products.api';
import { getExpensesSummary } from '../api/expenses.api';
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
  ClipboardList,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  ImageIcon
} from 'lucide-react';

import KpiCard from '../components/ui/KpiCard';
import BarChart from '../components/charts/BarChart';
import DonutChart from '../components/charts/DonutChart';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function Reports() {
  const { showSuccess, showError } = useNotification();
  const { language } = useSettingsStore();
  const isEn = language === 'en';
  
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('today'); // today, week, month, year
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

  const [sales, setSales] = useState([]);
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [productsMap, setProductsMap] = useState({});
  const [expandedSaleId, setExpandedSaleId] = useState(null);
  const [detailModalSale, setDetailModalSale] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, saleId: null });
  const [deleteItemConfirm, setDeleteItemConfirm] = useState({ isOpen: false, saleId: null, itemId: null });
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const sumRes = await getReportsSummaryApi(period);
      setSummary(sumRes);

      const chartsRes = await getReportsChartsApi(period);
      setChartsData(chartsRes);

      const logsRes = await getSalesApi(period);
      setSales(logsRes);

      const now = new Date();
      const expSum = await getExpensesSummary(now.getFullYear(), now.getMonth() + 1).catch(() => null);
      setExpenseSummary(expSum);

      const products = await getProductsApi();
      const map = {};
      for (const p of products) map[p.id] = p;
      setProductsMap(map);
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

  const handleDeleteSale = async () => {
    const saleId = deleteConfirm.saleId;
    if (!saleId) return;
    console.log('[Reports.handleDelete] Deleting sale:', saleId);
    if (deletingId) {
      console.log('Delete already in progress');
      return;
    }
    setDeletingId(saleId);
    setDeleteConfirm({ isOpen: false, saleId: null });
    try {
      await deleteSaleApi(saleId);
      setSales(prev => prev.filter(s => s.id !== saleId));
      showSuccess(isEn ? 'Sale deleted successfully' : 'تم حذف الفاتورة بنجاح');
      loadReports();
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('404')) {
        setSales(prev => prev.filter(s => s.id !== saleId));
        showSuccess(isEn ? 'Sale already deleted' : 'الفاتورة محذوفة بالفعل');
      } else {
        showError(err.message || (isEn ? 'Failed to delete sale' : 'فشل حذف الفاتورة'));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const toggleExpandSale = (saleId) => {
    setExpandedSaleId(prev => prev === saleId ? null : saleId);
  };

  const handleDeleteItem = async () => {
    const { saleId, itemId } = deleteItemConfirm;
    if (!saleId || !itemId || isDeletingItem) return;
    setIsDeletingItem(true);
    setDeleteItemConfirm({ isOpen: false, saleId: null, itemId: null });
    try {
      await deleteSaleItemApi(saleId, itemId);
      const updated = await getSaleByIdApi(saleId);
      setDetailModalSale(updated);
      showSuccess(isEn ? 'Item deleted successfully' : 'تم حذف الصنف بنجاح');
      loadReports();
    } catch (err) {
      showError(err.message || (isEn ? 'Failed to delete item' : 'فشل حذف الصنف'));
    } finally {
      setIsDeletingItem(false);
    }
  };

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
                ? ['', 'Invoice #', 'Date & Time', 'Payment Method', 'Total Amount', 'Actions']
                : ['العمليات', 'المبلغ الإجمالي', 'طريقة الدفع', 'التاريخ والوقت', 'رقم الفاتورة', '']
              }
              data={sales}
              isLoading={isLoading}
              renderRow={(sale) => (
                <React.Fragment key={sale.id}>
                  <tr className={`hover:bg-subtle transition-colors text-xs font-bold ${isEn ? 'text-left' : ''}`}>
                    {isEn ? (
                      <>
                        <td className="p-2 md:p-4 text-center">
                          <button
                            onClick={() => toggleExpandSale(sale.id)}
                            className="p-1.5 rounded-lg hover:bg-hover text-text-disabled hover:text-accent-primary transition-all"
                          >
                            {expandedSaleId === sale.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="p-2 md:p-4 text-text-primary">{sale.invoice_number}</td>
                        <td className="p-2 md:p-4 text-text-disabled">{formatDate(sale.created_at)}</td>
                        <td className="p-2 md:p-4 text-text-secondary">{sale.payment_method === 'cash' ? 'Cash' : 'Card'}</td>
                        <td className="p-2 md:p-4 text-accent-primary font-black">{formatCurrency(sale.final_amount)}</td>
                        <td className="p-2 md:p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={async () => {
                                try {
                                  const detailed = await getSaleByIdApi(sale.id);
                                  setDetailModalSale(detailed);
                                } catch (e) {
                                  setDetailModalSale(sale);
                                }
                              }}
                              className="p-1.5 md:p-2 rounded-lg bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-all"
                              title={isEn ? 'View Details' : 'عرض التفاصيل'}
                            >
                              <Eye className="w-3.5 md:w-4 h-3.5 md:h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ isOpen: true, saleId: sale.id })}
                              className="p-1.5 md:p-2 rounded-lg bg-status-danger/10 text-status-danger hover:bg-status-danger/20 transition-all"
                              title={isEn ? 'Delete Sale' : 'حذف الفاتورة'}
                            >
                              <Trash2 className="w-3.5 md:w-4 h-3.5 md:h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-2 md:p-4 text-center">
                          <button
                            onClick={() => setDeleteConfirm({ isOpen: true, saleId: sale.id })}
                            className="p-1.5 md:p-2 rounded-lg bg-status-danger/10 text-status-danger hover:bg-status-danger/20 transition-all"
                            title={isEn ? 'Delete Sale' : 'حذف الفاتورة'}
                          >
                            <Trash2 className="w-3.5 md:w-4 h-3.5 md:h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const detailed = await getSaleByIdApi(sale.id);
                                setDetailModalSale(detailed);
                              } catch (e) {
                                setDetailModalSale(sale);
                              }
                            }}
                            className="p-1.5 md:p-2 rounded-lg bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-all"
                            title={isEn ? 'View Details' : 'عرض التفاصيل'}
                          >
                            <Eye className="w-3.5 md:w-4 h-3.5 md:h-4" />
                          </button>
                          <button
                            onClick={() => toggleExpandSale(sale.id)}
                            className="p-1.5 rounded-lg hover:bg-hover text-text-disabled hover:text-accent-primary transition-all"
                          >
                            {expandedSaleId === sale.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="p-2 md:p-4 text-accent-primary font-black">{formatCurrency(sale.final_amount)}</td>
                        <td className="p-2 md:p-4 text-text-secondary">{sale.payment_method === 'cash' ? 'نقداً' : 'بطاقة بنكية'}</td>
                        <td className="p-2 md:p-4 text-text-disabled">{formatDate(sale.created_at)}</td>
                        <td className="p-2 md:p-4 text-text-primary">{sale.invoice_number}</td>
                        <td className="p-2 md:p-4 text-center"></td>
                      </>
                    )}
                  </tr>
                  {expandedSaleId === sale.id && (
                    <tr className="bg-subtle/50 border-t border-light">
                      <td colSpan={isEn ? 7 : 7} className="p-4">
                        <div className={`flex flex-col gap-3 ${isEn ? 'text-left' : 'text-right'}`}>
                          <h4 className="text-xs font-black text-text-primary">
                            {isEn ? 'Sale Items' : 'تفاصيل الأصناف المباعة'}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {(sale.items || []).map((item, idx) => {
                              const product = productsMap[item.product_id];
                              return (
                                <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl bg-bg-primary border border-medium ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                                  <div className="w-10 h-10 rounded-lg bg-selected border border-light flex items-center justify-center overflow-hidden shrink-0">
                                    {product?.image_url ? (
                                      <img src={product.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                                    ) : (
                                      <ImageIcon className="w-4 h-4 text-text-disabled" />
                                    )}
                                  </div>
                                  <div className={`flex-1 min-w-0 ${isEn ? 'text-left' : 'text-right'}`}>
                                    <p className="text-xs font-bold text-text-primary truncate">{item.product_name}</p>
                                    <p className="text-[10px] font-semibold text-text-disabled">
                                      {isEn
                                        ? `${item.quantity} x ${formatCurrency(item.unit_price)} = ${formatCurrency(item.total_price)}`
                                        : `${formatCurrency(item.unit_price)} × ${item.quantity} = ${formatCurrency(item.total_price)}`}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, saleId: null })}
        title={isEn ? 'Delete Sale' : 'حذف الفاتورة'}
        message={isEn
          ? 'Are you sure you want to delete this sale? This action cannot be undone.'
          : 'هل أنت متأكد من حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.'}
        confirmLabel={isEn ? 'Delete' : 'حذف'}
        isLoading={!!deletingId}
        onConfirm={handleDeleteSale}
        variant="danger"
      />

      {/* Item delete confirmation */}
      <ConfirmModal
        isOpen={deleteItemConfirm.isOpen}
        onClose={() => setDeleteItemConfirm({ isOpen: false, saleId: null, itemId: null })}
        title={isEn ? 'Delete Item' : 'حذف الصنف'}
        message={isEn
          ? 'Are you sure you want to delete this item from the invoice?'
          : 'هل أنت متأكد من حذف هذا الصنف من الفاتورة؟'}
        confirmLabel={isEn ? 'Delete' : 'حذف'}
        isLoading={isDeletingItem}
        onConfirm={handleDeleteItem}
        variant="danger"
      />

      {/* Sale Detail Modal */}
      <Modal
        isOpen={!!detailModalSale}
        onClose={() => setDetailModalSale(null)}
        title={detailModalSale ? (isEn
          ? `Invoice ${detailModalSale.invoice_number}`
          : `الفاتورة ${detailModalSale.invoice_number}`) : ''}
        size="lg"
        footer={
          <div className="flex justify-end px-6 py-3">
            <button
              onClick={() => setDetailModalSale(null)}
              className="h-11 px-5 text-xs font-extrabold rounded-xl bg-accent-primary text-on-accent hover:brightness-110 active:scale-[0.95] transition-all"
            >
              {isEn ? 'Close' : 'إغلاق'}
            </button>
          </div>
        }
      >
        {detailModalSale && (
          <div className={`flex flex-col gap-5 ${isEn ? 'text-left' : 'text-right'}`}>
            {/* Sale header info */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-subtle border border-medium">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-text-disabled">{isEn ? 'Invoice Number' : 'رقم الفاتورة'}</span>
                <span className="text-sm font-black text-text-primary">{detailModalSale.invoice_number}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-text-disabled">{isEn ? 'Date & Time' : 'التاريخ والوقت'}</span>
                <span className="text-sm font-black text-text-primary">{formatDate(detailModalSale.created_at)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-text-disabled">{isEn ? 'Payment Method' : 'طريقة الدفع'}</span>
                <span className="text-sm font-black text-text-primary">
                  {detailModalSale.payment_method === 'cash'
                    ? (isEn ? 'Cash' : 'نقداً')
                    : (isEn ? 'Card' : 'بطاقة بنكية')}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-text-disabled">{isEn ? 'Customer' : 'الزبون'}</span>
                <span className="text-sm font-black text-text-primary">
                  {detailModalSale.customer_id ? `#${detailModalSale.customer_id}` : (isEn ? 'Walk-in' : 'مباشر')}
                </span>
              </div>
            </div>

            {/* Amount breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-bg-primary border border-medium">
                <span className="text-[10px] font-bold text-text-disabled">{isEn ? 'Total' : 'الإجمالي'}</span>
                <span className="text-sm font-black text-text-primary">{formatCurrency(detailModalSale.total_amount)}</span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-bg-primary border border-medium">
                <span className="text-[10px] font-bold text-text-disabled">{isEn ? 'Discount' : 'الخصم'}</span>
                <span className="text-sm font-black text-status-danger">{formatCurrency(detailModalSale.discount_amount)}</span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-bg-primary border border-medium">
                <span className="text-[10px] font-bold text-text-disabled">{isEn ? 'Final Amount' : 'الصافي'}</span>
                <span className="text-sm font-black text-accent-primary">{formatCurrency(detailModalSale.final_amount)}</span>
              </div>
            </div>

            {/* Items */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-black text-text-primary">
                {isEn ? 'Sold Items' : 'الأصناف المباعة'}
                <span className="text-text-disabled font-bold mr-1">({(detailModalSale.items || []).length})</span>
              </h4>
              <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
                {(detailModalSale.items || []).map((item, idx) => {
                  const product = productsMap[item.product_id];
                  return (
                    <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl bg-subtle border border-medium ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                      <div className="w-12 h-12 rounded-xl bg-selected border border-light flex items-center justify-center overflow-hidden shrink-0">
                        {product?.image_url ? (
                          <img src={product.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-text-disabled" />
                        )}
                      </div>
                      <div className={`flex-1 min-w-0 ${isEn ? 'text-left' : 'text-right'}`}>
                        <p className="text-xs font-black text-text-primary">{item.product_name}</p>
                        <div className={`flex items-center gap-3 mt-0.5 text-[10px] font-bold ${isEn ? '' : 'flex-row-reverse'}`}>
                          <span className="text-text-disabled">
                            {isEn
                              ? `Qty: ${item.quantity}`
                              : `الكمية: ${item.quantity}`}
                          </span>
                          <span className="text-text-disabled">
                            {isEn
                              ? `Unit: ${formatCurrency(item.unit_price)}`
                              : `الوحدة: ${formatCurrency(item.unit_price)}`}
                          </span>
                          <span className="text-accent-primary">
                            {isEn
                              ? `Total: ${formatCurrency(item.total_price)}`
                              : `المجموع: ${formatCurrency(item.total_price)}`}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setDeleteItemConfirm({ isOpen: true, saleId: detailModalSale.id, itemId: item.id })}
                        className="p-1.5 rounded-lg bg-status-danger/10 text-status-danger hover:bg-status-danger/20 transition-all shrink-0"
                        title={isEn ? 'Delete Item' : 'حذف الصنف'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {detailModalSale.notes && (
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-status-warning/5 border border-status-warning/20">
                <span className="text-[10px] font-bold text-status-warning">
                  {isEn ? 'Notes' : 'ملاحظات'}
                </span>
                <span className="text-xs font-semibold text-text-primary">{detailModalSale.notes}</span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
