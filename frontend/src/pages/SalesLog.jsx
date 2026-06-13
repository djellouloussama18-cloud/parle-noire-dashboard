import React, { useEffect, useState } from 'react';
import { getSalesApi, getSaleByIdApi, deleteSaleApi, deleteSaleItemApi } from '../api/sales.api';
import useNotification from '../hooks/useNotification';
import useSettingsStore from '../store/useSettingsStore';
import formatCurrency from '../utils/formatCurrency';
import formatDate from '../utils/formatDate';
import {
  Trash2, Eye, Calendar, FileText, CreditCard, ImageIcon,
  ChevronDown, ChevronUp, ShoppingBag, User, Search
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function SalesLog() {
  const { showSuccess, showError } = useNotification();
  const { language } = useSettingsStore();
  const isEn = language === 'en';

  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [sales, setSales] = useState([]);
  const [expandedSaleId, setExpandedSaleId] = useState(null);
  const [detailModalSale, setDetailModalSale] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, sale: null });
  const [deleteItemConfirm, setDeleteItemConfirm] = useState({ isOpen: false, saleId: null, itemId: null });
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  const loadSales = async () => {
    setIsLoading(true);
    try {
      const p = period === 'all' ? undefined : period;
      const data = await getSalesApi(p);
      setSales(data);
    } catch (e) {
      showError(isEn ? 'Failed to load sales log' : 'فشل تحميل سجل الفواتير');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [period]);

  useEffect(() => {
    const handleRefresh = () => loadSales();
    window.addEventListener('sale-completed', handleRefresh);
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => {
      window.removeEventListener('sale-completed', handleRefresh);
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, [period]);

  const allProductsShown = (items) => {
    const shown = items.slice(0, 3);
    const extra = items.length - 3;
    return { shown, extra };
  };

  const handleDelete = async () => {
    const sale = deleteConfirm.sale;
    if (!sale) return;
    setIsDeleting(true);
    try {
      await deleteSaleApi(sale.id);
      showSuccess(isEn ? 'Sale deleted successfully' : 'تم حذف الفاتورة بنجاح');
      setDeleteConfirm({ isOpen: false, sale: null });
      loadSales();
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    } catch (err) {
      showError(err.message || (isEn ? 'Failed to delete sale' : 'فشل حذف الفاتورة'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteItem = async () => {
    const { saleId, itemId } = deleteItemConfirm;
    if (!saleId || !itemId) return;
    setIsDeletingItem(true);
    setDeleteItemConfirm({ isOpen: false, saleId: null, itemId: null });
    try {
      await deleteSaleItemApi(saleId, itemId);
      const updated = await getSaleByIdApi(saleId);
      setDetailModalSale(updated);
      showSuccess(isEn ? 'Item deleted successfully' : 'تم حذف الصنف بنجاح');
      loadSales();
    } catch (err) {
      showError(err.message || (isEn ? 'Failed to delete item' : 'فشل حذف الصنف'));
    } finally {
      setIsDeletingItem(false);
    }
  };

  const periods = [
    { key: 'all', ar: 'الكل', en: 'All' },
    { key: 'today', ar: 'اليوم', en: 'Today' },
    { key: 'week', ar: 'أسبوع', en: 'Week' },
    { key: 'month', ar: 'شهر', en: 'Month' },
    { key: 'year', ar: 'سنة', en: 'Year' },
  ];

  return (
    <div className={`flex flex-col gap-6 pb-10 pt-6 select-none ${isEn ? 'text-left' : 'text-right'}`}>

      {/* Header */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print ${isEn ? 'flex-row-reverse' : ''}`}>
        <div className="flex flex-col">
          <h2 className="text-2xl lg:text-3xl font-black text-text-primary">
            {isEn ? 'Sales Log' : 'سجل الفواتير'}
          </h2>
          <p className="text-xs font-semibold text-text-secondary mt-1">
            {isEn ? 'View all issued invoices with product details' : 'عرض جميع الفواتير الصادرة مع تفاصيل المنتجات'}
          </p>
        </div>
      </div>

      {/* Period filter */}
      <div className={`glass-panel p-5 rounded-2xl border border-medium flex items-center justify-between no-print ${isEn ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 ${isEn ? 'flex-row-reverse' : ''}`}>
          {periods.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`text-xs font-black px-4 py-2 rounded-xl transition-all ${
                period === p.key
                  ? 'bg-accent-primary text-on-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {isEn ? p.en : p.ar}
            </button>
          ))}
        </div>
        <div className={`flex items-center gap-2 text-xs font-bold text-text-secondary ${isEn ? 'flex-row-reverse' : ''}`}>
          <Calendar className="w-4 h-4 text-accent-primary" />
          <span>{isEn ? 'Filter by period' : 'تصفية حسب الفترة'}</span>
        </div>
      </div>

      {/* Sales cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-semibold text-text-secondary">
              {isEn ? 'Loading sales...' : 'جاري تحميل الفواتير...'}
            </span>
          </div>
        </div>
      ) : sales.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-medium p-12 flex flex-col items-center justify-center gap-3">
          <FileText className="w-10 h-10 text-text-disabled" />
          <span className="text-sm font-bold text-text-secondary">
            {isEn ? 'No invoices found for this period' : 'لا توجد فواتير في هذه الفترة'}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sales.map(sale => {
            const items = sale.items || [];
            const { shown, extra } = allProductsShown(items);

            return (
              <div
                key={sale.id}
                className={`glass-panel rounded-2xl border border-medium overflow-hidden transition-all duration-200 ${
                  expandedSaleId === sale.id ? 'ring-1 ring-accent-primary/30' : ''
                }`}
              >
                {/* Card header - always visible */}
                <div
                  className={`p-4 md:p-5 flex items-start gap-3 cursor-pointer hover:bg-subtle/50 transition-colors ${isEn ? 'flex-row' : 'flex-row-reverse'}`}
                  onClick={() => setExpandedSaleId(prev => prev === sale.id ? null : sale.id)}
                >
                  {/* Invoice icon */}
                  <div className="w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-accent-primary" />
                  </div>

                  {/* Info */}
                  <div className={`flex-1 min-w-0 ${isEn ? 'text-left' : 'text-right'}`}>
                    <div className={`flex items-center gap-2 flex-wrap ${isEn ? '' : 'flex-row-reverse'}`}>
                      <span className="text-sm font-black text-text-primary">{sale.invoice_number}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-bg-card border border-light text-text-disabled">
                        {sale.payment_method === 'cash'
                          ? (isEn ? 'Cash' : 'نقداً')
                          : (isEn ? 'Card' : 'بطاقة')}
                      </span>
                    </div>
                    <div className={`flex items-center gap-3 mt-1 text-[11px] font-semibold text-text-disabled flex-wrap ${isEn ? '' : 'flex-row-reverse'}`}>
                      <span>{formatDate(sale.created_at)}</span>
                      {sale.customer_id && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {isEn ? `Customer #${sale.customer_id}` : `عميل #${sale.customer_id}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount + actions */}
                  <div className={`flex items-center gap-2 shrink-0 ${isEn ? 'flex-row-reverse' : ''}`}>
                    <div className="text-right">
                      <div className="text-base font-black text-accent-primary">{formatCurrency(sale.final_amount)}</div>
                      <div className="text-[10px] font-bold text-text-disabled">{isEn ? 'Total' : 'الإجمالي'}</div>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const detailed = await getSaleByIdApi(sale.id);
                          setDetailModalSale(detailed);
                        } catch (err) {
                          setDetailModalSale(sale);
                        }
                      }}
                      className="p-2 rounded-lg bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-all"
                      title={isEn ? 'View Details' : 'عرض التفاصيل'}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ isOpen: true, sale }); }}
                      className="p-2 rounded-lg bg-status-danger/10 text-status-danger hover:bg-status-danger/20 transition-all"
                      title={isEn ? 'Delete Sale' : 'حذف الفاتورة'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpandedSaleId(prev => prev === sale.id ? null : sale.id); }}
                      className="p-2 rounded-lg hover:bg-hover text-text-disabled hover:text-accent-primary transition-all"
                    >
                      {expandedSaleId === sale.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Product preview strip (collapsed state) */}
                {expandedSaleId !== sale.id && items.length > 0 && (
                  <div className={`px-4 md:px-5 pb-4 flex items-center gap-2 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                    {shown.map((item, idx) => (
                      <div key={idx} className={`flex items-center gap-2 p-1.5 rounded-xl bg-bg-card border border-light ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                        <div className="w-8 h-8 rounded-lg bg-selected border border-light flex items-center justify-center overflow-hidden shrink-0">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5 text-text-disabled" />
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-text-primary truncate max-w-[80px]">{item.product_name}</span>
                        <span className="text-[10px] font-semibold text-text-disabled shrink-0">×{item.quantity}</span>
                      </div>
                    ))}
                    {extra > 0 && (
                      <div className="text-[10px] font-bold text-text-disabled px-2 py-1 rounded-lg bg-bg-card border border-light">
                        {isEn ? `+${extra} more items` : `+${extra} منتجات أخرى`}
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded content */}
                {expandedSaleId === sale.id && (
                  <div className="border-t border-light bg-subtle/30">
                    <div className={`p-4 md:p-5 flex flex-col gap-4 ${isEn ? 'text-left' : 'text-right'}`}>
                      {/* Summary row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="flex flex-col gap-1 p-3 rounded-xl bg-bg-card border border-medium">
                          <span className="text-[10px] font-bold text-text-disabled">{isEn ? 'Subtotal' : 'المجموع'}</span>
                          <span className="text-sm font-black text-text-primary">{formatCurrency(sale.total_amount)}</span>
                        </div>
                        <div className="flex flex-col gap-1 p-3 rounded-xl bg-bg-card border border-medium">
                          <span className="text-[10px] font-bold text-text-disabled">{isEn ? 'Discount' : 'الخصم'}</span>
                          <span className="text-sm font-black text-status-danger">{formatCurrency(sale.discount_amount)}</span>
                        </div>
                        <div className="flex flex-col gap-1 p-3 rounded-xl bg-bg-card border border-medium">
                          <span className="text-[10px] font-bold text-text-disabled">{isEn ? 'Tax' : 'الضريبة'}</span>
                          <span className="text-sm font-black text-text-primary">{formatCurrency(sale.tax_amount)}</span>
                        </div>
                        <div className="flex flex-col gap-1 p-3 rounded-xl bg-bg-card border border-medium">
                          <span className="text-[10px] font-bold text-text-disabled">{isEn ? 'Final' : 'الصافي'}</span>
                          <span className="text-sm font-black text-accent-primary">{formatCurrency(sale.final_amount)}</span>
                        </div>
                      </div>

                      {/* Notes */}
                      {sale.notes && (
                        <div className="p-3 rounded-xl bg-status-warning/5 border border-status-warning/20">
                          <span className="text-[10px] font-bold text-status-warning">
                            {isEn ? 'Notes' : 'ملاحظات'}
                          </span>
                          <p className="text-xs font-semibold text-text-primary mt-1">{sale.notes}</p>
                        </div>
                      )}

                      {/* All items */}
                      <div>
                        <h4 className="text-xs font-black text-text-primary mb-3">
                          {isEn ? 'Items' : 'المنتجات'}
                          <span className="text-text-disabled font-bold mr-1">({items.length})</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {items.map((item, idx) => (
                            <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl bg-bg-card border border-medium ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                              <div className="w-12 h-12 rounded-xl bg-selected border border-light flex items-center justify-center overflow-hidden shrink-0">
                                {item.image_url ? (
                                  <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="w-5 h-5 text-text-disabled" />
                                )}
                              </div>
                              <div className={`flex-1 min-w-0 ${isEn ? 'text-left' : 'text-right'}`}>
                                <p className="text-xs font-bold text-text-primary truncate">{item.product_name}</p>
                                <div className={`flex items-center gap-2 mt-0.5 text-[10px] font-semibold ${isEn ? '' : 'flex-row-reverse'}`}>
                                  <span className="text-text-disabled">{item.quantity} × {formatCurrency(item.unit_price)}</span>
                                  <span className="text-accent-primary font-bold">{formatCurrency(item.total_price)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm.isOpen && deleteConfirm.sale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
          <div className="absolute inset-0 cursor-default" onClick={() => !isDeleting && setDeleteConfirm({ isOpen: false, sale: null })} />
          <div
            className="relative w-full max-w-sm glass-panel rounded-2xl overflow-hidden shadow-2xl border border-medium text-center"
            style={{ animation: 'confirmSlideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards' }}
          >
            <div className="p-8 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-status-danger/10 flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-status-danger" />
              </div>
              <h3 className="text-lg font-black text-text-primary">
                {isEn ? 'Delete Sale' : 'حذف الفاتورة'}
              </h3>
              <p className="text-sm font-bold text-text-secondary leading-relaxed">
                {isEn
                  ? 'Are you sure you want to delete this invoice? The stock quantities will be restored automatically.'
                  : 'هل أنت متأكد من حذف هذه الفاتورة؟ سيتم إعادة الكميات للمخزون تلقائياً.'}
              </p>
              <div className={`w-full flex flex-col gap-2 p-4 rounded-xl bg-bg-card border border-medium text-right ${isEn ? 'text-left' : ''}`}>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-text-disabled">{isEn ? 'Invoice' : 'رقم الفاتورة'}</span>
                  <span className="text-text-primary">{deleteConfirm.sale.invoice_number}</span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-text-disabled">{isEn ? 'Total' : 'المبلغ'}</span>
                  <span className="text-accent-primary">{formatCurrency(deleteConfirm.sale.final_amount)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-text-disabled">{isEn ? 'Items' : 'عدد المنتجات'}</span>
                  <span className="text-text-primary">{(deleteConfirm.sale.items || []).length}</span>
                </div>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => setDeleteConfirm({ isOpen: false, sale: null })}
                  disabled={isDeleting}
                  className="flex-1 h-12 rounded-xl border border-default bg-transparent text-text-secondary font-extrabold text-xs hover:bg-hover hover:text-text-primary transition-all disabled:opacity-30"
                >
                  {isEn ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 h-12 rounded-xl font-extrabold text-xs transition-all disabled:opacity-30 flex items-center justify-center gap-2 bg-status-danger text-on-accent hover:brightness-110 shadow-lg shadow-status-danger/20"
                >
                  {isDeleting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-on-accent border-t-transparent rounded-full animate-spin" />
                      {isEn ? 'Deleting...' : 'جاري الحذف...'}
                    </>
                  ) : (
                    isEn ? 'Delete' : 'نعم، احذف'
                  )}
                </button>
              </div>
            </div>
          </div>
          <style>{`
            @keyframes confirmSlideIn {
              from { opacity: 0; transform: scale(0.9) translateY(20px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}

      {/* Detail Modal */}
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
                  {detailModalSale.customer_id ? `#${detailModalSale.customer_id}` : (isEn ? 'Walk-in' : 'بدون عميل')}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-bg-primary border border-medium">
                <span className="text-[10px] font-bold text-text-disabled">{isEn ? 'Subtotal' : 'الإجمالي'}</span>
                <span className="text-sm font-black text-text-primary">{formatCurrency(detailModalSale.total_amount)}</span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-bg-primary border border-medium">
                <span className="text-[10px] font-bold text-text-disabled">{isEn ? 'Discount' : 'الخصم'}</span>
                <span className="text-sm font-black text-status-danger">{formatCurrency(detailModalSale.discount_amount)}</span>
              </div>
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-bg-primary border border-medium">
                <span className="text-[10px] font-bold text-text-disabled">{isEn ? 'Final' : 'الصافي'}</span>
                <span className="text-sm font-black text-accent-primary">{formatCurrency(detailModalSale.final_amount)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-black text-text-primary">
                {isEn ? 'Sold Items' : 'الأصناف المباعة'}
                <span className="text-text-disabled font-bold mr-1">({(detailModalSale.items || []).length})</span>
              </h4>
              <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
                {(detailModalSale.items || []).map((item, idx) => (
                  <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl bg-subtle border border-medium ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className="w-12 h-12 rounded-xl bg-selected border border-light flex items-center justify-center overflow-hidden shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-text-disabled" />
                      )}
                    </div>
                    <div className={`flex-1 min-w-0 ${isEn ? 'text-left' : 'text-right'}`}>
                      <p className="text-xs font-black text-text-primary">{item.product_name}</p>
                      <div className={`flex items-center gap-3 mt-0.5 text-[10px] font-bold ${isEn ? '' : 'flex-row-reverse'}`}>
                        <span className="text-text-disabled">
                          {isEn ? `Qty: ${item.quantity}` : `الكمية: ${item.quantity}`}
                        </span>
                        <span className="text-text-disabled">
                          {isEn ? `Unit: ${formatCurrency(item.unit_price)}` : `الوحدة: ${formatCurrency(item.unit_price)}`}
                        </span>
                        <span className="text-accent-primary">
                          {isEn ? `Total: ${formatCurrency(item.total_price)}` : `المجموع: ${formatCurrency(item.total_price)}`}
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
                ))}
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
    </div>
  );
}