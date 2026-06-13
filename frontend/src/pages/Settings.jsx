import React, { useState, useEffect } from 'react';
import useSettingsStore from '../store/useSettingsStore';
import useLicenseStore from '../store/useLicenseStore';
import useNotification from '../hooks/useNotification';
import {
  getBackups as getBackupsApi,
  createBackup as triggerBackupApi,
  downloadBackup as downloadBackupApi,
  restoreBackup as restoreBackupApi,
  deleteBackup as deleteBackupApi
} from '../api/backups.api';
import { uploadLogoApi, updateSettingApi, downloadDocumentationApi } from '../api/settings.api';
import {
  Store,
  Palette,
  Database,
  Info,
  ShieldAlert,
  Download,
  Trash2,
  RefreshCw,
  Printer,
  Image as ImageIcon,
  Upload,
  Copy,
  Fingerprint,
  Calendar,
  BadgeCheck
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Settings() {
  const { showSuccess, showError, showWarning } = useNotification();

  // Active Tab
  const [activeTab, setActiveTab] = useState('store'); // store, security, theme, backup, about

  // 1. Store Details State
  const { settings, updateSettings, loadSettings, loadLocalPreferences, accentColor, setAccentColor, fontSize, setFontSize, language } = useSettingsStore();
  const isEn = language === 'en';

  const [storeData, setStoreData] = useState({
    store_name: '',
    store_address: '',
    store_phone: '',
    currency: 'د.ج',
    tva_rate: '19',
    receipt_header: '',
    receipt_footer: '',
    receipt_show_sku: true,
    receipt_show_price: true,
    receipt_show_tva: true,
    receipt_show_qrcode: true
  });
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [currentLogo, setCurrentLogo] = useState('');
  const [isSavingStore, setIsSavingStore] = useState(false);

  useEffect(() => {
    const handler = (e) => setCurrentLogo(`${e.detail.newUrl}?t=${Date.now()}`);
    window.addEventListener('store-logo-updated', handler);
    return () => window.removeEventListener('store-logo-updated', handler);
  }, []);

  useEffect(() => {
    loadLocalPreferences();
  }, []);

  useEffect(() => {
    if (!useSettingsStore.getState().isLoaded) {
      loadSettings(true);
    }
  }, []);

  useEffect(() => {
    if (settings) {
      setStoreData({
        store_name: settings.store_name || '',
        store_address: settings.store_address || '',
        store_phone: settings.store_phone || '',
        currency: settings.currency || '',
        tva_rate: settings.tva_rate || '',
        receipt_header: settings.receipt_header || '',
        receipt_footer: settings.receipt_footer || '',
        receipt_show_sku: settings.receipt_show_sku ?? true,
        receipt_show_price: settings.receipt_show_price ?? true,
        receipt_show_tva: settings.receipt_show_tva ?? true,
        receipt_show_qrcode: settings.receipt_show_qrcode ?? true
      });
      if (settings.store_logo) setLogoUrl(settings.store_logo);
    }
  }, [settings]);

  const handleStoreSubmit = async (e) => {
    e.preventDefault();
    setIsSavingStore(true);
    try {
      await updateSettings(storeData);
      // Re-read fresh values from store to avoid stale closure references
      const fresh = useSettingsStore.getState().settings;
      setStoreData({
        store_name: fresh.store_name || '',
        store_address: fresh.store_address || '',
        store_phone: fresh.store_phone || '',
        currency: fresh.currency || '',
        tva_rate: fresh.tva_rate || '',
        receipt_header: fresh.receipt_header || '',
        receipt_footer: fresh.receipt_footer || '',
        receipt_show_sku: fresh.receipt_show_sku ?? true,
        receipt_show_price: fresh.receipt_show_price ?? true,
        receipt_show_tva: fresh.receipt_show_tva ?? true,
        receipt_show_qrcode: fresh.receipt_show_qrcode ?? true,
      });
      if (fresh.store_logo) setLogoUrl(fresh.store_logo);
      showSuccess(isEn ? 'Store details updated successfully!' : 'تم تحديث معلومات المتجر بنجاح!');
    } catch (err) {
      showError(isEn ? 'Failed to update store details' : 'فشل تحديث البيانات');
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optimistic: show local preview instantly with zero latency
    const localBlobUrl = URL.createObjectURL(file);
    setLogoPreview(localBlobUrl);
    setIsUploadingLogo(true);

    try {
      // Upload and get the clean public URL (no cache-buster in DB)
      const result = await uploadLogoApi(file);
      const publicUrl = result.data.url;
      await updateSettingApi('store_logo', publicUrl);
      useSettingsStore.getState().setLogo(publicUrl);
      setLogoUrl(publicUrl);
      setLogoPreview(null);
      URL.revokeObjectURL(localBlobUrl);
      // Broadcast to all listening components instantly
      window.dispatchEvent(new CustomEvent('store-logo-updated', { detail: { newUrl: publicUrl } }));
      showSuccess('تم رفع شعار المتجر بنجاح ✓');
    } catch (err) {
      showError('فشل رفع الشعار: ' + err.message);
      setLogoPreview(null);
      URL.revokeObjectURL(localBlobUrl);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // 3. Theme customizer
  const themeColors = [
    { name: isEn ? 'Neon Green' : 'الربيع الأخضر (Neon Green)', value: '#00FF7F' },
    { name: isEn ? 'Electric Blue' : 'أزرق الأناقة (Electric Blue)', value: '#00BFFF' },
    { name: isEn ? 'Royal Violet' : 'البنفسجي الملكي (Royal Violet)', value: '#8A2BE2' },
    { name: isEn ? 'Premium Pink' : 'الوردي الفاخر (Premium Pink)', value: '#FF1493' }
  ];

  // 4. Backups schedules history
  const [backups, setBackups] = useState([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isFetchingBackups, setIsFetchingBackups] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchBackupsList = async () => {
    setIsFetchingBackups(true);
    try {
      var list = await getBackupsApi();
      setBackups(list);
    } catch (e) {
      console.warn('Backup fetch failed', e);
    } finally {
      setIsFetchingBackups(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'backup') {
      fetchBackupsList();
    }
  }, [activeTab]);

  var totalSize = backups.reduce(function (sum, b) {
    return sum + (b.size || 0);
  }, 0);

  var lastBackup = backups.length > 0 ? backups[0] : null;
  var lastBackupAgo = '';
  if (lastBackup) {
    var diff = Date.now() - new Date(lastBackup.createdAt).getTime();
    var minutes = Math.floor(diff / 60000);
    if (minutes < 1) lastBackupAgo = isEn ? 'Just now' : 'الآن';
    else if (minutes < 60) lastBackupAgo = isEn ? minutes + ' min ago' : 'منذ ' + minutes + ' دقيقة';
    else if (minutes < 1440) lastBackupAgo = isEn ? Math.floor(minutes / 60) + ' hr ago' : 'منذ ' + Math.floor(minutes / 60) + ' ساعة';
    else lastBackupAgo = isEn ? Math.floor(minutes / 1440) + ' days ago' : 'منذ ' + Math.floor(minutes / 1440) + ' يوم';
  }

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    try {
      await triggerBackupApi();
      showSuccess(isEn ? 'Backup created successfully!' : 'تم إنشاء نسخة احتياطية بنجاح!');
      fetchBackupsList();
    } catch (err) {
      showError(isEn ? 'Failed to create backup' : 'فشل إنشاء النسخة الاحتياطية');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDownloadBackup = async (bk) => {
    try {
      var res = await downloadBackupApi(bk.filename);
      var url = window.URL.createObjectURL(new Blob([res.data]));
      var link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', bk.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showError(isEn ? 'Failed to download backup' : 'فشل تحميل النسخة الاحتياطية');
    }
  };

  const handleRestoreBackup = async (filename) => {
    try {
      await restoreBackupApi(filename);
      showSuccess(isEn ? 'Backup restored successfully!' : 'تم استرجاع النسخة الاحتياطية بنجاح!');
      setConfirmAction(null);
      fetchBackupsList();
    } catch (err) {
      showError(isEn ? 'Failed to restore backup' : 'فشل استرجاع النسخة الاحتياطية');
      setConfirmAction(null);
    }
  };

  const handleDeleteBackup = async (filename) => {
    try {
      await deleteBackupApi(filename);
      showSuccess(isEn ? 'Backup deleted successfully!' : 'تم حذف النسخة الاحتياطية بنجاح!');
      setConfirmAction(null);
      fetchBackupsList();
    } catch (err) {
      showError(isEn ? 'Failed to delete backup' : 'فشل حذف النسخة الاحتياطية');
      setConfirmAction(null);
    }
  };

  const formatFileSize = function (bytes) {
    if (!bytes) return '0 B';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  };

  const [isDownloadingDoc, setIsDownloadingDoc] = useState(false);
  const handleDownloadDocumentation = async () => {
    setIsDownloadingDoc(true);
    try {
      const res = await downloadDocumentationApi();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Parle_Noire_POS_Documentation.md');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess(isEn ? 'Documentation downloaded successfully!' : 'تم تنزيل دليل النظام بنجاح!');
    } catch (err) {
      showError(isEn ? 'Failed to download documentation' : 'فشل تحميل ملف دليل النظام');
    } finally {
      setIsDownloadingDoc(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-right pb-10 pt-6 select-none">
      
      {/* 1. Left side tab selectors (1/4 width) */}
      <div className="lg:col-span-1">
        <div className="glass-panel p-5 rounded-2xl border border-medium flex flex-col gap-2 select-none">
          <button
            onClick={() => setActiveTab('store')}
            className={`w-full h-12 rounded-xl flex items-center justify-end px-4 gap-3 font-bold text-xs transition-colors focus:outline-none ${
              activeTab === 'store'
                ? 'bg-active text-accent-primary'
                : 'text-text-secondary hover:bg-hover hover:text-text-primary'
            } ${isEn ? 'flex-row-reverse' : ''}`}
          >
            <span>{isEn ? 'Store Details' : 'معلومات المتجر'}</span>
            <Store className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={() => setActiveTab('receipt')}
            className={`w-full h-12 rounded-xl flex items-center justify-end px-4 gap-3 font-bold text-xs transition-colors focus:outline-none ${
              activeTab === 'receipt'
                ? 'bg-active text-accent-primary'
                : 'text-text-secondary hover:bg-hover hover:text-text-primary'
            } ${isEn ? 'flex-row-reverse' : ''}`}
          >
            <span>{isEn ? 'Receipt Settings' : 'إعدادات الفاتورة والطباعة'}</span>
            <Printer className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={() => setActiveTab('theme')}
            className={`w-full h-12 rounded-xl flex items-center justify-end px-4 gap-3 font-bold text-xs transition-colors focus:outline-none ${
              activeTab === 'theme'
                ? 'bg-active text-accent-primary'
                : 'text-text-secondary hover:bg-hover hover:text-text-primary'
            } ${isEn ? 'flex-row-reverse' : ''}`}
          >
            <span>{isEn ? 'Theme & Colors' : 'التخصيص والألوان'}</span>
            <Palette className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`w-full h-12 rounded-xl flex items-center justify-end px-4 gap-3 font-bold text-xs transition-colors focus:outline-none ${
              activeTab === 'backup'
                ? 'bg-active text-accent-primary'
                : 'text-text-secondary hover:bg-hover hover:text-text-primary'
            } ${isEn ? 'flex-row-reverse' : ''}`}
          >
            <span>{isEn ? 'Database Backup' : 'النسخ الاحتياطي (DB)'}</span>
            <Database className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`w-full h-12 rounded-xl flex items-center justify-end px-4 gap-3 font-bold text-xs transition-colors focus:outline-none ${
              activeTab === 'about'
                ? 'bg-active text-accent-primary'
                : 'text-text-secondary hover:bg-hover hover:text-text-primary'
            } ${isEn ? 'flex-row-reverse' : ''}`}
          >
            <span>{isEn ? 'About System' : 'حول النظام'}</span>
            <Info className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* 2. Right side configurations forms panel (3/4 width) */}
      <div className="lg:col-span-3">
        <div className="glass-panel p-8 rounded-2xl border border-medium min-h-[420px]">

          {/* License Information Banner */}
          {(() => {
            const lic = useLicenseStore.getState();
            if (!lic.serial) return null;
            return (
              <div className={`flex items-start gap-4 p-4 mb-6 rounded-xl bg-accent-primary/5 border border-accent-primary/15 ${isEn ? 'flex-row text-left' : 'flex-row-reverse text-right'}`}>
                <BadgeCheck className="w-8 h-8 flex-shrink-0 text-accent-primary mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className={`flex items-center gap-2 flex-wrap ${isEn ? '' : 'flex-row-reverse'}`}>
                    <span className="text-xs font-black text-accent-primary">{isEn ? 'Licensed Version' : 'نسخة مرخصة'}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent-primary/10 text-accent-primary font-bold border border-accent-primary/20">{isEn ? 'Active' : 'نشط'}</span>
                  </div>
                  <div className={`flex items-center gap-2 mt-2 flex-wrap ${isEn ? '' : 'flex-row-reverse'}`}>
                    <span className="text-[11px] font-mono font-bold text-text-primary tracking-wider select-all">{lic.serial}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(lic.serial); }}
                      className="p-1 text-text-secondary hover:text-accent-primary hover:bg-hover rounded-md transition-colors focus:outline-none"
                      title={isEn ? 'Copy Serial' : 'نسخ السيريال'}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className={`flex items-center gap-4 mt-2 text-[9px] font-bold text-text-disabled flex-wrap ${isEn ? '' : 'flex-row-reverse'}`}>
                    {lic.fingerprint && (
                      <span className="flex items-center gap-1">
                        <Fingerprint className="w-3 h-3" />
                        {isEn ? 'ID: ' : 'المعرف: '}{lic.fingerprint.substring(0, 16)}...
                      </span>
                    )}
                    {lic.activatedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {isEn ? 'Activated: ' : 'تاريخ التفعيل: '}{new Date(lic.activatedAt).toLocaleDateString(isEn ? 'en-US' : 'ar-DZ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 1: Store Information */}
          {activeTab === 'store' && (
            <form onSubmit={handleStoreSubmit} className={`flex flex-col gap-5 animate-fade-in ${isEn ? 'text-left' : ''}`}>
              <h3 className={`text-base font-extrabold text-text-primary border-b border-light pb-3 select-none ${isEn ? 'text-left' : ''}`}>
                {isEn ? 'General Store Details' : 'إعدادات المتجر العامة'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label={isEn ? "Store Name" : "اسم متجر الأزياء"}
                  value={storeData.store_name}
                  onChange={(e) => {
                    setStoreData(prev => ({ ...prev, store_name: e.target.value }));
                    useSettingsStore.setState({ storeName: e.target.value });
                  }}
                  required
                />
                <Input
                  label={isEn ? "Primary Phone" : "رقم الهاتف الأساسي"}
                  value={storeData.store_phone}
                  onChange={(e) => setStoreData(prev => ({ ...prev, store_phone: e.target.value }))}
                  required
                />
                <div className="md:col-span-2">
                  <Input
                    label={isEn ? "Full Address" : "العنوان البريدي الكامل"}
                    value={storeData.store_address}
                    onChange={(e) => setStoreData(prev => ({ ...prev, store_address: e.target.value }))}
                    required
                  />
                </div>
                <Input
                  label={isEn ? "Currency Symbol" : "رمز العملة المعروضة"}
                  value={storeData.currency}
                  onChange={(e) => setStoreData(prev => ({ ...prev, currency: e.target.value }))}
                  required
                />
                <Input
                  label={isEn ? "Default Tax (VAT %)" : "معدل الضريبة الافتراضي (TVA %)"}
                  type="number"
                  value={storeData.tva_rate}
                  onChange={(e) => setStoreData(prev => ({ ...prev, tva_rate: e.target.value }))}
                  required
                />
              </div>

              {/* Store Logo Upload */}
              <div className="border-t border-light pt-4 mt-2">
                <h4 className={`text-xs font-bold text-text-secondary mb-3 ${isEn ? 'text-left' : ''}`}>
                  {isEn ? 'Store Logo' : 'شعار المتجر'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(logoPreview || logoUrl) && (
                    <img
                      src={logoPreview || currentLogo || `${logoUrl}?t=${Date.now()}`}
                      alt="شعار المتجر"
                      style={{
                        width: '100px', height: '100px',
                        objectFit: 'contain', borderRadius: '12px',
                        border: '2px solid #eee'
                      }}
                    />
                  )}
                  <label style={{ cursor: 'pointer' }}>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoUpload}
                      style={{ display: 'none' }}
                    />
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '8px', padding: '12px 24px',
                      border: '2px dashed #ccc', borderRadius: '12px',
                      cursor: 'pointer', transition: 'all 0.2s',
                      background: isUploadingLogo ? '#f5f5f5' : 'white'
                    }}>
                      {isUploadingLogo ? (
                        <span>جاري الرفع...</span>
                      ) : (
                        <>
                          <span>↑</span>
                          <span>اختر صورة الشعار</span>
                        </>
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: '#999', marginTop: '4px', textAlign: 'center' }}>
                      PNG، JPG – حد أقصى 2 ميغابايت
                    </p>
                  </label>
                </div>
              </div>



              <div className={`flex mt-2 ${isEn ? 'justify-start' : 'justify-end'}`}>
                <Button type="submit" isLoading={isSavingStore} className="px-8 text-xs font-bold h-12">
                  {isEn ? 'Save Details' : 'حفظ معلومات المتجر'}
                </Button>
              </div>
            </form>
          )}

          {/* TAB: Receipt Configuration */}
          {activeTab === 'receipt' && (
            <form onSubmit={handleStoreSubmit} className={`flex flex-col gap-5 animate-fade-in ${isEn ? 'text-left' : ''}`}>
              <h3 className={`text-base font-extrabold text-text-primary border-b border-light pb-3 select-none ${isEn ? 'text-left' : ''}`}>
                {isEn ? 'Receipt Settings' : 'إعدادات طباعة الفاتورة'}
              </h3>

              <div className="flex flex-col gap-5">
                <Input
                  label={isEn ? "Welcome Message (Header)" : "رسالة ترحيبية (رأس الفاتورة)"}
                  value={storeData.receipt_header}
                  onChange={(e) => setStoreData(prev => ({ ...prev, receipt_header: e.target.value }))}
                />
                <Input
                  label={isEn ? "Thank You Message (Footer)" : "رسالة شكر وشروط الإرجاع (تذييل الفاتورة)"}
                  value={storeData.receipt_footer}
                  onChange={(e) => setStoreData(prev => ({ ...prev, receipt_footer: e.target.value }))}
                />
                
                <div className={`flex flex-col gap-3.5 border-t border-light pt-4 mt-2 text-xs font-bold text-text-secondary select-none`}>
                  <label className={`flex items-center justify-between cursor-pointer ${isEn ? 'flex-row-reverse' : ''}`}>
                    <input
                      type="checkbox"
                      checked={storeData.receipt_show_sku}
                      onChange={(e) => setStoreData(prev => ({ ...prev, receipt_show_sku: e.target.checked }))}
                      className="w-4 h-4 rounded border-accent-primary/30 bg-bg-secondary accent-accent-primary cursor-pointer outline-none focus:ring-0"
                    />
                    <span>{isEn ? 'Show SKU Codes' : 'إظهار كود SKU للأصناف'}</span>
                  </label>

                  <label className={`flex items-center justify-between cursor-pointer ${isEn ? 'flex-row-reverse' : ''}`}>
                    <input
                      type="checkbox"
                      checked={storeData.receipt_show_price}
                      onChange={(e) => setStoreData(prev => ({ ...prev, receipt_show_price: e.target.checked }))}
                      className="w-4 h-4 rounded border-accent-primary/30 bg-bg-secondary accent-accent-primary cursor-pointer outline-none focus:ring-0"
                    />
                    <span>{isEn ? 'Show Individual Prices' : 'إظهار السعر الفردي للأصناف'}</span>
                  </label>

                  <label className={`flex items-center justify-between cursor-pointer ${isEn ? 'flex-row-reverse' : ''}`}>
                    <input
                      type="checkbox"
                      checked={storeData.receipt_show_tva}
                      onChange={(e) => setStoreData(prev => ({ ...prev, receipt_show_tva: e.target.checked }))}
                      className="w-4 h-4 rounded border-accent-primary/30 bg-bg-secondary accent-accent-primary cursor-pointer outline-none focus:ring-0"
                    />
                    <span>{isEn ? 'Show Tax/VAT Details' : 'إظهار تفاصيل الضريبة TVA'}</span>
                  </label>

                  <label className={`flex items-center justify-between cursor-pointer ${isEn ? 'flex-row-reverse' : ''}`}>
                    <input
                      type="checkbox"
                      checked={storeData.receipt_show_qrcode}
                      onChange={(e) => setStoreData(prev => ({ ...prev, receipt_show_qrcode: e.target.checked }))}
                      className="w-4 h-4 rounded border-accent-primary/30 bg-bg-secondary accent-accent-primary cursor-pointer outline-none focus:ring-0"
                    />
                    <span>{isEn ? 'Print Verification QR Code' : 'طباعة كود QR للتحقق'}</span>
                  </label>
                </div>
              </div>

              <div className={`flex mt-2 ${isEn ? 'justify-start' : 'justify-end'}`}>
                <Button type="submit" isLoading={isSavingStore} className="px-8 text-xs font-bold h-12">
                  {isEn ? 'Save Receipt Settings' : 'حفظ إعدادات الفاتورة'}
                </Button>
              </div>
            </form>
          )}



          {/* TAB 3: Theme customization */}
          {activeTab === 'theme' && (
            <div className={`flex flex-col gap-5 animate-fade-in ${isEn ? 'text-left' : ''}`}>
              <h3 className={`text-base font-extrabold text-text-primary border-b border-light pb-3 select-none ${isEn ? 'text-left' : ''}`}>
                {isEn ? 'Theme & Interface Customization' : 'تخصيص ألوان وتصميم الواجهات'}
              </h3>

              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold text-text-secondary">{isEn ? 'Accent Color & Active Links' : 'لون التمييز والروابط النشطة'}</h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {themeColors.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setAccentColor(color.value)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border font-bold text-[10px] transition-all focus:outline-none ${
                        accentColor === color.value
                          ? 'border-accent-primary bg-hover text-accent-primary'
                          : 'border-medium text-text-secondary hover:border-text-secondary'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: color.value }} />
                      <span>{color.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4 border-t border-light pt-4 mt-2">
                <h4 className="text-xs font-bold text-text-secondary">{isEn ? 'UI Font Size' : 'حجم خطوط القوائم'}</h4>
                
                <div className={`flex gap-3 ${isEn ? 'flex-row-reverse' : ''}`}>
                  {['small', 'normal', 'large'].map(size => (
                    <button
                      key={size}
                      onClick={() => setFontSize(size)}
                      className={`text-xs font-bold px-5 py-2.5 rounded-xl border transition-all focus:outline-none ${
                        fontSize === size
                          ? 'border-accent-primary bg-hover text-accent-primary'
                          : 'border-medium text-text-secondary hover:border-text-secondary'
                      }`}
                    >
                      {isEn 
                        ? (size === 'small' ? 'Small' : size === 'normal' ? 'Normal' : 'Large') 
                        : (size === 'small' ? 'صغير' : size === 'normal' ? 'افتراضي' : 'كبير')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Database Backup management */}
          {activeTab === 'backup' && (
            <div className={`flex flex-col gap-5 animate-fade-in select-none ${isEn ? 'text-left' : ''}`}>
              <div className={`flex items-center justify-between border-b border-light pb-3 ${isEn ? 'flex-row-reverse' : ''}`}>
                <Button
                  onClick={handleBackupNow}
                  isLoading={isBackingUp}
                  className={`h-10 text-[10px] font-black px-4 flex items-center justify-center gap-1.5 ${isEn ? 'flex-row-reverse' : ''}`}
                >
                  <Download className="w-4 h-4" />
                  {isEn ? 'Backup Now' : 'إنشاء نسخة احتياطية الآن'}
                </Button>

                <h3 className="text-sm font-black text-text-primary">{isEn ? 'Backup Management' : 'إدارة النسخ الاحتياطية'}</h3>
              </div>

              <div className={`flex items-center gap-3 p-4 bg-accent-primary/5 border border-accent-primary/18 rounded-xl text-xs font-bold text-text-secondary leading-relaxed ${isEn ? 'flex-row-reverse text-left' : 'text-right'}`}>
                <ShieldAlert className="w-5.5 h-5.5 flex-shrink-0 text-accent-primary" />
                <p className="flex-grow">
                  {isEn
                    ? 'The system automatically creates a backup every hour. Only the last 10 auto-backups are kept.'
                    : 'النظام يقوم بإنشاء نسخة احتياطية تلقائياً كل ساعة. يحتفظ بآخر 10 نسخ فقط.'}
                </p>
              </div>

              <div className={`flex flex-wrap gap-3 text-xs font-bold text-text-secondary ${isEn ? '' : ''}`}>
                <div className="px-3 py-2 rounded-xl bg-subtle border border-light">
                  <span className="text-text-disabled">{isEn ? 'Backups: ' : 'عدد النسخ: '}</span>
                  <span className="text-text-primary">{backups.length}</span>
                </div>
                <div className="px-3 py-2 rounded-xl bg-subtle border border-light">
                  <span className="text-text-disabled">{isEn ? 'Total size: ' : 'الحجم الإجمالي: '}</span>
                  <span className="text-text-primary">{formatFileSize(totalSize)}</span>
                </div>
                <div className="px-3 py-2 rounded-xl bg-subtle border border-light">
                  <span className="text-text-disabled">{isEn ? 'Latest: ' : 'آخر نسخة: '}</span>
                  <span className="text-text-primary">{lastBackupAgo || (isEn ? 'None' : 'لا توجد')}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-1">
                <div className={`flex justify-between items-center text-xs font-bold text-text-secondary mb-1 ${isEn ? 'flex-row-reverse' : ''}`}>
                  <button
                    onClick={fetchBackupsList}
                    className="p-1 text-accent-primary hover:bg-hover rounded-lg transition-colors focus:outline-none"
                    title={isEn ? 'Refresh List' : 'تحديث القائمة'}
                  >
                    <RefreshCw className={`w-4 h-4 ${isFetchingBackups ? 'animate-spin' : ''}`} />
                  </button>
                  <span>{isEn ? 'Backup History' : 'سجل النسخ الاحتياطية'}</span>
                </div>

                <div className="max-h-64 overflow-y-auto flex flex-col gap-2 pr-1">
                  {isFetchingBackups ? (
                    <div className="text-center py-6 text-xs text-text-secondary">{isEn ? 'Refreshing list...' : 'جاري تحديث القائمة...'}</div>
                  ) : backups.length === 0 ? (
                    <div className="text-center py-6 text-xs text-text-secondary">{isEn ? 'No backups available.' : 'لا توجد نسخ احتياطية.'}</div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <div className={`grid grid-cols-12 gap-2 px-3 py-2 text-[9px] font-black text-text-disabled uppercase tracking-wider ${isEn ? 'text-left' : 'text-right'}`}>
                        <div className="col-span-5">{isEn ? 'Filename' : 'اسم الملف'}</div>
                        <div className="col-span-2">{isEn ? 'Size' : 'الحجم'}</div>
                        <div className="col-span-3">{isEn ? 'Date' : 'التاريخ'}</div>
                        <div className="col-span-2">{isEn ? 'Actions' : 'إجراءات'}</div>
                      </div>
                      {backups.map(function (bk, idx) {
                        return (
                          <div
                            key={bk.filename || idx}
                            className={`grid grid-cols-12 gap-2 items-center p-3 rounded-xl bg-subtle border border-accent-primary/4 text-xs font-bold hover:border-accent-primary/20 transition-all group ${isEn ? 'text-left' : 'text-right'}`}
                          >
                            <div className="col-span-5 text-text-primary truncate text-[11px]" title={bk.filename}>
                              {bk.filename}
                            </div>
                            <div className="col-span-2 text-text-disabled text-[10px]">
                              {formatFileSize(bk.size)}
                            </div>
                            <div className="col-span-3 text-text-disabled text-[9px]">
                              {new Date(bk.createdAt).toLocaleString(isEn ? 'en-US' : 'ar-DZ')}
                            </div>
                            <div className={`col-span-2 flex items-center gap-1 ${isEn ? '' : 'justify-end'}`}>
                              <button
                                onClick={function () { handleDownloadBackup(bk); }}
                                className="p-1.5 text-text-secondary hover:text-accent-primary hover:bg-hover rounded-lg transition-colors"
                                title={isEn ? 'Download' : 'تحميل'}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={function () { setConfirmAction({ type: 'restore', filename: bk.filename }); }}
                                className="p-1.5 text-text-secondary hover:text-green-500 hover:bg-hover rounded-lg transition-colors"
                                title={isEn ? 'Restore' : 'استرجاع'}
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={function () { setConfirmAction({ type: 'delete', filename: bk.filename }); }}
                                className="p-1.5 text-text-secondary hover:text-status-danger hover:bg-hover rounded-lg transition-colors"
                                title={isEn ? 'Delete' : 'حذف'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Confirmation dialog overlay */}
          {confirmAction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={function () { setConfirmAction(null); }}>
              <div className="glass-panel p-6 rounded-2xl border border-medium max-w-sm w-full mx-4 shadow-2xl" onClick={function (e) { e.stopPropagation(); }}>
                <div className={`flex flex-col gap-4 ${isEn ? 'text-left' : 'text-right'}`}>
                  <h4 className="text-sm font-black text-text-primary">
                    {confirmAction.type === 'restore'
                      ? (isEn ? 'Restore Backup' : 'استرجاع نسخة احتياطية')
                      : (isEn ? 'Delete Backup' : 'حذف نسخة احتياطية')}
                  </h4>

                  {confirmAction.type === 'restore' ? (
                    <div className="flex flex-col gap-2 text-xs font-bold text-text-secondary leading-relaxed">
                      <p>{isEn ? 'Are you sure you want to restore from this backup?' : 'هل أنت متأكد من الاسترجاع من هذه النسخة؟'}</p>
                      <p className="text-status-warning">{isEn ? 'A safety backup of the current state will be created first. The server may need to restart afterward.' : 'سيتم إنشاء نسخة احتياطية من الحالة الحالية أولاً. السيرفر قد يحتاج لإعادة التشغيل.'}</p>
                      <p className="mt-1 text-text-primary font-black text-[11px] break-all">{confirmAction.filename}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 text-xs font-bold text-text-secondary leading-relaxed">
                      <p>{isEn ? 'Are you sure you want to delete this backup?' : 'هل أنت متأكد من حذف هذه النسخة الاحتياطية؟'}</p>
                      <p className="text-status-danger">{isEn ? 'This action cannot be undone.' : 'هذا الإجراء لا يمكن التراجع عنه.'}</p>
                      <p className="mt-1 text-text-primary font-black text-[11px] break-all">{confirmAction.filename}</p>
                    </div>
                  )}

                  <div className={`flex gap-3 mt-2 ${isEn ? 'flex-row-reverse' : ''}`}>
                    <Button
                      onClick={function () {
                        if (confirmAction.type === 'restore') {
                          handleRestoreBackup(confirmAction.filename);
                        } else {
                          handleDeleteBackup(confirmAction.filename);
                        }
                      }}
                      className={`h-10 text-[10px] font-black px-5 ${confirmAction.type === 'delete' ? 'bg-status-danger text-white border-status-danger' : ''}`}
                    >
                      {confirmAction.type === 'restore'
                        ? (isEn ? 'Yes, Restore' : 'نعم، استرجع')
                        : (isEn ? 'Yes, Delete' : 'نعم، احذف')}
                    </Button>
                    <Button
                      onClick={function () { setConfirmAction(null); }}
                      className="h-10 text-[10px] font-black px-5"
                      variant="outline"
                    >
                      {isEn ? 'Cancel' : 'إلغاء'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Technical Details of the POS System */}
          {activeTab === 'about' && (
            <div className={`flex flex-col gap-5 animate-fade-in ${isEn ? 'text-left' : 'text-right'}`}>
              <h3 className={`text-base font-extrabold text-text-primary border-b border-light pb-3 select-none ${isEn ? 'text-left' : 'text-right'}`}>
                {isEn ? `About ${settings.store_name} POS System` : `تفاصيل حول نظام كاشير ${settings.store_name}`}
              </h3>

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 leading-relaxed text-xs font-bold text-text-secondary ${isEn ? 'text-left' : 'text-right'}`}>
                <div className="flex flex-col gap-2">
                  <span className={`text-text-primary text-[13px] font-black border-b border-text-disabled/10 pb-1 ${isEn ? 'text-left' : 'text-right'}`}>
                    {isEn ? 'Architecture & Technologies' : 'الهندسة البرمجية والتقنيات'}
                  </span>
                  <span>{isEn ? 'Frontend: React 18 + Zustand + Vite + TailwindCSS' : 'الواجهة: React 18 + Zustand state + Vite + TailwindCSS 3'}</span>
                  <span>{isEn ? 'Backend: Node.js 24 + Express framework' : 'الخادم: Node.js 24 + Express framework'}</span>
                  <span>{isEn ? 'Database: SQLite3 (Pure-JS SQLite Emulator)' : 'قاعدة البيانات: SQLite3 (مع محرك Pure-JS SQLite Drop-in Emulator)'}</span>
                  <span>{isEn ? 'AI Integration: Groq (Mixtral 8x7B)' : 'مساعد الذكاء الاصطناعي: Groq (Mixtral 8x7B)'}</span>
                </div>

                <div className="flex flex-col gap-2">
                  <span className={`text-text-primary text-[13px] font-black border-b border-text-disabled/10 pb-1 ${isEn ? 'text-left' : 'text-right'}`}>
                    {isEn ? 'Features & Security' : 'مزايا وحماية النظام'}
                  </span>
                  <span>{isEn ? '● Encrypted checkout and persistent short-stock protection' : '● تشفير تشيك أوت المبيعات وحماية النواقص المستمرة'}</span>
                  <span>{isEn ? '● High-velocity keypress HID barcode parsing' : '● ممسك باركود HID ذو سرعة تردد keypress Velocity'}</span>
                  <span>{isEn ? '● Secure password hashing & algorithmic strength evaluation' : '● نظام تشفير وحساب قوة كلمة المرور بالخوارزميات'}</span>
                  <span>{isEn ? '● Auto-scheduled robust database backups' : '● حماية وحفظ النسخ الاحتياطية المتكررة التلقائية'}</span>
                </div>
              </div>

              <div className={`flex flex-col gap-3 border-t border-light pt-5 mt-4 leading-relaxed text-xs font-bold text-text-secondary ${isEn ? 'text-left' : 'text-right'}`}>
                <span className={`text-text-primary text-[13px] font-black border-b border-text-disabled/10 pb-1 flex items-center gap-2 ${isEn ? '' : 'flex-row-reverse'}`}>
                  <span>🔒</span>
                  <span>{isEn ? 'Privacy Policy' : 'سياسة الخصوصية'}</span>
                </span>
                <span>{isEn ? 'All data entered in this system is the exclusive property of the merchant.' : 'جميع البيانات المدخلة في هذا النظام هي ملك حصري للتاجر.'}</span>
                <span>{isEn ? 'No data is shared with third parties.' : 'لا يتم مشاركة أي بيانات مع أطراف ثالثة.'}</span>
                <span>{isEn ? 'Data is stored locally on the device and on a secure encrypted database.' : 'يتم تخزين البيانات محلياً على الجهاز وعلى قاعدة بيانات آمنة مشفرة.'}</span>
                <span>{isEn ? 'Passwords are encrypted and cannot be accessed by anyone.' : 'كلمات المرور مشفرة ولا يمكن لأحد الاطلاع عليها.'}</span>
                <span>{isEn ? 'The merchant has the right to delete all their data at any time through the backup page.' : 'يحق للتاجر حذف جميع بياناته في أي وقت من خلال صفحة النسخ الاحتياطي.'}</span>
                <span>{isEn ? 'This system is intended for internal commercial use only.' : 'هذا النظام مخصص للاستخدام التجاري الداخلي فقط.'}</span>
              </div>

              {/* Documentation download section */}
              <div className={`flex flex-col gap-3 border-t border-light pt-5 mt-4 text-xs font-bold text-text-secondary ${isEn ? 'text-left' : 'text-right'}`}>
                <span className={`text-text-primary text-[13px] font-black border-b border-text-disabled/10 pb-1 flex items-center gap-2 ${isEn ? '' : 'flex-row-reverse'}`}>
                  <span>📚</span>
                  <span>{isEn ? 'System Documentation' : 'دليل استخدام النظام وتوثيقه'}</span>
                </span>
                <span>{isEn ? 'Click the button below to download the comprehensive System Documentation file (Markdown format).' : 'انقر فوق الزر أدناه لتنزيل ملف التوثيق الشامل ودليل استخدام النظام (بصيغة Markdown).'}</span>
                <div className={`flex ${isEn ? 'justify-start' : 'justify-end'} mt-2`}>
                  <Button
                    onClick={handleDownloadDocumentation}
                    isLoading={isDownloadingDoc}
                    className={`h-10 text-[10px] font-black px-4 flex items-center justify-center gap-1.5 ${isEn ? 'flex-row-reverse' : ''}`}
                    type="button"
                  >
                    <Download className="w-4 h-4" />
                    {isEn ? 'Download Documentation (.md)' : 'تنزيل ملف دليل استخدام النظام (.md)'}
                  </Button>
                </div>
              </div>

              <div className="border-t border-light pt-5 mt-4 text-center text-[10px] font-black text-text-disabled select-none">
                <span>{isEn ? `${settings.store_name} POS System • Licensed Version 1.0 • Proudly built in Algeria` : `${settings.store_name} POS • النسخة المرخصة 1.0 • صُنع بكل فخر بالجزائر`}</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
