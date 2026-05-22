import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import useCartStore from '../store/useCartStore';
import useInventoryStore from '../store/useInventoryStore';
import useSettingsStore from '../store/useSettingsStore';
import useNotification from '../hooks/useNotification';
import useBarcode from '../hooks/useBarcode';
import formatCurrency from '../utils/formatCurrency';
import { createSaleApi } from '../api/sales.api';
import {
  Trash2, Minus, Plus, Search, ShoppingCart,
  DollarSign, CreditCard, Smartphone, Printer,
  X, FileCheck, ScanLine, Package, CheckCircle,
  Shirt, LayoutGrid, ShoppingBag, Sparkles, Tag,
  Gem, Briefcase, Heart, Flame, Flower2, Watch, Glasses, Scissors, Milestone
} from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

// ─── Beep Helper ───────────────────────────────────────────────────────────
function playBeep(freq = 880, dur = 0.08) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch (_) {}
}

// ─── Print Receipt ──────────────────────────────────────────────────────────
function printReceiptHTML(items = [], invoice, settings, paymentMethod, amountPaid, change, discount, tax, lang = 'ar') {
  const isEn = lang === 'en';
  const locale = isEn ? 'en-US' : 'ar-DZ';
  const date = new Date().toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const time = new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const cur = settings.currency || 'د.ج';
  const subtotal = items.reduce((s, i) => s + i.product.sale_price * i.quantity, 0);
  const finalTotal = invoice?.final_amount || (subtotal - discount + tax);
  const pm = isEn
    ? (paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'card' ? 'Bank Card' : 'E-Payment')
    : (paymentMethod === 'cash' ? 'نقداً' : paymentMethod === 'card' ? 'بطاقة بنكية' : 'دفع إلكتروني');
  const dir = isEn ? 'ltr' : 'rtl';
  const htmlLang = isEn ? 'en' : 'ar';

  const itemRows = items.map(it => `
    <tr>
      <td class="td-name">
        <div class="prod-name">${it.product.name_ar}</div>
        ${settings.receipt_show_sku !== false ? `<div class="prod-sku">SKU-${it.product.sku}</div>` : ''}
      </td>
      <td class="td-c">${it.quantity}</td>
      <td class="td-c">${it.product.sale_price.toLocaleString()}</td>
      <td class="td-l">${(it.product.sale_price * it.quantity).toLocaleString()} ${cur}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html dir="${dir}" lang="${htmlLang}"><head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
@page{size:80mm auto;margin:0}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Tajawal',Arial,sans-serif;font-size:12px;color:#111;background:#fff;width:80mm;padding:5mm 4mm 10mm}
.c{text-align:center}
.b{font-weight:900}
.dash{border:none;border-top:1px dashed #999;margin:8px 0}
.store-name{font-size:18px;font-weight:900;letter-spacing:1px;margin-bottom:6px;display:flex;justify-content:center;align-items:center;gap:4px}
.store-name .en {font-family:monospace; font-size:19px; letter-spacing:2px}
.store-info{font-size:11px;color:#333;line-height:1.8;margin-bottom:4px}
table{width:100%;border-collapse:collapse;margin:8px 0}
thead tr{border-bottom:1px dashed #999;}
th{padding:6px 2px;font-size:11px;font-weight:700;color:#000}
${isEn ? 'th.tr{text-align:left} th.tc{text-align:center} th.tl{text-align:right}' : 'th.tr{text-align:right} th.tc{text-align:center} th.tl{text-align:left}'}
td{padding:8px 2px;font-size:11px;vertical-align:top;border-bottom:none}
td.td-r{text-align:right} td.td-c{text-align:center} td.td-l{text-align:left;font-weight:700}
td.td-name{${isEn ? 'text-align:left;max-width:90px' : 'text-align:right;max-width:90px'};}
.prod-name{font-weight:700;font-size:12px;margin-bottom:2px}
.prod-sku{font-size:8px;color:#888;font-family:monospace;letter-spacing:0.5px}
.tot-row{display:flex;justify-content:space-between;padding:3px 0;font-size:11px;color:#333}
.grand-row{display:flex;justify-content:space-between;padding:10px 0;font-size:16px;font-weight:900;color:#006633;align-items:center}
.footer{text-align:center;font-size:11px;color:#333;margin-top:10px}
.qr-box{width:60px;height:60px;border:1px solid #ccc;margin:12px auto;display:flex;justify-content:center;align-items:center;font-size:8px;color:#000;font-family:monospace}
.inv-num{font-size:10px;color:#555;text-align:center;margin-top:10px;font-family:monospace}
</style></head><body>

<div class="c">
  <div class="store-name"><span class="en">${settings.store_name?.toUpperCase()}</span></div>
  <div class="store-info">${settings.receipt_header}</div>
  <div class="store-info">${isEn ? 'Tel:' : 'هاتف:'} ${settings.store_phone}</div>
  <div class="store-info">${isEn ? 'Address:' : 'العنوان:'} ${settings.store_address}</div>
</div>

<hr class="dash">

<table>
  <thead><tr>
    <th class="tr">${isEn ? 'Item' : 'الصنف'}</th>
    <th class="tc">${isEn ? 'Qty' : 'الكمية'}</th>
    <th class="tc">${isEn ? 'Price' : 'السعر'}</th>
    <th class="tl">${isEn ? 'Total' : 'المجموع'}</th>
  </tr></thead>
  <tbody>${itemRows}</tbody>
</table>

<hr class="dash">

<div>
  <div class="tot-row"><span>${isEn ? 'Subtotal' : 'المجموع الفرعي'}</span><span>${subtotal.toLocaleString()} ${cur}</span></div>
  ${discount > 0 ? `<div class="tot-row"><span style="color:#c00">${isEn ? 'Special Discount' : 'تخفيض خاص'}</span><span style="color:#c00">- ${discount.toLocaleString()} ${cur}</span></div>` : ''}
  ${settings.receipt_show_tva !== false ? `<div class="tot-row" style="color:#555"><span>${isEn ? `VAT ${settings.tva_rate || 0}%` : `الضريبة ${settings.tva_rate || 0}% TVA`}</span><span>${tax.toLocaleString()} ${cur}</span></div>` : ''}
</div>

<hr class="dash">

<div class="grand-row">
  <span>${isEn ? 'Final Total' : 'الإجمالي النهائي'}</span>
  <span>${finalTotal.toLocaleString()} ${cur}</span>
</div>

<hr class="dash">

<div class="footer">
  ${settings.receipt_footer || (isEn ? 'Thank you for your visit!' : 'شكراً لزيارتكم!')}
</div>

<div class="qr-box">[QR CODE]</div>

<div class="inv-num">${isEn ? 'Invoice No:' : 'رقم الفاتورة:'} ${invoice?.invoice_number || 'INV-20260518-0012'}</div>

</body></html>`;

  const w = window.open('', '_blank', 'width=330,height=620,left=200,top=80');
  if (!w) { alert(isEn ? 'Please allow popups to print the receipt' : 'يرجى السماح بالنوافذ المنبثقة لطباعة الوصل'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 500);
}

// ═══════════════════════════════════════════════════════════════════════════

export default function Sales() {
  const { showSuccess, showError, showWarning } = useNotification();
  const { settings, language } = useSettingsStore();
  const isEn = language === 'en';

  const {
    items, discountAmount, paymentMethod, amountPaid, notes,
    addToCart, removeFromCart, updateQuantity,
    setDiscount, setPaymentMethod, setAmountPaid, setNotes, clearCart, setTaxRate,
    getSubtotal, getTaxAmount, getFinalTotal, getChangeAmount
  } = useCartStore();

  const { products, categories, fetchProducts, fetchCategories } = useInventoryStore();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [lastScanned, setLastScanned] = useState(null); // { product, isNew }
  const [scanFlash, setScanFlash] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedItems, setSavedItems] = useState([]);           // ← حفظ المنتجات قبل مسح السلة
  const [savedPayment, setSavedPayment] = useState({});      // ← حفظ بيانات الدفع
  const scanTimerRef = useRef(null);
  const searchInputRef = useRef(null);
  const [dropdownRect, setDropdownRect] = useState(null);

  const updateDropdownRect = useCallback(() => {
    if (searchInputRef.current) {
      const r = searchInputRef.current.getBoundingClientRect();
      setDropdownRect({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  }, []);

  useEffect(() => { 
    fetchProducts(); 
    fetchCategories();
  }, []);

  // Sync tax rate from settings to cart store whenever settings change
  useEffect(() => {
    setTaxRate(settings.tva_rate);
  }, [settings.tva_rate, setTaxRate]);

  // Visual Catalog Products filter based on Category & SearchTerm
  const filteredProducts = products.filter(p => {
    // 1. Category Filter
    if (activeCategory !== 'all' && p.category_id !== parseInt(activeCategory, 10)) {
      return false;
    }
    // 2. Search Term Filter
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      return (
        p.name_ar.toLowerCase().includes(t) ||
        (p.name_en && p.name_en.toLowerCase().includes(t)) ||
        p.sku.toLowerCase().includes(t) ||
        p.barcode.toLowerCase().includes(t)
      );
    }
    return true;
  });

  // Search filter for Quick Dropdown
  useEffect(() => {
    if (!searchTerm.trim()) { setSearchResults([]); return; }
    const t = searchTerm.toLowerCase();
    setSearchResults(products.filter(p =>
      p.name_ar.toLowerCase().includes(t) ||
      p.sku.toLowerCase().includes(t) ||
      p.barcode.toLowerCase().includes(t)
    ).slice(0, 8));
  }, [searchTerm, products]);

  const triggerScanEffect = useCallback((product, isNew) => {
    setLastScanned({ product, isNew });
    setScanFlash(true);
    playBeep();
    clearTimeout(scanTimerRef.current);
    scanTimerRef.current = setTimeout(() => setScanFlash(false), 600);
  }, []);

  // Physical HID barcode scanner
  useBarcode((barcode) => {
    const found = products.find(p => p.barcode === barcode || p.sku === barcode);
    if (found) {
      const alreadyInCart = items.some(i => i.product.id === found.id);
      try {
        addToCart(found);
        triggerScanEffect(found, !alreadyInCart);
        showSuccess(`✔ ${found.name_ar}`);
      } catch (err) { showWarning(err.message); }
    } else {
      playBeep(300, 0.2);
      showError(isEn ? `Barcode not found: ${barcode}` : `باركود غير موجود: ${barcode}`);
    }
  });

  const handleSelectProduct = (prod) => {
    const alreadyInCart = items.some(i => i.product.id === prod.id);
    try {
      addToCart(prod);
      triggerScanEffect(prod, !alreadyInCart);
      setSearchTerm('');
      setShowDropdown(false);
    } catch (err) { showWarning(err.message); }
  };

  const handleCheckout = async () => {
    if (items.length === 0) { showError(isEn ? 'Cart is empty' : 'السلة فارغة'); return; }
    const total = getFinalTotal();
    if (paymentMethod === 'cash' && amountPaid < total) {
      showWarning(isEn ? 'Paid amount is less than total' : 'المبلغ المدفوع أقل من الإجمالي'); return;
    }
    setIsSubmitting(true);
    try {
      // ← احفظ بيانات السلة قبل المسح
      const cartSnapshot = [...items];
      const paymentSnapshot = {
        method: paymentMethod,
        paid: amountPaid || total,
        change: getChangeAmount(),
        discount: discountAmount,
        tax: getTaxAmount()
      };

      const result = await createSaleApi({
        items: items.map(it => ({ product_id: it.product.id, quantity: it.quantity, unit_price: it.product.sale_price })),
        discount_amount: discountAmount,
        tax_amount: getTaxAmount(),
        payment_method: paymentMethod,
        amount_paid: amountPaid || total,
        notes
      });

      setSavedItems(cartSnapshot);
      setSavedPayment(paymentSnapshot);
      setCreatedInvoice(result);
      setIsSuccessModalOpen(true);
      showSuccess(isEn ? 'Sale completed successfully!' : 'تم إتمام عملية البيع بنجاح!');
      clearCart();
      fetchProducts();
    } catch (err) {
      console.error('=== CHECKOUT ERROR ===');
      console.error('Error message:', err.message);
      console.error('Error details:', err);
      showError(err.message || (isEn ? 'Failed to complete sale' : 'فشل إتمام عملية البيع'));
    } finally { setIsSubmitting(false); }
  };

  const handlePrint = () => {
    printReceiptHTML(
      savedItems.length > 0 ? savedItems : items,
      createdInvoice,
      settings,
      savedPayment.method || paymentMethod,
      savedPayment.paid || amountPaid || getFinalTotal(),
      savedPayment.change !== undefined ? savedPayment.change : getChangeAmount(),
      savedPayment.discount !== undefined ? savedPayment.discount : discountAmount,
      savedPayment.tax !== undefined ? savedPayment.tax : getTaxAmount(),
      language
    );
  };

  const cur = settings.currency || 'د.ج';
  const subtotal = getSubtotal();
  const tax = getTaxAmount();
  const total = getFinalTotal();
  const change = getChangeAmount();

  return (
    <div className="flex flex-col gap-6 text-right pb-10 pt-6 select-none h-full">

      {/* ── TOP SCAN BAR ─────────────────────────────────────────────────── */}
      <div className={`glass-panel rounded-2xl border transition-all duration-300 ${
        scanFlash
          ? 'border-accent-primary shadow-accent'
          : 'border-medium'
      }`}>
        <div className="flex flex-col md:flex-row gap-0">

          {/* Search / Manual input */}
          <div className="flex-1 p-5 relative z-20">
            <div className={`flex items-center gap-3 mb-1 ${isEn ? 'flex-row-reverse justify-end' : ''}`}>
              <ScanLine className={`w-5 h-5 ${scanFlash ? 'text-accent-primary animate-pulse' : 'text-text-secondary'}`} />
              <span className="text-xs font-black text-text-secondary">{isEn ? 'Scan Barcode or Search' : 'امسح الباركود أو ابحث عن منتج'}</span>
            </div>
            <div className="relative">
              <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none ${isEn ? 'left-4' : 'right-4'}`} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={isEn ? "Product Name, Barcode, or SKU..." : "اسم المنتج، الباركود، أو SKU..."}
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setShowDropdown(true); updateDropdownRect(); }}
                onFocus={() => { setShowDropdown(true); updateDropdownRect(); }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                className="w-full h-12 bg-subtle border border-default rounded-xl pr-11 pl-4 text-sm font-bold focus:border-accent-primary outline-none transition-all"
              />
            </div>

            {/* Portal dropdown — rendered in document.body to bypass all z-index stacking contexts */}
            {showDropdown && dropdownRect && searchResults.length > 0 && createPortal(
              <div
                style={{
                  position: 'fixed',
                  top: dropdownRect.top,
                  left: dropdownRect.left,
                  width: dropdownRect.width,
                  zIndex: 99999,
                  direction: 'rtl'
                }}
                className="bg-bg-card border border-accent-primary/30 rounded-2xl shadow-2xl max-h-[260px] overflow-y-auto"
              >
                {searchResults.map(p => (
                  <div
                    key={p.id}
                    onMouseDown={() => handleSelectProduct(p)}
                    className="p-[10px_14px] border-b border-light cursor-pointer flex justify-between items-center text-xs font-bold hover:bg-hover transition-colors"
                  >
                    <div className="flex items-center gap-[10px]">
                      <span className="text-accent-primary font-black text-sm">{p.sale_price.toLocaleString()} {cur}</span>
                      <span className="text-text-secondary text-[10px] bg-hover px-2 py-0.5 rounded-full">متاح: {p.quantity}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-text-primary font-black">{p.name_ar}</div>
                      <div className="text-text-secondary text-[10px] mt-0.5">SKU: {p.sku} | {p.barcode}</div>
                    </div>
                  </div>
                ))}
              </div>,
              document.body
            )}

            {showDropdown && dropdownRect && searchTerm.trim() && searchResults.length === 0 && createPortal(
              <div
                style={{
                  position: 'fixed',
                  top: dropdownRect.top,
                  left: dropdownRect.left,
                  width: dropdownRect.width,
                  zIndex: 99999,
                  textAlign: 'center',
                  direction: isEn ? 'ltr' : 'rtl'
                }}
                className="bg-bg-card border border-medium rounded-2xl p-[14px] text-xs text-text-secondary"
              >
                {isEn ? `No products found for "${searchTerm}"` : `لا توجد منتجات مطابقة لـ "${searchTerm}"`}
              </div>,
              document.body
            )}
          </div>

          {/* Last Scanned Product Card */}
          <div className={`md:w-72 border-t md:border-t-0 md:border-r border-light p-5 flex flex-col justify-center transition-all duration-300 ${
            lastScanned ? 'bg-subtle' : ''
          }`}>
            {lastScanned ? (
              <div className="flex flex-col gap-1 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    lastScanned.isNew
                      ? 'bg-accent-primary/15 text-accent-primary'
                      : 'bg-status-warning/15 text-status-warning'
                  }`}>
                    {lastScanned.isNew ? (isEn ? '✔ New Item' : '✔ منتج جديد') : (isEn ? '+ Added Qty' : '+ كمية إضافية')}
                  </span>
                  <Package className="w-4 h-4 text-text-secondary" />
                </div>
                <span className="text-sm font-black text-text-primary leading-tight">{lastScanned.product.name_ar}</span>
                <span className="text-[10px] text-text-secondary">SKU: {lastScanned.product.sku}</span>
                <span className="text-lg font-black text-accent-primary">
                  {lastScanned.product.sale_price.toLocaleString()} {cur}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-text-disabled py-2">
                <ScanLine className="w-8 h-8 opacity-30" />
                <span className="text-[10px] font-bold">{isEn ? 'Waiting for barcode scan...' : 'في انتظار مسح الباركود...'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">

        {/* 1. LEFT SIDE: PRODUCTS CATALOG & CATEGORIES (2/3 Width) */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          
          {/* Category Carousel Row */}
          <div className="flex gap-2 pb-2.5 overflow-x-auto no-scrollbar scroll-smooth">
            {/* "All" Category Capsule */}
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black transition-all duration-300 select-none whitespace-nowrap focus:outline-none ${
                activeCategory === 'all'
                  ? 'bg-accent-primary text-on-accent shadow-accent scale-[1.03]'
                  : 'bg-subtle border border-light text-text-secondary hover:bg-hover hover:border-accent-primary/30 hover:text-text-primary'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              {isEn ? 'All Categories' : 'جميع الأصناف'}
            </button>

            {categories.map((cat) => {
              const isSelected = activeCategory == cat.id;
              const iconComponents = { Gem, Milestone, ShoppingBag, Briefcase, Heart, Sparkles, Flame, Flower2, Watch, Glasses, Scissors, Shirt, Tag };
              const CatIcon = iconComponents[cat.icon] || Tag;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black transition-all duration-300 select-none whitespace-nowrap focus:outline-none ${
                    isSelected
                      ? 'text-on-accent shadow-lg scale-[1.03]'
                      : 'bg-subtle border border-light text-text-secondary hover:bg-hover hover:border-accent-primary/30 hover:text-text-primary'
                  }`}
                  style={isSelected ? { backgroundColor: cat.color || '#00FF7F', boxShadow: `0 0 15px ${(cat.color || '#00FF7F')}40` } : {}}
                >
                  {!isSelected && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cat.color || '#00FF7F' }}
                    />
                  )}
                  <CatIcon className="w-4 h-4" />
                  <span>{isEn ? cat.name_en : cat.name_ar}</span>
                </button>
              );
            })}
          </div>

          {/* Visual Product Grid Frame */}
          <div className="glass-panel rounded-2xl border border-medium p-5 flex flex-col flex-1 overflow-hidden">
            <div className={`flex items-center justify-between border-b border-light pb-3 mb-4 select-none ${isEn ? 'flex-row-reverse' : ''}`}>
              <span className="text-[10px] font-black text-accent-primary bg-accent-primary/5 border border-accent-primary/10 px-3 py-1 rounded-full">
                {filteredProducts.length} {isEn ? 'Products Available' : 'منتج متوفر'}
              </span>
              <span className="text-sm font-black text-text-primary">
                {isEn ? 'Products Catalog' : 'كتالوج المنتجات المعروضة'}
              </span>
            </div>

            {/* Scrollable Container */}
            <div className="flex-1 overflow-y-auto max-h-[520px] pr-1">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-text-disabled select-none gap-2">
                  <Package className="w-16 h-16 opacity-10 mb-2" />
                  <span className="text-xs font-bold">{isEn ? 'No products found matching criteria.' : 'لا توجد منتجات مطابقة لخيارات البحث أو الفلترة.'}</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredProducts.map((p) => {
                    const cartItem = items.find(it => it.product.id === p.id);
                    const inCartQty = cartItem ? cartItem.quantity : 0;
                    const isOutOfStock = p.quantity <= 0;
                    const isLowStock = p.quantity > 0 && p.quantity <= p.min_quantity;

                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          if (isOutOfStock) {
                            showWarning(isEn ? 'Item is out of stock' : 'المنتج غير متوفر حالياً في المخزن');
                            return;
                          }
                          try {
                            addToCart(p);
                            playBeep(880, 0.05);
                          } catch (err) {
                            showWarning(err.message);
                          }
                        }}
                        className={`group relative glass-panel rounded-2xl border flex flex-col justify-between overflow-hidden transition-all duration-300 cursor-pointer ${
                          isOutOfStock
                            ? 'opacity-40 border-status-danger/20 bg-status-danger/5'
                            : inCartQty > 0
                            ? 'border-accent-primary shadow-accent bg-subtle scale-[1.01]'
                            : 'border-light hover:border-accent-primary/40 hover:scale-[1.02] hover:shadow-accent'
                        }`}
                      >
                        {/* Image Block */}
                        <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-bg-card to-bg-primary overflow-hidden flex items-center justify-center">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={isEn ? p.name_en : p.name_ar}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1 opacity-60 text-accent-primary">
                              {p.category_id == 1 ? (
                                <Shirt className="w-8 h-8" />
                              ) : (
                                <Package className="w-8 h-8" />
                              )}
                              <span className="text-[7px] font-black tracking-widest uppercase font-mono">
                                {p.name_en?.split(' ')[0] || 'NEON'}
                              </span>
                            </div>
                          )}

                          {/* Stock pill indicator */}
                          <div className="absolute top-2 right-2 flex items-center gap-1 bg-bg-primary/85 backdrop-blur-md px-2 py-0.5 rounded-full text-[8px] font-black tracking-wide border border-light select-none">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isOutOfStock
                                ? 'bg-status-danger'
                                : isLowStock
                                ? 'bg-status-warning'
                                : 'bg-accent-primary'
                            }`} />
                            <span className={isOutOfStock ? 'text-status-danger' : isLowStock ? 'text-status-warning' : 'text-accent-primary'}>
                              {isOutOfStock ? (isEn ? 'Out' : 'نفد') : isLowStock ? (isEn ? 'Low' : 'قليل') : `${p.quantity} ق`}
                            </span>
                          </div>

                          {/* In cart bubble */}
                          {inCartQty > 0 && (
                            <div className="absolute inset-0 bg-accent-primary/10 flex items-center justify-center backdrop-blur-[1.5px] transition-opacity">
                              <div className="w-9 h-9 rounded-full bg-accent-primary text-on-accent flex items-center justify-center font-black text-sm shadow-accent animate-bounce select-none">
                                {inCartQty}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Title and details below image */}
                        <div className="p-3 flex flex-col gap-1 border-t border-light bg-bg-primary/60">
                          <h4 className="text-[11px] font-black text-text-primary truncate" title={p.name_ar}>
                            {p.name_ar}
                          </h4>
                          <div className="flex justify-between items-center mt-0.5">
                            <span className="text-[8px] font-black text-text-disabled uppercase font-mono tracking-wider">
                              {p.sku}
                            </span>
                            <span className="text-[13px] font-black text-accent-primary tracking-tight">
                              {p.sale_price.toLocaleString()} {cur}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. RIGHT SIDE: CART SIDEBAR & CHECKOUT DETAILS (1/3 Width) */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          
          {/* Shopping Cart Block */}
          <div className="glass-panel rounded-2xl border border-medium p-5 flex flex-col flex-grow overflow-hidden select-none">
            <div className={`flex items-center justify-between border-b border-light pb-2.5 mb-3 ${isEn ? 'flex-row-reverse' : ''}`}>
              <span className="text-[10px] font-black text-accent-primary">
                {items.length} {isEn ? 'Items' : 'صنف'} | {items.reduce((s, i) => s + i.quantity, 0)} {isEn ? 'Units' : 'قطعة'}
              </span>
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-accent-primary animate-pulse" />
                <span className="text-sm font-black text-text-primary">{isEn ? 'Shopping Cart' : 'سلة المبيعات'}</span>
              </div>
            </div>

            {/* Vertical Compact Cart Stack */}
            <div className="flex-grow overflow-y-auto max-h-[280px] min-h-[160px] flex flex-col gap-2 pr-1 pb-1">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-10 text-text-disabled select-none">
                  <ShoppingCart className="w-10 h-10 opacity-15" />
                  <span className="text-xs font-bold text-center leading-relaxed max-w-[200px]">
                    {isEn ? 'Cart is empty. Click products on the catalog to select.' : 'السلة فارغة. انقر على صور السلع لاختيارها يدوياً.'}
                  </span>
                </div>
              ) : (
                items.map(it => (
                  <div
                    key={it.product.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-subtle border border-light hover:border-accent-primary/20 transition-all gap-2"
                  >
                    {/* Delete Icon */}
                    <button
                      onClick={() => removeFromCart(it.product.id)}
                      className="p-1.5 text-text-disabled hover:text-status-danger hover:bg-status-danger/10 rounded-lg transition-colors flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    {/* Quantity Adjustment Buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => { try { updateQuantity(it.product.id, it.quantity + 1); } catch(e) { showWarning(e.message); }}}
                        className="w-5.5 h-5.5 rounded-lg bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary hover:bg-accent-primary/20 transition-colors"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                      <span className="w-5 text-center font-black text-text-primary text-xs">{it.quantity}</span>
                      <button
                        onClick={() => updateQuantity(it.product.id, it.quantity - 1)}
                        className="w-5.5 h-5.5 rounded-lg bg-status-danger/10 border border-status-danger/20 flex items-center justify-center text-status-danger hover:bg-status-danger/20 transition-colors"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    {/* Info Block (Arabic right-aligned) */}
                    <div className="flex-grow min-w-0 flex flex-col text-right">
                      <span className="text-xs font-black text-text-primary truncate" title={it.product.name_ar}>
                        {it.product.name_ar}
                      </span>
                      <div className="flex justify-end gap-2 items-center mt-0.5 text-[9px]">
                        <span className="text-text-disabled font-mono">{it.product.sku}</span>
                        <span className="text-accent-primary font-black">
                          {(it.product.sale_price * it.quantity).toLocaleString()} {cur}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Note bar */}
            <div className="pt-2 border-t border-light mt-2">
              <input
                type="text"
                placeholder={isEn ? "Customer name or receipt notes..." : "اسم الزبون أو ملاحظة الوصل..."}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className={`w-full h-8.5 bg-subtle border border-medium rounded-xl px-3.5 text-xs font-semibold outline-none focus:border-accent-primary transition-all ${isEn ? 'text-left' : 'text-right'}`}
              />
            </div>
          </div>

          {/* Calculator Summary */}
          <div className="glass-panel rounded-2xl border border-medium px-5 py-4 flex flex-col gap-3 select-none">
            <h3 className="text-xs font-black text-text-primary border-b border-light pb-2">{isEn ? 'Invoice Summary' : 'ملخص الفاتورة'}</h3>
            <div className="flex flex-col gap-3 text-xs font-bold">
              <div className="flex justify-between items-center text-text-secondary">
                <span>{subtotal.toLocaleString()} {cur}</span>
                <span>{isEn ? 'Subtotal' : 'المجموع الفرعي'}</span>
              </div>
              <div className="flex justify-between items-center text-text-secondary border-b border-light pb-2">
                <input
                  type="number" placeholder="0"
                  value={discountAmount || ''}
                  onChange={e => setDiscount(e.target.value)}
                  className="w-18 h-7 text-center text-xs font-black text-status-warning bg-status-warning/5 border border-status-warning/20 rounded-lg outline-none"
                />
                <span>{isEn ? `Discount (${cur})` : `تخفيض (${cur})`}</span>
              </div>
              {settings.receipt_show_tva !== false && (
                <div className="flex justify-between items-center text-text-secondary text-[10px]">
                  <span>{tax.toLocaleString()} {cur}</span>
                  <span>{isEn ? `VAT ${settings.tva_rate || 0}%` : `TVA ${settings.tva_rate || 0}%`}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-base font-black border-t border-light pt-2.5">
                <span className="text-accent-primary text-lg">{total.toLocaleString()} {cur}</span>
                <span className="text-text-primary">{isEn ? 'Final Total' : 'الإجمالي النهائي'}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Frame */}
          <div className="glass-panel rounded-2xl border border-medium p-5 flex flex-col gap-3 select-none">
            <h3 className="text-xs font-black text-text-primary">{isEn ? 'Payment Method' : 'طريقة الدفع'}</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'cash', label: isEn ? 'Cash' : 'نقداً', labelEn: 'Cash', Icon: DollarSign, color: 'accent-primary' },
                { key: 'card', label: isEn ? 'Card' : 'بطاقة', labelEn: 'Card', Icon: CreditCard, color: 'accent-secondary' },
                { key: 'e-payment', label: isEn ? 'E-Payment' : 'إلكتروني', labelEn: 'E-Payment', Icon: Smartphone, color: 'status-warning' },
              ].map(({ key, label, Icon, color }) => (
                <button
                  key={key}
                  onClick={() => setPaymentMethod(key)}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-[10px] font-extrabold gap-1 transition-all focus:outline-none ${
                    paymentMethod === key
                      ? `bg-${color}/10 border-${color} text-${color}`
                      : 'border-medium text-text-secondary hover:border-text-secondary'
                  }`}
                ><Icon className="w-3.5 h-3.5" />{label}</button>
              ))}
            </div>

            {paymentMethod === 'cash' && (
              <div className="flex flex-col gap-2 animate-fade-in">
                <input
                  type="number" placeholder={isEn ? 'Amount Paid' : 'المبلغ المقدم'}
                  value={amountPaid || ''}
                  onChange={e => setAmountPaid(e.target.value)}
                  className="w-full h-9 bg-subtle border border-default rounded-xl px-4 text-center text-sm font-black outline-none focus:border-accent-primary"
                />
                <div className="flex gap-1 justify-end flex-wrap">
                  {[1000, 2000, 5000].map(v => (
                    <button key={v} onClick={() => { setAmountPaid(v); playBeep(); }}
                      className="text-[9px] font-black bg-bg-card border border-default text-accent-primary px-2 py-1 rounded-lg hover:bg-accent-primary/10">
                      +{v.toLocaleString()} {cur}
                    </button>
                  ))}
                </div>
                {change > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold border-t border-light pt-1.5">
                    <span className="text-status-warning font-black text-base">{change.toLocaleString()} {cur}</span>
                    <span className="text-text-secondary">{isEn ? 'Change Due' : 'الباقي للزبون'}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Checkout Submit Trigger */}
          <Button
            onClick={handleCheckout}
            isLoading={isSubmitting}
            disabled={items.length === 0}
            className="h-13 text-base font-extrabold w-full"
          >
            {isEn ? 'Confirm Sale & Print Receipt' : 'تأكيد البيع وطباعة الوصل'}
          </Button>
        </div>
      </div>

      {/* ── SUCCESS MODAL ─────────────────────────────────────────────────── */}
      <Modal isOpen={isSuccessModalOpen} onClose={() => { setIsSuccessModalOpen(false); setCreatedInvoice(null); }} title={isEn ? 'Sale Completed Successfully 🎉' : 'تمت عملية البيع بنجاح 🎉'} size="md">
        <div className="flex flex-col items-center gap-5 text-center py-2">
          <div className="w-16 h-16 bg-accent-primary/10 border border-accent-primary/30 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle className="w-8 h-8 text-accent-primary" />
          </div>
          <div>
            <h4 className="text-lg font-black text-text-primary">{isEn ? 'Invoice No:' : 'فاتورة رقم:'} {createdInvoice?.invoice_number}</h4>
            <p className="text-2xl font-black text-accent-primary mt-1">{(createdInvoice?.final_amount || 0).toLocaleString()} {cur}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full border-t border-light pt-4">
            <Button onClick={handlePrint} className="h-12 text-xs font-bold flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" /> {isEn ? 'Print Receipt' : 'طباعة الوصل'}
            </Button>
            <Button onClick={() => { setIsSuccessModalOpen(false); setCreatedInvoice(null); }} variant="secondary" className="h-12 text-xs font-bold">
              {isEn ? 'New Sale' : 'بيع جديد'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
