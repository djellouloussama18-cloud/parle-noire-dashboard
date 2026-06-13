import React from 'react';
import Modal from '../ui/Modal';
import formatCurrency from '../../utils/formatCurrency';
import { ImageIcon, Trash2, ShoppingCart } from 'lucide-react';

export default function SaleDetailModal({ isOpen, onClose, sale, isEn, onDeleteItem }) {
  if (!sale) return null;

  const t = {
    ar: {
      title: 'تفاصيل الفاتورة',
      invoice: 'رقم الفاتورة',
      customer: 'العميل',
      total: 'الإجمالي',
      discount: 'الخصم',
      tax: 'الضريبة',
      final: 'الصافي',
      payment: 'طريقة الدفع',
      cash: 'نقداً',
      card: 'بطاقة',
      time: 'الوقت',
      product: 'المنتج',
      qty: 'الكمية',
      price: 'السعر',
      subtotal: 'المجموع',
      walkin: 'عميل عام',
      items: 'المنتجات',
      noImage: 'بدون صورة'
    },
    en: {
      title: 'Invoice Details',
      invoice: 'Invoice No.',
      customer: 'Customer',
      total: 'Total',
      discount: 'Discount',
      tax: 'Tax',
      final: 'Net Total',
      payment: 'Payment',
      cash: 'Cash',
      card: 'Card',
      time: 'Time',
      product: 'Product',
      qty: 'Qty',
      price: 'Price',
      subtotal: 'Subtotal',
      walkin: 'Walk-in Customer',
      items: 'Items',
      noImage: 'No image'
    }
  };

  const lang = isEn ? 'en' : 'ar';
  const text = t[lang];

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={text.title} size="lg">
      <div className="space-y-6 text-right" dir={isEn ? 'ltr' : 'rtl'}>
        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-bg-card border border-medium">
          <div>
            <span className="text-xs text-text-disabled block">{text.invoice}</span>
            <span className="text-sm font-bold text-text-primary">{sale.invoice_number}</span>
          </div>
          <div>
            <span className="text-xs text-text-disabled block">{text.time}</span>
            <span className="text-sm font-bold text-text-primary">{formatTime(sale.created_at)}</span>
          </div>
          <div>
            <span className="text-xs text-text-disabled block">{text.customer}</span>
            <span className="text-sm font-bold text-text-primary">{sale.customer_name || text.walkin}</span>
          </div>
          <div>
            <span className="text-xs text-text-disabled block">{text.payment}</span>
            <span className="text-sm font-bold text-text-primary">
              {sale.payment_method === 'card' ? text.card : text.cash}
            </span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-text-primary mb-2">{text.items}</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sale.items && sale.items.length > 0 ? (
              sale.items.map((item, idx) => (
                <div key={item.id || idx} className="flex items-center gap-3 p-2 rounded-lg bg-bg-secondary border border-light">
                  <div className="w-10 h-10 rounded-lg bg-selected border border-medium flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.product_name_ar || item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-text-disabled" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">
                      {isEn ? (item.product_name_en || item.product_name) : (item.product_name_ar || item.product_name)}
                    </p>
                    <p className="text-[10px] text-text-disabled">
                      {text.qty}: {item.quantity} × {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  <span className="text-xs font-black text-accent-primary flex-shrink-0">
                    {formatCurrency(item.total_price)}
                  </span>
                  {onDeleteItem && (
                    <button
                      onClick={() => onDeleteItem(sale, item)}
                      className="p-1.5 rounded-lg bg-status-danger/10 text-status-danger hover:bg-status-danger/20 transition-all shrink-0"
                      title={isEn ? 'Delete item' : 'حذف الصنف'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-4 rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/30">
                <div className="w-14 h-14 rounded-full bg-slate-700/50 flex items-center justify-center mb-3">
                  <ShoppingCart className="w-7 h-7 text-slate-500" />
                </div>
                <p className="text-slate-400 text-sm">{isEn ? 'No items in this invoice' : 'لا توجد أصناف في هذه الفاتورة'}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-bg-card border border-medium">
          <div className="text-center">
            <span className="text-[10px] text-text-disabled block">{text.total}</span>
            <span className="text-sm font-bold text-text-primary">{formatCurrency(sale.total_amount)}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-text-disabled block">{text.discount}</span>
            <span className="text-sm font-bold text-status-danger">{formatCurrency(sale.discount_amount)}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-text-disabled block">{text.final}</span>
            <span className="text-sm font-black text-accent-primary">{formatCurrency(sale.final_amount)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
