import React, { useState, useEffect } from 'react';
import useNotification from '../hooks/useNotification';
import usePrint from '../hooks/usePrint';
import useSettingsStore from '../store/useSettingsStore';
import { Printer, Settings, CheckCircle2, Sliders, Receipt } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Print() {
  const { showSuccess, showError } = useNotification();
  const { printReceipt } = usePrint();
  const { settings, updateSettings, loadLocalPreferences, language } = useSettingsStore();
  const [isSavingReceipt, setIsSavingReceipt] = useState(false);
  const isEn = language === 'en';

  const [formData, setFormData] = useState({
    store_name: '',
    store_address: '',
    store_phone: '',
    receipt_header: '',
    receipt_footer: '',
    receipt_show_sku: true,
    receipt_show_price: true,
    receipt_show_tva: true,
    receipt_show_qrcode: true
  });

  useEffect(() => {
    loadLocalPreferences();
  }, []);

  useEffect(() => {
    if (settings) {
      setFormData({
        store_name: settings.store_name || '',
        store_address: settings.store_address || '',
        store_phone: settings.store_phone || '',
        receipt_header: settings.receipt_header || '',
        receipt_footer: settings.receipt_footer || '',
        receipt_show_sku: settings.receipt_show_sku !== false,
        receipt_show_price: settings.receipt_show_price !== false,
        receipt_show_tva: settings.receipt_show_tva !== false,
        receipt_show_qrcode: settings.receipt_show_qrcode !== false
      });
    }
  }, [settings]);

  const handleToggle = (key) => {
    setFormData(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSavingReceipt(true);
    try {
      await updateSettings(formData);
      showSuccess(isEn ? 'Receipt settings saved successfully!' : 'تم حفظ إعدادات طابعة الكاشير وتصميم الترويسة بنجاح!');
    } catch (err) {
      showError(isEn ? 'Failed to save settings' : 'فشل حفظ الإعدادات');
    } finally {
      setIsSavingReceipt(false);
    }
  };

  const handleTestPrint = () => {
    printReceipt('thermal');
    showSuccess(isEn ? 'Test receipt sent to the default printer' : 'تم إرسال فاتورة اختبار الكاشير إلى الطابعة الافتراضية');
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10 pt-6 select-none ${isEn ? 'text-left' : 'text-right'}`}>
      
      {/* 1. Print Config Forms (2/3 width) */}
      <div className="lg:col-span-2 flex flex-col gap-5">
        <form onSubmit={handleSave} className="glass-panel p-6 rounded-2xl border border-medium flex flex-col gap-5">
          <div className={`flex items-center justify-between border-b border-light pb-3 ${isEn ? 'flex-row-reverse' : ''}`}>
            <Sliders className="w-5 h-5 text-accent-primary animate-pulse" />
            <h3 className="text-sm font-black text-text-primary">{isEn ? 'Receipt Customization & Design' : 'مخصّص ومصمم فواتير الكاشير'}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={isEn ? "Store Name on Header" : "اسم المحل في الترويسة"}
              value={formData.store_name}
              onChange={(e) => setFormData(prev => ({ ...prev, store_name: e.target.value }))}
              required
            />
            <Input
              label={isEn ? "Phone Number" : "رقم الهاتف"}
              value={formData.store_phone}
              onChange={(e) => setFormData(prev => ({ ...prev, store_phone: e.target.value }))}
              required
            />
            <div className="md:col-span-2">
              <Input
                label={isEn ? "Store Address" : "العنوان الجغرافي للمتجر"}
                value={formData.store_address}
                onChange={(e) => setFormData(prev => ({ ...prev, store_address: e.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label={isEn ? "Header Slogan / Welcome Message" : "سلوجان / عبارة الترحيب العلوية"}
                value={formData.receipt_header}
                onChange={(e) => setFormData(prev => ({ ...prev, receipt_header: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[13px] font-medium text-text-secondary select-none mb-2 block">{isEn ? 'Return Policy & Footer Message' : 'سياسة الإرجاع والعبارة السفلية'}</label>
              <textarea
                value={formData.receipt_footer}
                onChange={(e) => setFormData(prev => ({ ...prev, receipt_footer: e.target.value }))}
                className={`w-full h-20 bg-subtle border border-default rounded-xl p-3 text-xs font-bold outline-none focus:border-accent-primary ${isEn ? 'text-left' : 'text-right'}`}
              />
            </div>
          </div>

          {/* Toggle buttons lists */}
          <div className="border-t border-light pt-4 flex flex-col gap-3 text-xs font-bold text-text-secondary">
            <h4 className="text-[13px] font-extrabold text-text-primary mb-1">{isEn ? 'Receipt Details Options' : 'تفاصيل الفاتورة المطلوبة'}</h4>
            
            <div className={`grid grid-cols-2 gap-4 select-none ${isEn ? 'dir-ltr' : ''}`}>
              <label className={`flex items-center justify-between p-3 rounded-xl border border-light bg-bg-secondary/40 cursor-pointer ${isEn ? 'flex-row-reverse' : ''}`}>
                <input
                  type="checkbox"
                  checked={formData.receipt_show_sku}
                  onChange={() => handleToggle('receipt_show_sku')}
                  className="w-4 h-4 rounded border-accent-primary/30 bg-bg-secondary accent-accent-primary cursor-pointer outline-none focus:ring-0"
                />
                <span>{isEn ? 'Show SKU Code on Items' : 'إظهار رمز الـ SKU للملابس'}</span>
              </label>

              <label className={`flex items-center justify-between p-3 rounded-xl border border-light bg-bg-secondary/40 cursor-pointer ${isEn ? 'flex-row-reverse' : ''}`}>
                <input
                  type="checkbox"
                  checked={formData.receipt_show_price}
                  onChange={() => handleToggle('receipt_show_price')}
                  className="w-4 h-4 rounded border-accent-primary/30 bg-bg-secondary accent-accent-primary cursor-pointer outline-none focus:ring-0"
                />
                <span>{isEn ? 'Show Original Price' : 'إظهار سعر التخفيض الأصلي'}</span>
              </label>

              <label className={`flex items-center justify-between p-3 rounded-xl border border-light bg-bg-secondary/40 cursor-pointer ${isEn ? 'flex-row-reverse' : ''}`}>
                <input
                  type="checkbox"
                  checked={formData.receipt_show_tva}
                  onChange={() => handleToggle('receipt_show_tva')}
                  className="w-4 h-4 rounded border-accent-primary/30 bg-bg-secondary accent-accent-primary cursor-pointer outline-none focus:ring-0"
                />
                <span>{isEn ? `Show VAT ${settings.tva_rate || 0}%` : `إظهار قيمة الضريبة TVA ${settings.tva_rate || 0}%`}</span>
              </label>

              <label className={`flex items-center justify-between p-3 rounded-xl border border-light bg-bg-secondary/40 cursor-pointer ${isEn ? 'flex-row-reverse' : ''}`}>
                <input
                  type="checkbox"
                  checked={formData.receipt_show_qrcode}
                  onChange={() => handleToggle('receipt_show_qrcode')}
                  className="w-4 h-4 rounded border-accent-primary/30 bg-bg-secondary accent-accent-primary cursor-pointer outline-none focus:ring-0"
                />
                <span>{isEn ? 'Include QR Code in Footer' : 'إدراج رمز QR كود في ذيل الفاتورة'}</span>
              </label>
            </div>
          </div>

          <div className={`flex gap-3 border-t border-light pt-4 mt-2 ${isEn ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
            <Button
              type="button"
              onClick={handleTestPrint}
              variant="secondary"
              className="h-12 px-6 text-xs font-bold"
            >
              {isEn ? 'Print Test Receipt' : 'طباعة تجريبية الفورية'}
            </Button>
            
            <Button
              type="submit"
              variant="primary"
              isLoading={isSavingReceipt}
              className="h-12 px-8 text-xs font-bold"
            >
              {isEn ? 'Save Settings' : 'حفظ تصميم الفواتير'}
            </Button>
          </div>
        </form>
      </div>

      {/* 2. Receipt Preview Simulator (1/3 width) */}
      <div className="flex flex-col gap-5">
        <div className="glass-panel p-6 rounded-2xl border border-medium flex flex-col min-h-[480px]">
          <div className={`flex items-center justify-between border-b border-light pb-3 mb-5 select-none ${isEn ? 'flex-row-reverse' : ''}`}>
            <Receipt className="w-5 h-5 text-accent-primary" />
            <h3 className="text-sm font-black text-text-primary">{isEn ? 'Live Receipt Preview' : 'محاكي شكل فاتورة الكاشير الحية'}</h3>
          </div>

          {/* Simulated 80mm ticket mockup */}
          <div className="bg-bg-card text-text-primary p-5 rounded-lg font-mono text-[10px] flex flex-col gap-2.5 shadow-2xl w-full max-w-[270px] mx-auto border border-default leading-relaxed">
            
            {/* Header store details */}
            <div className="flex flex-col items-center text-center gap-1.5 border-b border-dashed border-medium pb-2">
              <span className="text-xs font-extrabold uppercase tracking-widest">{formData.store_name}</span>
              <span>{formData.receipt_header}</span>
              <span>{isEn ? 'Tel:' : 'هاتف:'} {formData.store_phone}</span>
              <span>{isEn ? 'Address:' : 'العنوان:'} {formData.store_address}</span>
            </div>

            {/* Invoiced items list mockup */}
            <div className="flex flex-col gap-1 border-b border-dashed border-medium pb-2">
              <div className={`flex justify-between font-bold text-[9px] border-b border-light pb-1 mb-1 ${isEn ? 'flex-row-reverse' : ''}`}>
                <span>{isEn ? 'Total' : 'المجموع'}</span>
                <span>{isEn ? 'Price' : 'السعر'}</span>
                <span>{isEn ? 'Qty' : 'الكمية'}</span>
                <span className={`w-24 ${isEn ? 'text-left' : 'text-right'}`}>{isEn ? 'Item' : 'الصنف'}</span>
              </div>

              <div className={`flex justify-between ${isEn ? 'flex-row-reverse' : ''}`}>
                <span>5,500 {isEn ? 'DZD' : 'د.ج'}</span>
                <span>5,500</span>
                <span>1</span>
                <div className={`flex flex-col w-24 ${isEn ? 'text-left' : 'text-right'}`}>
                  <span className="font-bold">{isEn ? 'Black Evening Dress' : 'فستان سهرة أسود'}</span>
                  {formData.receipt_show_sku && <span className="text-[7px] text-text-secondary">SKU-8342</span>}
                </div>
              </div>

              <div className={`flex justify-between mt-1 ${isEn ? 'flex-row-reverse' : ''}`}>
                <span>3,200 {isEn ? 'DZD' : 'د.ج'}</span>
                <span>1,600</span>
                <span>2</span>
                <div className={`flex flex-col w-24 ${isEn ? 'text-left' : 'text-right'}`}>
                  <span className="font-bold">{isEn ? 'Leather Handbag' : 'حقيبة يد جلدية'}</span>
                  {formData.receipt_show_sku && <span className="text-[7px] text-text-secondary">SKU-1024</span>}
                </div>
              </div>
            </div>

            {/* Calculations mockup */}
            <div className="flex flex-col gap-1 text-[9px] border-b border-dashed border-medium pb-2">
              <div className={`flex justify-between ${isEn ? 'flex-row-reverse' : ''}`}>
                <span>8,700 {isEn ? 'DZD' : 'د.ج'}</span>
                <span>{isEn ? 'Subtotal' : 'المجموع الفرعي'}</span>
              </div>
              {formData.receipt_show_tva && (
                <div className={`flex justify-between text-[8px] text-text-secondary ${isEn ? 'flex-row-reverse' : ''}`}>
                  <span>1,389 {isEn ? 'DZD' : 'د.ج'}</span>
                  <span>{isEn ? `VAT ${settings.tva_rate || 0}%` : `الضريبة TVA ${settings.tva_rate || 0}%`}</span>
                </div>
              )}
              <div className={`flex justify-between font-bold text-xs mt-1 border-t border-light pt-1 text-accent-primary ${isEn ? 'flex-row-reverse' : ''}`}>
                <span>8,700 {isEn ? 'DZD' : 'د.ج'}</span>
                <span>{isEn ? 'Final Total' : 'الإجمالي النهائي'}</span>
              </div>
            </div>

            {/* Footer receipt details */}
            <div className="flex flex-col items-center text-center gap-2 pt-1 text-[8px] text-text-secondary">
              <p className="max-w-[200px] leading-normal">{formData.receipt_footer}</p>
              
              {formData.receipt_show_qrcode && (
                <div className="w-12 h-12 bg-bg-card border border-default flex items-center justify-center font-bold text-text-primary text-[6px]">
                  [QR CODE]
                </div>
              )}

              <span>{isEn ? 'Invoice No:' : 'رقم الفاتورة:'} INV-20260518-0012</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

