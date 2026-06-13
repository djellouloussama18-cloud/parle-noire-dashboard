import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shirt,
  ChevronRight,
  ChevronLeft,
  Check,
  Store,
  Globe,
  Palette,
  Sparkles
} from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { initializeSetup } from '../api/setup.api';
import useSettingsStore from '../store/useSettingsStore';

var currencies = [
  { value: 'SAR', label: 'ريال سعودي (SAR)', symbol: 'ريال' },
  { value: 'AED', label: 'درهم إماراتي (AED)', symbol: 'درهم' },
  { value: 'KWD', label: 'دينار كويتي (KWD)', symbol: 'دينار' },
  { value: 'EGP', label: 'جنيه مصري (EGP)', symbol: 'جنيه' },
  { value: 'USD', label: 'دولار أمريكي (USD)', symbol: '$' },
  { value: 'EUR', label: 'يورو (EUR)', symbol: '€' },
];

export default function SetupWizard() {
  var navigate = useNavigate();
  var { language, setAccentColor } = useSettingsStore();
  var isEn = language === 'en';

  var [step, setStep] = useState(0);
  var [isSubmitting, setIsSubmitting] = useState(false);
  var [form, setForm] = useState({
    storeName: '',
    storeNameEn: '',
    currency: 'SAR',
    currencySymbol: 'ريال',
    taxRate: '0',
    phone: '',
    address: '',
    setupLanguage: 'ar',
    theme: 'dark',
  });

  var totalSteps = 5;

  function update(field, value) {
    setForm(function (prev) {
      var updated = { ...prev, [field]: value };
      if (field === 'currency') {
        var found = currencies.find(function (c) { return c.value === value; });
        if (found) updated.currencySymbol = found.symbol;
      }
      return updated;
    });
  }

  function canProceed() {
    if (step === 1) return form.storeName.trim().length > 0;
    return true;
  }

  function nextStep() {
    if (step < totalSteps - 1) setStep(function (s) { return s + 1; });
  }

  function prevStep() {
    if (step > 0) setStep(function (s) { return s - 1; });
  }

  function getStepTitle() {
    var titles = [
      isEn ? 'Welcome' : 'ترحيب',
      isEn ? 'Store Name' : 'اسم المتجر',
      isEn ? 'Currency & Tax' : 'العملة والضرائب',
      isEn ? 'Language & Theme' : 'اللغة والمظهر',
      isEn ? 'Done!' : 'تم!',
    ];
    return titles[step];
  }

  async function handleFinish() {
    setIsSubmitting(true);
    try {
      await initializeSetup({
        storeName: form.storeName,
        storeNameEn: form.storeNameEn || form.storeName,
        currency: form.currency,
        currencySymbol: form.currencySymbol,
        taxRate: parseFloat(form.taxRate) || 0,
        language: form.setupLanguage,
        address: form.address,
        phone: form.phone,
      });
      setStep(totalSteps - 1);
    } catch (err) {
      console.error('Setup failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleStartUsing() {
    navigate('/');
  }

  function renderStep() {
    switch (step) {
      case 0: return renderWelcome();
      case 1: return renderStoreName();
      case 2: return renderCurrencyTax();
      case 3: return renderLanguageTheme();
      case 4: return renderSuccess();
      default: return null;
    }
  }

  function renderWelcome() {
    return (
      <div className="flex flex-col items-center gap-6 py-6 animate-fadeIn">
        <div className="w-20 h-20 rounded-2xl bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center shadow-lg shadow-accent-primary/10">
          <Shirt className="w-10 h-10 text-accent-primary" />
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-black tracking-widest bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
            Parle Noire POS
          </h1>
          <h2 className="text-xl font-bold text-white mt-1">
            {isEn ? 'Welcome to Your POS System' : 'مرحباً بك في نظام نقطة البيع'}
          </h2>
          <p className="text-sm text-zinc-400 font-medium max-w-sm leading-relaxed">
            {isEn
              ? 'Let\'s customize your store in 4 quick steps.'
              : 'دعنا نخصص النظام لمتجرك في 4 خطوات سريعة.'}
          </p>
        </div>
        <Button
          onClick={nextStep}
          className="h-14 px-10 text-base font-black tracking-wide mt-4"
        >
          {isEn ? 'Get Started' : 'ابدأ'}
          <Sparkles className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  function renderStoreName() {
    return (
      <div className="flex flex-col gap-5 py-2 animate-fadeIn">
        <div className="flex items-center gap-3 mb-1">
          <Store className="w-6 h-6 text-accent-primary" />
          <h3 className="text-lg font-black text-white">
            {isEn ? 'Store Name' : 'اسم المتجر'}
          </h3>
        </div>

        <Input
          label={isEn ? 'Store Name (Arabic)' : 'اسم المتجر بالعربية'}
          placeholder={isEn ? 'e.g. Fashion Store' : 'مثال: متجر الأزياء'}
          value={form.storeName}
          onChange={function (e) { update('storeName', e.target.value); }}
          required
          inputClassName="text-lg font-bold text-right bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500"
          className="text-right"
        />

        <Input
          label={isEn ? 'Store Name (English)' : 'اسم المتجر بالإنجليزية (اختياري)'}
          placeholder={isEn ? 'e.g. Fashion Store' : 'e.g. Fashion Store'}
          value={form.storeNameEn}
          onChange={function (e) { update('storeNameEn', e.target.value); }}
          inputClassName="text-lg bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500"
        />

        <p className="text-xs text-zinc-500 font-bold mt-1">
          {isEn
            ? 'This name will appear on receipts and headers.'
            : 'سيظهر هذا الاسم في الفواتير والترويسة.'}
        </p>
      </div>
    );
  }

  function renderCurrencyTax() {
    return (
      <div className="flex flex-col gap-5 py-2 animate-fadeIn">
        <div className="flex items-center gap-3 mb-1">
          <Globe className="w-6 h-6 text-accent-primary" />
          <h3 className="text-lg font-black text-white">
            {isEn ? 'Currency & Tax' : 'العملة والضرائب'}
          </h3>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-text-secondary select-none">
            {isEn ? 'Currency' : 'العملة'} <span className="text-status-danger">*</span>
          </label>
          <select
            value={form.currency}
            onChange={function (e) { update('currency', e.target.value); }}
            className="w-full h-[52px] bg-zinc-900/60 border border-zinc-700 rounded-xl text-white text-sm font-medium outline-none transition-all duration-200 focus:border-accent-primary focus:ring-2 focus:ring-emerald-500/20 px-4 appearance-none cursor-pointer"
          >
            {currencies.map(function (c) {
              return (
                <option key={c.value} value={c.value} className="bg-zinc-900 text-white">
                  {c.label}
                </option>
              );
            })}
          </select>
        </div>

        <Input
          label={isEn ? 'Tax Rate (%)' : 'نسبة الضريبة %'}
          type="number"
          placeholder="0"
          value={form.taxRate}
          onChange={function (e) { update('taxRate', e.target.value); }}
          inputClassName="bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500"
        />

        <Input
          label={isEn ? 'Store Phone (optional)' : 'هاتف المتجر (اختياري)'}
          placeholder={isEn ? '+213 555 123 456' : '+213 555 123 456'}
          value={form.phone}
          onChange={function (e) { update('phone', e.target.value); }}
          inputClassName="bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500"
        />

        <Input
          label={isEn ? 'Store Address (optional)' : 'عنوان المتجر (اختياري)'}
          placeholder={isEn ? '123 Main St, City' : 'الجزائر العاصمة، الجزائر'}
          value={form.address}
          onChange={function (e) { update('address', e.target.value); }}
          inputClassName="bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500"
        />
      </div>
    );
  }

  function renderLanguageTheme() {
    return (
      <div className="flex flex-col gap-6 py-2 animate-fadeIn">
        <div className="flex items-center gap-3 mb-1">
          <Palette className="w-6 h-6 text-accent-primary" />
          <h3 className="text-lg font-black text-white">
            {isEn ? 'Language & Theme' : 'اللغة والمظهر'}
          </h3>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-[13px] font-medium text-text-secondary select-none">
            {isEn ? 'Default Language' : 'اللغة الافتراضية'}
          </label>
          <div className="flex gap-3">
            {[
              { value: 'ar', labelAr: 'العربية', labelEn: 'Arabic' },
              { value: 'en', labelAr: 'English', labelEn: 'English' },
            ].map(function (opt) {
              var active = form.setupLanguage === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={function () { update('setupLanguage', opt.value); }}
                  className={`flex-1 h-14 rounded-xl font-black text-sm transition-all duration-200 border-2 outline-none ${
                    active
                      ? 'bg-accent-primary/10 border-accent-primary text-accent-primary shadow-accent'
                      : 'bg-zinc-900/60 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {isEn ? opt.labelEn : opt.labelAr}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-[13px] font-medium text-text-secondary select-none">
            {isEn ? 'Theme' : 'المظهر'}
          </label>
          <div className="flex gap-3">
            {[
              { value: 'dark', labelAr: 'داكن (Dark)', labelEn: 'Dark' },
              { value: 'light', labelAr: 'فاتح (Light)', labelEn: 'Light' },
            ].map(function (opt) {
              var active = form.theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={function () { update('theme', opt.value); }}
                  className={`flex-1 h-14 rounded-xl font-black text-sm transition-all duration-200 border-2 outline-none ${
                    active
                      ? 'bg-accent-primary/10 border-accent-primary text-accent-primary shadow-accent'
                      : 'bg-zinc-900/60 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {isEn ? opt.labelEn : opt.labelAr}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-zinc-500 font-bold mt-2">
          {isEn
            ? 'You can change these settings later from the Settings page.'
            : 'يمكنك تغيير هذه الإعدادات لاحقاً من صفحة الإعدادات.'}
        </p>
      </div>
    );
  }

  function renderSuccess() {
    return (
      <div className="flex flex-col items-center gap-5 py-6 animate-fadeIn">
        <div className="w-20 h-20 rounded-full bg-accent-primary/10 border-2 border-accent-primary flex items-center justify-center shadow-lg shadow-accent-primary/20">
          <Check className="w-10 h-10 text-accent-primary" />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="text-2xl font-black text-white">
            {isEn ? 'Setup Complete!' : 'تم إعداد النظام بنجاح!'}
          </h2>
          <p className="text-sm text-zinc-400 font-medium mt-1">
            {isEn ? 'Your store:' : 'متجرك:'}{' '}
            <span className="text-accent-primary font-black">{form.storeName}</span>
          </p>
        </div>
        <Button
          onClick={handleStartUsing}
          className="h-14 px-10 text-base font-black tracking-wide mt-4"
        >
          {isEn ? 'Start Using' : 'ابدأ الاستخدام'}
          <Sparkles className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 overflow-hidden relative selection:bg-accent-primary selection:text-black">
      <div className="absolute inset-0 opacity-20 z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 127, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 127, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}
      />
      <div className="absolute top-[-150px] right-[-150px] w-[400px] h-[400px] rounded-full bg-accent-primary/5 blur-[100px] animate-pulse z-0" />
      <div className="absolute bottom-[-150px] left-[-150px] w-[350px] h-[350px] rounded-full bg-accent-secondary/5 blur-[80px] animate-pulse z-0" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-[520px] relative z-10">
        <div
          className="glass-panel border border-zinc-800 rounded-3xl p-8 shadow-2xl transition-all duration-500"
          style={{ background: 'rgba(24, 24, 27, 0.85)', backdropFilter: 'blur(20px)' }}
        >
          {/* Step indicator badge */}
          <div className="flex items-center justify-between mb-6 select-none">
            <span className="text-[10px] font-black text-zinc-500 tracking-wider uppercase">
              {isEn ? 'Step' : 'خطوة'} {step + 1} / {totalSteps}
            </span>
            <span className="text-xs font-bold text-zinc-400">
              {getStepTitle()}
            </span>
          </div>

          {/* Step content */}
          <div className="min-h-[320px] flex flex-col justify-center">
            {renderStep()}
          </div>

          {/* Navigation */}
          {step < totalSteps - 1 && (
            <div className="flex items-center justify-between gap-4 mt-6 pt-5 border-t border-zinc-800">
              {step > 0 ? (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-2 h-12 px-5 rounded-xl bg-zinc-900/60 border border-zinc-700 text-zinc-300 text-xs font-black hover:bg-zinc-800 hover:text-white transition-all outline-none"
                >
                  <ChevronRight className="w-4 h-4" />
                  {isEn ? 'Previous' : 'السابق'}
                </button>
              ) : (
                <div />
              )}

              <Button
                onClick={step === 0 ? nextStep : step === 4 ? handleFinish : nextStep}
                disabled={!canProceed()}
                isLoading={isSubmitting}
                className="h-12 px-8 text-xs font-black"
              >
                {isEn ? 'Next' : 'التالي'}
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mt-6 select-none">
            {Array.from({ length: totalSteps }).map(function (_, i) {
              var active = i <= step;
              var isCurrent = i === step;
              return (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isCurrent
                      ? 'w-8 bg-accent-primary'
                      : active
                        ? 'w-3 bg-accent-primary/60'
                        : 'w-3 bg-zinc-700'
                  }`}
                />
              );
            })}
          </div>
        </div>

        <p className="text-center mt-4 text-[10px] font-bold text-zinc-600 select-none">
          Parle Noire POS &copy; 2026
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        .glass-panel { background: rgba(24, 24, 27, 0.6); backdrop-filter: blur(16px); }
        select { background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239CA3AF' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: left 0.75rem center; background-repeat: no-repeat; background-size: 1.25rem; }
      `}</style>
    </div>
  );
}
