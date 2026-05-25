import React, { useState, useEffect, useMemo } from 'react';
import ReactBarcode from 'react-barcode';
import useInventoryStore from '../store/useInventoryStore';
import useSettingsStore from '../store/useSettingsStore';
import useNotification from '../hooks/useNotification';
import { QrCode, Printer, Settings2, Grid3X3, Search } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Barcode() {
  const { showSuccess, showError } = useNotification();
  const { products, fetchProducts } = useInventoryStore();
  const { settings, language } = useSettingsStore();
  const isEn = language === 'en';

  const [selectedProductId, setSelectedProductId] = useState('');
  const [printQty, setPrintQty] = useState(12);
  const [colsCount, setColsCount] = useState(3); // 2, 3 or 4 columns
  const [showPrice, setShowPrice] = useState(true);
  const [showName, setShowName] = useState(true);
  const [showStoreName, setShowStoreName] = useState(true);
  const [customStoreName, setCustomStoreName] = useState('');
  const [barcodeFormat, setBarcodeFormat] = useState('CODE128');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const lowerQ = searchQuery.toLowerCase();
    return products.filter(p => 
      (p.name_ar && p.name_ar.toLowerCase().includes(lowerQ)) || 
      (p.sku && p.sku.toLowerCase().includes(lowerQ)) ||
      (p.barcode && p.barcode.includes(lowerQ))
    );
  }, [products, searchQuery]);

  useEffect(() => {
    if (filteredProducts.length > 0 && !selectedProductId) {
      setSelectedProductId(String(filteredProducts[0].id));
    }
  }, [filteredProducts]);

  const activeProduct = products.find(p => p.id === parseInt(selectedProductId, 10));

  const handlePrint = () => {
    if (!activeProduct) {
      showError(isEn ? 'Please select a product first' : 'الرجاء اختيار صنف للتوليد أولاً');
      return;
    }
    
    // Custom print setup
    const styleId = 'barcode-print-styles';
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }

    style.innerHTML = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        body {
          background: white !important;
          color: black !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .no-print {
          display: none !important;
        }
        .print-only {
          display: block !important;
        }
        .barcode-sheet-grid {
          display: grid !important;
          grid-template-columns: repeat(${colsCount}, 1fr) !important;
          gap: 15px !important;
          direction: rtl !important;
          padding: 10px !important;
        }
        .barcode-item-card {
          border: 1px solid #ddd !important;
          padding: 10px !important;
          text-align: center !important;
          background: white !important;
          border-radius: 6px !important;
          box-shadow: none !important;
          page-break-inside: avoid !important;
        }
      }
    `;

    setTimeout(() => {
      window.print();
    }, 150);
    showSuccess(isEn ? 'Sending labels to printer...' : 'جاري إرسال الملصقات للطابعة...');
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10 pt-6 select-none ${isEn ? 'text-left' : 'text-right'}`}>
      
      {/* 1. Configuration Panel (1/3 width) */}
      <div className="flex flex-col gap-5 no-print">
        <div className="glass-panel p-6 rounded-2xl border border-medium flex flex-col gap-4">
          <div className={`flex items-center justify-between border-b border-light pb-3 ${isEn ? 'flex-row-reverse' : ''}`}>
            <Settings2 className="w-5 h-5 text-accent-primary animate-pulse" />
            <h3 className="text-sm font-black text-text-primary">{isEn ? 'Barcode Label Settings' : 'إعدادات ملصقات الباركود'}</h3>
          </div>

          {/* Product Selector */}
          <div className={`flex flex-col gap-2 w-full ${isEn ? 'text-left' : 'text-right'}`}>
            <label className="text-[13px] font-medium text-text-secondary">{isEn ? 'Select Product from Inventory' : 'اختر الصنف من المخزن'}</label>
            <div className="relative mb-1">
              <Search className={`w-4 h-4 absolute top-3 text-text-secondary ${isEn ? 'left-3' : 'right-3'}`} />
              <input 
                type="text" 
                placeholder={isEn ? "Search by name, SKU, or Barcode..." : "ابحث بالاسم، SKU، أو الباركود..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full h-10 bg-subtle border border-default rounded-xl text-xs font-bold text-text-primary outline-none focus:border-accent-primary ${isEn ? 'pl-10 pr-4' : 'pr-10 pl-4'}`}
              />
            </div>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="h-[52px] bg-subtle border border-default rounded-xl px-4 text-xs font-bold text-text-primary outline-none focus:border-accent-primary"
            >
              {filteredProducts.map(p => (
                <option key={p.id} value={p.id} className="text-text-primary" style={{ backgroundColor: 'var(--color-option-bg)' }}>
                  {isEn ? (p.name_en || p.name_ar) : p.name_ar} (SKU: {p.sku})
                </option>
              ))}
            </select>
          </div>

          <Input
            label={isEn ? "Number of labels to print" : "عدد الملصقات لطباعتها في الورقة"}
            type="number"
            placeholder="12"
            value={printQty}
            onChange={(e) => setPrintQty(Math.max(1, parseInt(e.target.value || 0, 10)))}
          />

          {/* Columns Selector */}
          <div className={`flex flex-col gap-2 w-full ${isEn ? 'text-left' : 'text-right'}`}>
            <label className="text-[13px] font-medium text-text-secondary">{isEn ? 'Page Layout (Columns)' : 'توزيع الورقة (الأعمدة)'}</label>
            <select
              value={colsCount}
              onChange={(e) => setColsCount(parseInt(e.target.value, 10))}
              className="h-[52px] bg-subtle border border-default rounded-xl px-4 text-xs font-bold text-text-primary outline-none focus:border-accent-primary"
            >
              <option value={2} style={{ backgroundColor: 'var(--color-option-bg)' }}>{isEn ? '2 Columns' : 'عمودين (2)'}</option>
              <option value={3} style={{ backgroundColor: 'var(--color-option-bg)' }}>{isEn ? '3 Columns' : '3 أعمدة (3)'}</option>
              <option value={4} style={{ backgroundColor: 'var(--color-option-bg)' }}>{isEn ? '4 Columns' : '4 أعمدة (4)'}</option>
            </select>
          </div>

          {/* Additional Settings */}
          <div className={`flex flex-col gap-2 w-full ${isEn ? 'text-left' : 'text-right'}`}>
            <label className="text-[13px] font-medium text-text-secondary">{isEn ? 'Barcode Format' : 'صيغة الباركود'}</label>
            <select
              value={barcodeFormat}
              onChange={(e) => setBarcodeFormat(e.target.value)}
              className="h-[52px] bg-subtle border border-default rounded-xl px-4 text-xs font-bold text-text-primary outline-none focus:border-accent-primary"
            >
              <option value="CODE128" style={{ backgroundColor: 'var(--color-option-bg)' }}>CODE128 {isEn ? '(Default)' : '(افتراضي)'}</option>
              <option value="EAN13" style={{ backgroundColor: 'var(--color-option-bg)' }}>EAN-13</option>
              <option value="UPC" style={{ backgroundColor: 'var(--color-option-bg)' }}>UPC</option>
            </select>
          </div>
          
          <Input
            label={isEn ? "Store Name (Optional)" : "اسم المتجر (اختياري)"}
            type="text"
            placeholder={settings?.store_name || (isEn ? "Elegance Store" : "متجر الأناقة")}
            value={customStoreName}
            onChange={(e) => setCustomStoreName(e.target.value)}
          />

          {/* Toggle details */}
          <div className="flex flex-col gap-3.5 border-t border-light pt-4 text-xs font-bold text-text-secondary select-none">
            <label className={`flex items-center justify-between cursor-pointer ${isEn ? 'flex-row-reverse' : ''}`}>
              <input
                type="checkbox"
                checked={showStoreName}
                onChange={(e) => setShowStoreName(e.target.checked)}
                className="w-4 h-4 rounded border-accent-primary/30 bg-bg-secondary accent-accent-primary cursor-pointer outline-none focus:ring-0"
              />
              <span>{isEn ? 'Show Store Name on Label' : 'إظهار اسم المتجر على الملصق'}</span>
            </label>

            <label className={`flex items-center justify-between cursor-pointer ${isEn ? 'flex-row-reverse' : ''}`}>
              <input
                type="checkbox"
                checked={showName}
                onChange={(e) => setShowName(e.target.checked)}
                className="w-4 h-4 rounded border-accent-primary/30 bg-bg-secondary accent-accent-primary cursor-pointer outline-none focus:ring-0"
              />
              <span>{isEn ? 'Show Product Name on Label' : 'إظهار اسم المنتج على الملصق'}</span>
            </label>

            <label className={`flex items-center justify-between cursor-pointer ${isEn ? 'flex-row-reverse' : ''}`}>
              <input
                type="checkbox"
                checked={showPrice}
                onChange={(e) => setShowPrice(e.target.checked)}
                className="w-4 h-4 rounded border-accent-primary/30 bg-bg-secondary accent-accent-primary cursor-pointer outline-none focus:ring-0"
              />
              <span>{isEn ? 'Show Product Price on Label' : 'إظهار سعر المنتج على الملصق'}</span>
            </label>
          </div>

          <Button
            onClick={handlePrint}
            disabled={!activeProduct}
            className={`h-12 w-full mt-2 text-xs font-extrabold flex items-center justify-center gap-2 ${isEn ? 'flex-row-reverse' : ''}`}
          >
            <Printer className="w-4.5 h-4.5" />
            {isEn ? 'Start Printing Labels' : 'بدء طباعة الملصقات'}
          </Button>
        </div>
      </div>

      {/* 2. Sheet Preview Panel (2/3 width) */}
      <div className="lg:col-span-2 flex flex-col gap-5">
        <div className="glass-panel p-6 rounded-2xl border border-medium flex flex-col min-h-[480px]">
          <div className={`flex items-center justify-between border-b border-light pb-3 mb-5 select-none no-print ${isEn ? 'flex-row-reverse' : ''}`}>
            <Grid3X3 className="w-5 h-5 text-accent-primary" />
            <h3 className="text-sm font-black text-text-primary">{isEn ? 'Print Preview' : 'معاينة ورقة الملصقات قبل الطباعة'}</h3>
          </div>

          {activeProduct ? (
            /* Live sheet preview styled grid */
            <div
              className="barcode-sheet-grid grid gap-4 bg-subtle border border-light rounded-xl p-5"
              style={{
                gridTemplateColumns: `repeat(${colsCount}, minmax(0, 1fr))`
              }}
            >
              {Array.from({ length: printQty }).map((_, idx) => (
                <div
                  key={idx}
                  className="barcode-item-card bg-bg-card text-text-primary p-4.5 rounded-xl border border-default flex flex-col items-center justify-center shadow-card transition-transform hover:scale-[1.01]"
                >
                  {/* Shop label */}
                  {showStoreName && (
                    <span className="text-[10px] font-extrabold tracking-widest text-text-primary uppercase border-b border-light w-full pb-1 mb-1.5 text-center">
                      {customStoreName || settings?.store_name || (isEn ? 'Elegance Store' : 'متجر الأناقة')}
                    </span>
                  )}

                  {/* Name */}
                  {showName && (
                    <span className="text-xs font-black text-text-primary mb-1 text-center truncate max-w-[150px]">
                      {isEn ? (activeProduct.name_en || activeProduct.name_ar) : activeProduct.name_ar}
                    </span>
                  )}

                  {/* Barcode graphic */}
                  <div className="my-1.5 flex items-center justify-center">
                    <ReactBarcode
                      value={activeProduct.barcode}
                      format={barcodeFormat}
                      width={1.2}
                      height={40}
                      fontSize={10}
                      background="#ffffff"
                      lineColor="#000000"
                    />
                  </div>

                  {/* Price */}
                  {showPrice && (
                    <span className="text-[11px] font-extrabold text-accent-primary mt-1 border-t border-light w-full pt-1 text-center">
                      {isEn ? 'Price: ' : 'السعر: '} {activeProduct.sale_price.toLocaleString()} {settings?.currency || 'د.ج'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center gap-3 text-text-secondary text-sm my-auto">
              <QrCode className="w-12 h-12 text-accent-primary animate-pulse opacity-65" />
              <span>{isEn ? 'Select a product from the panel to generate barcode labels.' : 'قم باختيار صنف من القائمة الجانبية لتوليد ومعاينة الملصقات الفورية.'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
