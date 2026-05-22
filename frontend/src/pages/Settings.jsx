import React, { useState, useEffect } from 'react';
import useAuthStore from '../store/useAuthStore';
import useSettingsStore from '../store/useSettingsStore';
import useNotification from '../hooks/useNotification';
import { checkPasswordStrength } from '../utils/validators';
import { getBackupsApi, triggerBackupApi, downloadBackupApi } from '../api/reports.api';
import { sendChangePasswordOTPApi } from '../api/auth.api';
import { uploadLogoApi, updateSettingApi } from '../api/settings.api';
import {
  Store,
  Lock,
  Palette,
  Database,
  Info,
  ShieldAlert,
  Download,
  Trash2,
  RefreshCw,
  Printer,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Settings() {
  const { showSuccess, showError, showWarning } = useNotification();

  // Active Tab
  const [activeTab, setActiveTab] = useState('store'); // store, security, theme, backup, about

  // 1. Store Details State
  const { settings, updateSettings, loadLocalPreferences, accentColor, setAccentColor, fontSize, setFontSize, language } = useSettingsStore();
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

  useEffect(() => {
    const handler = (e) => setCurrentLogo(`${e.detail.newUrl}?t=${Date.now()}`);
    window.addEventListener('store-logo-updated', handler);
    return () => window.removeEventListener('store-logo-updated', handler);
  }, []);

  useEffect(() => {
    loadLocalPreferences();
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
    try {
      await updateSettings(storeData);
      showSuccess(isEn ? 'Store details updated successfully!' : 'تم تحديث معلومات المتجر بنجاح!');
    } catch (err) {
      showError(isEn ? 'Failed to update store details' : 'فشل تحديث البيانات');
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
      const publicUrl = await uploadLogoApi(file);
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

  // 2. Security Change Password State (OTP 2FA)
  const changePassword = useAuthStore(state => state.changePassword);
  const user = useAuthStore(state => state.user);
  const [passOtp, setPassOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSendingPassOtp, setIsSendingPassOtp] = useState(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);
  const [otpSentAt, setOtpSentAt] = useState(null);
  const [otpVerified, setOtpVerified] = useState(false);

  const handleSendPasswordOTP = async () => {
    setIsSendingPassOtp(true);
    try {
      await sendChangePasswordOTPApi();
      setOtpSentAt(Date.now());
      setOtpVerified(false);
      showSuccess(isEn ? 'Verification code sent to your email!' : 'تم إرسال رمز التحقق إلى بريدك الإلكتروني!');
    } catch (err) {
      showError(err.response?.data?.message || (isEn ? 'Failed to send code' : 'فشل إرسال رمز التحقق'));
    } finally {
      setIsSendingPassOtp(false);
    }
  };

  const handleVerifyPassOTP = () => {
    if (passOtp.length !== 6) {
      showWarning(isEn ? 'Please enter the 6-digit code' : 'يرجى إدخال رمز التحقق المكون من 6 أرقام');
      return;
    }
    setOtpVerified(true);
    showSuccess(isEn ? 'Code verified! Now enter your new password.' : 'تم تأكيد الرمز! أدخل كلمة المرور الجديدة.');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!otpVerified || !newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      showWarning(isEn ? 'New passwords do not match' : 'كلمتا المرور الجديدتان غير متطابقتين');
      return;
    }

    setIsUpdatingPass(true);
    try {
      const msg = await changePassword(passOtp, newPassword);
      showSuccess(msg || (isEn ? 'Password changed successfully!' : 'تم تغيير كلمة المرور بنجاح!'));
      setPassOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpVerified(false);
      setOtpSentAt(null);
    } catch (err) {
      showError(err.message || (isEn ? 'Failed to update password' : 'فشل تحديث كلمة المرور'));
    } finally {
      setIsUpdatingPass(false);
    }
  };

  const strength = checkPasswordStrength(newPassword);

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

  const fetchBackupsList = async () => {
    setIsFetchingBackups(true);
    try {
      const list = await getBackupsApi();
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

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    try {
      await triggerBackupApi();
      showSuccess(isEn ? 'Database backup created successfully!' : 'تم إنشاء نسخة احتياطية مشفّرة لقاعدة البيانات بنجاح!');
      fetchBackupsList();
    } catch (err) {
      showError(isEn ? 'Failed to create backup' : 'فشل إتمام النسخ الاحتياطي');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDownloadBackup = async (bk) => {
    try {
      const res = await downloadBackupApi(bk.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
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

  const formatFileSize = (bytes) => {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
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
            onClick={() => setActiveTab('security')}
            className={`w-full h-12 rounded-xl flex items-center justify-end px-4 gap-3 font-bold text-xs transition-colors focus:outline-none ${
              activeTab === 'security'
                ? 'bg-active text-accent-primary'
                : 'text-text-secondary hover:bg-hover hover:text-text-primary'
            } ${isEn ? 'flex-row-reverse' : ''}`}
          >
            <span>{isEn ? 'Security & Password' : 'الحماية وكلمة المرور'}</span>
            <Lock className="w-4.5 h-4.5" />
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
                  onChange={(e) => setStoreData(prev => ({ ...prev, store_name: e.target.value }))}
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
                <Button type="submit" className="px-8 text-xs font-bold h-12">
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
                <Button type="submit" className="px-8 text-xs font-bold h-12">
                  {isEn ? 'Save Receipt Settings' : 'حفظ إعدادات الفاتورة'}
                </Button>
              </div>
            </form>
          )}

          {/* TAB 2: Security Password Reset (OTP 2FA) */}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordSubmit} className={`flex flex-col gap-5 animate-fade-in ${isEn ? 'text-left' : ''}`}>
              <h3 className={`text-base font-extrabold text-text-primary border-b border-light pb-3 select-none ${isEn ? 'text-left' : ''}`}>
                {isEn ? 'Change Password (OTP Verification)' : 'تغيير كلمة المرور (تحقق OTP)'}
              </h3>

              <div className="max-w-md w-full flex flex-col gap-4">
                {/* Step 1: Send OTP Button */}
                <div className={`flex items-center gap-3 p-4 rounded-xl bg-subtle border border-light ${isEn ? 'flex-row-reverse' : ''}`}>
                  <ShieldAlert className="w-5 h-5 text-accent-primary flex-shrink-0" />
                  <div className="flex-grow">
                    <p className="text-xs font-bold text-text-primary">
                      {isEn ? 'Email on file:' : 'البريد الإلكتروني المسجل:'} {user?.email || '—'}
                    </p>
                    <p className="text-[10px] text-text-secondary mt-0.5">
                      {isEn ? 'A 6-digit code will be sent to your email.' : 'سيتم إرسال رمز مكون من 6 أرقام إلى بريدك الإلكتروني.'}
                    </p>
                  </div>
                  <Button type="button" onClick={handleSendPasswordOTP} isLoading={isSendingPassOtp} className="whitespace-nowrap text-[10px] font-bold h-9 px-4" variant={otpSentAt ? 'outline' : 'primary'}>
                    {otpSentAt ? (isEn ? 'Resend Code' : 'إعادة الإرسال') : (isEn ? 'Send Code' : 'إرسال الرمز')}
                  </Button>
                </div>

                {/* Step 2: OTP Input (shown after sending) */}
                {otpSentAt && (
                  <div className={`flex flex-col gap-2 p-4 rounded-xl bg-bg-secondary border border-light`}>
                    <label className="text-[11px] font-bold text-text-secondary">{isEn ? 'Enter 6-digit verification code' : 'أدخل رمز التحقق المكون من 6 أرقام'}</label>
                    <div className={`flex gap-2 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                      {[0, 1, 2, 3, 4, 5].map(i => (
                        <input
                          key={i}
                          type="text"
                          maxLength={1}
                          inputMode="numeric"
                          pattern="[0-9]"
                          value={passOtp[i] || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            const newCode = passOtp.split('');
                            newCode[i] = val;
                            setPassOtp(newCode.join('').slice(0, 6));
                            if (val && i < 5) {
                              const next = document.getElementById(`sp-otp-${i + 1}`);
                              if (next) next.focus();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !passOtp[i] && i > 0) {
                              const prev = document.getElementById(`sp-otp-${i - 1}`);
                              if (prev) prev.focus();
                            }
                          }}
                          id={`sp-otp-${i}`}
                          className={`w-full h-11 text-center text-lg font-black bg-bg-primary border rounded-lg outline-none transition-all placeholder-text-disabled ${otpVerified ? 'border-accent-primary text-accent-primary' : 'border-default focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary text-text-primary'}`}
                          placeholder="0"
                          disabled={otpVerified}
                        />
                      ))}
                    </div>
                    {!otpVerified && (
                      <div className={`flex mt-1 ${isEn ? 'justify-start' : 'justify-end'}`}>
                        <Button type="button" onClick={handleVerifyPassOTP} className="text-[10px] font-bold h-8 px-4">
                          {isEn ? 'Verify Code' : 'تأكيد الرمز'}
                        </Button>
                      </div>
                    )}
                    {otpVerified && (
                      <div className="flex items-center gap-2 mt-1 text-accent-primary text-[10px] font-bold">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {isEn ? 'Code verified — you can now change your password' : 'تم تأكيد الرمز — يمكنك الآن تغيير كلمة المرور'}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: New Password Fields (enabled after OTP verified) */}
                {otpVerified && (
                  <>
                    <Input
                      label={isEn ? "New Password" : "كلمة المرور الجديدة"}
                      type="password"
                      placeholder="••••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />

                    {/* Password strength indicator */}
                    {newPassword && (
                      <div className="flex flex-col gap-2">
                        <div className={`flex text-[10px] font-bold ${isEn ? 'justify-start' : 'justify-between'}`}>
                          <span className={`${strength.color.replace('bg-', 'text-')} tracking-wide`}>
                            {isEn ? 'Password Strength: ' : 'قوة كلمة المرور: '} {strength.label}
                          </span>
                        </div>
                        <div className={`h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden flex gap-0.5 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                          {[1, 2, 3, 4].map((step) => (
                            <div
                              key={step}
                              className={`h-full flex-grow transition-all duration-300 ${
                                step <= strength.score ? strength.color : 'bg-text-disabled/20'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <Input
                      label={isEn ? "Confirm New Password" : "تأكيد كلمة المرور الجديدة"}
                      type="password"
                      placeholder="••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </>
                )}
              </div>

              <div className={`flex mt-2 ${isEn ? 'justify-start' : 'justify-end'}`}>
                <Button type="submit" isLoading={isUpdatingPass} disabled={!otpVerified || !newPassword || !confirmPassword} className="px-8 text-xs font-bold h-12">
                  {isEn ? 'Update Password' : 'تحديث كلمة المرور'}
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

          {/* TAB 4: Database Backup list and scheduler */}
          {activeTab === 'backup' && (
            <div className={`flex flex-col gap-5 animate-fade-in select-none ${isEn ? 'text-left' : ''}`}>
              <div className={`flex items-center justify-between border-b border-light pb-3 ${isEn ? 'flex-row-reverse' : ''}`}>
                <Button
                  onClick={handleBackupNow}
                  isLoading={isBackingUp}
                  className={`h-10 text-[10px] font-black px-4 flex items-center justify-center gap-1.5 ${isEn ? 'flex-row-reverse' : ''}`}
                >
                  <Download className="w-4 h-4" />
                  {isEn ? 'Backup Now' : 'أخذ نسخة احتياطية فورية'}
                </Button>
                
                <h3 className="text-sm font-black text-text-primary">{isEn ? 'Database Backup Scheduler' : 'جدولة والنسخ الاحتياطي لقاعدة البيانات'}</h3>
              </div>

              <div className={`flex items-center gap-3 p-4 bg-status-warning/5 border border-status-warning/18 rounded-xl text-xs font-bold text-status-warning leading-relaxed ${isEn ? 'flex-row-reverse text-left' : 'text-right'}`}>
                <p className="flex-grow">
                  {isEn 
                    ? 'The system automatically schedules and performs backups every day at midnight. Only the last 7 backups are kept to save disk space.'
                    : 'النظام يقوم بجدولة وأخذ نسخ احتياطية تلقائياً كل يوم عند منتصف الليل. يحتفظ النظام بآخر 7 نسخ فقط ويقوم بحذف النسخ القديمة لحماية سعة المستودع والقرص الصلب.'}
                </p>
                <ShieldAlert className="w-5.5 h-5.5 flex-shrink-0" />
              </div>

              <div className="flex flex-col gap-3 mt-2">
                <div className={`flex justify-between items-center text-xs font-bold text-text-secondary mb-1 ${isEn ? 'flex-row-reverse' : ''}`}>
                  <button
                    onClick={fetchBackupsList}
                    className="p-1 text-accent-primary hover:bg-hover rounded-lg transition-colors focus:outline-none"
                    title={isEn ? "Refresh List" : "تحديث القائمة"}
                  >
                    <RefreshCw className={`w-4 h-4 ${isFetchingBackups ? 'animate-spin' : ''}`} />
                  </button>
                  <span>{isEn ? `Backup History Records (${backups.length})` : `سجل الملفات والنسخ المحفوظة (${backups.length})`}</span>
                </div>

                <div className="max-h-48 overflow-y-auto flex flex-col gap-2 pr-1">
                  {isFetchingBackups ? (
                    <div className="text-center py-6 text-xs text-text-secondary">{isEn ? 'Refreshing list...' : 'جاري تحديث القائمة...'}</div>
                  ) : backups.length === 0 ? (
                    <div className="text-center py-6 text-xs text-text-secondary">{isEn ? 'No backups available.' : 'لا توجد سجلات نسخ احتياطية حالياً.'}</div>
                  ) : (
                    backups.map(bk => (
                      <div
                        key={bk.id}
                        onClick={() => handleDownloadBackup(bk)}
                        className={`flex justify-between items-center p-3 rounded-xl bg-subtle border border-accent-primary/4 text-xs font-bold hover:border-accent-primary/20 cursor-pointer transition-all group select-none ${isEn ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`flex items-center gap-2 ${isEn ? 'flex-row-reverse' : ''}`}>
                          <Download className="w-3.5 h-3.5 text-text-disabled group-hover:text-accent-primary transition-colors" />
                          <span className="text-[10px] text-text-disabled group-hover:text-accent-primary">{formatFileSize(bk.size_bytes)}</span>
                        </div>
                        <div className={`flex flex-col ${isEn ? 'text-left' : 'text-right'}`}>
                          <span className="text-text-primary tracking-tight group-hover:text-accent-primary transition-colors">{bk.filename}</span>
                          <span className="text-[9px] text-text-disabled mt-0.5">{new Date(bk.created_at).toLocaleString(isEn ? 'en-US' : 'ar-DZ')}</span>
                        </div>
                      </div>
                    ))
                  )}
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
