import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import useSettingsStore from '../store/useSettingsStore';
import useNotification from '../hooks/useNotification';
import { checkPasswordStrength } from '../utils/validators';
import { registerApi, verifyOTPApi, forgotPasswordApi, resetPasswordApi } from '../api/auth.api';
import {
  Lock, Mail, User as UserIcon, Eye, EyeOff,
  Shirt, Sparkles, DollarSign, TrendingUp, Package,
  Smartphone, ChevronLeft, UserPlus, LogIn,
  BarChart3, ShieldCheck, Zap, Globe
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

function PasswordStrengthMeter({ password, isEn }) {
  const strength = checkPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`flex justify-between text-[10px] font-bold`}>
        <span className={`${strength.color.replace('bg-', 'text-')} tracking-wide`}>
          {isEn ? 'Password Strength: ' : 'قوة كلمة المرور: '} {strength.label}
        </span>
      </div>
      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden flex gap-0.5">
        {[1, 2, 3, 4].map(step => (
          <div key={step} className={`h-full flex-grow transition-all duration-300 ${step <= strength.score ? strength.color : 'bg-zinc-700'}`} />
        ))}
      </div>
    </div>
  );
}

function FloatingCard({ icon: Icon, label, value, color, delay, isEn }) {
  return (
    <div
      className="glass-panel p-4.5 rounded-2xl border border-zinc-800 hover:scale-[1.02] transition-all duration-300 select-none animate-float"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={`flex items-center justify-between mb-2 ${isEn ? 'flex-row-reverse' : ''}`}>
        <span className="text-[10px] font-bold text-zinc-500">{label}</span>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <span className="text-lg font-black text-white tracking-tight">{value}</span>
    </div>
  );
}

const statCards = [
  { icon: DollarSign, labelEn: "Today's Sales", labelAr: 'مبيعات اليوم', valueEn: '142,500 DZD', valueAr: '142,500 د.ج', color: '#00FF7F', delay: 0 },
  { icon: BarChart3, labelEn: 'Active Invoices', labelAr: 'الفواتير النشطة', valueEn: '28 Invoices', valueAr: '28 فاتورة', color: '#0EA5E9', delay: 0.15 },
  { icon: Package, labelEn: 'Items in Stock', labelAr: 'القطع في المخزن', valueEn: '3,450 Items', valueAr: '3,450 قطعة', color: '#F59E0B', delay: 0.3 },
  { icon: TrendingUp, labelEn: 'Profit Margin', labelAr: 'هامش الربح', valueEn: '+18.5%', valueAr: '+18.5%', color: '#10B981', delay: 0.45 },
  { icon: Zap, labelEn: 'AI Insights', labelAr: 'تحليلات ذكية', valueEn: '7 Alerts', valueAr: '7 تنبيهات', color: '#8B5CF6', delay: 0.6 },
  { icon: ShieldCheck, labelEn: 'System Status', labelAr: 'حالة النظام', valueEn: 'All Secure', valueAr: 'آمن بالكامل', color: '#22C55E', delay: 0.75 },
];

export default function Login() {
  const navigate = useNavigate();
  const loginUser = useAuthStore((state) => state.login);
  const authError = useAuthStore((state) => state.error);
  const isLoading = useAuthStore((state) => state.isLoading);
  const { showSuccess, showError } = useNotification();
  const { language, settings } = useSettingsStore();
  const isEn = language === 'en';

  // Login state
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [shake, setShake] = useState(false);

  // Register state
  const [showRegister, setShowRegister] = useState(false);
  const [regData, setRegData] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [isRegistering, setIsRegistering] = useState(false);

  // OTP verification state
  const [showOTP, setShowOTP] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1=email, 2=otp, 3=newPassword
  const [forgotOTP, setForgotOTP] = useState('');
  const [isSendingForgotOTP, setIsSendingForgotOTP] = useState(false);
  const [isResettingPass, setIsResettingPass] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!login || !password) return;
    try {
      const success = await loginUser(login, password);
      if (success) {
        showSuccess(isEn ? 'Successfully logged in! Welcome.' : 'تم تسجيل الدخول بنجاح! مرحباً بك.');
        navigate('/');
      }
    } catch (err) {
      setShake(true);
      showError(err.message || (isEn ? 'Invalid login credentials' : 'بيانات الدخول غير صحيحة'));
      setTimeout(() => setShake(false), 600);
    }
  };

  const handleRegisterSubmit = async (e) => {
    try {
      e.preventDefault();
      if (!regData || !regData.fullName || !regData.email || !regData.password) {
        showError(isEn ? 'Please fill all required fields' : 'يرجى ملء جميع الحقول المطلوبة');
        return;
      }
      if (regData.password !== regData.confirmPassword) {
        showError(isEn ? 'Passwords do not match' : 'كلمتا المرور غير متطابقتين');
        return;
      }
      setIsRegistering(true);
      const res = await registerApi({
        fullName: regData.fullName || '',
        email: regData.email || '',
        phone: regData.phone || '',
        password: regData.password || ''
      }) || {};
      const email = res?.email || regData.email;
      setOtpEmail(email);
      setShowRegister(false);
      setShowOTP(true);
      showSuccess(isEn ? 'Verification code sent to your email!' : 'تم إرسال رمز التحقق إلى بريدك الإلكتروني!');
    } catch (err) {
      const msg = err?.response?.data?.message || (isEn ? 'Registration failed' : 'فشل إنشاء الحساب');
      showError(msg);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      showError(isEn ? 'Please enter the 6-digit code' : 'يرجى إدخال رمز التحقق المكون من 6 أرقام');
      return;
    }
    setIsVerifyingOTP(true);
    try {
      await verifyOTPApi(otpEmail, otpCode);
      showSuccess(isEn ? 'Account verified! You can now log in.' : 'تم تفعيل الحساب! يمكنك الآن تسجيل الدخول.');
      setShowOTP(false);
      setOtpCode('');
      setOtpEmail('');
      setRegData({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
    } catch (err) {
      showError(err.response?.data?.message || (isEn ? 'Verification failed' : 'فشل التحقق من الرمز'));
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleForgotEmailSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setIsSendingForgotOTP(true);
    try {
      await forgotPasswordApi(forgotEmail);
      showSuccess(isEn ? 'Verification code sent to your email!' : 'تم إرسال رمز التحقق إلى بريدك الإلكتروني!');
      setForgotStep(2);
    } catch (err) {
      showError(err.response?.data?.message || (isEn ? 'Email not found' : 'البريد الإلكتروني غير موجود'));
    } finally {
      setIsSendingForgotOTP(false);
    }
  };

  const handleForgotOTPSubmit = async (e) => {
    e.preventDefault();
    if (forgotOTP.length !== 6) {
      showError(isEn ? 'Please enter the 6-digit code' : 'يرجى إدخال رمز التحقق المكون من 6 أرقام');
      return;
    }
    setIsResettingPass(true);
    try {
      // Just verify OTP before moving to password step
      // We'll do the actual reset in step 3
      setForgotStep(3);
    } finally {
      setIsResettingPass(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      showError(isEn ? 'Passwords do not match' : 'كلمتا المرور غير متطابقتين');
      return;
    }
    if (newPassword.length < 6) {
      showError(isEn ? 'Password must be at least 6 characters' : 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setIsResettingPass(true);
    try {
      await resetPasswordApi(forgotEmail, forgotOTP, newPassword);
      showSuccess(isEn ? 'Password reset successfully! You can now log in.' : 'تم إعادة تعيين كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.');
      setShowForgot(false);
      setForgotStep(1);
      setForgotEmail('');
      setForgotOTP('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showError(err.response?.data?.message || (isEn ? 'Reset failed' : 'فشل إعادة التعيين'));
    } finally {
      setIsResettingPass(false);
    }
  };

  const regStrength = checkPasswordStrength(regData.password);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-0 overflow-hidden relative selection:bg-accent-primary selection:text-black">
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-20 z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 127, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 127, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}
      />
      <div className="absolute top-[-200px] right-[-200px] w-[500px] h-[500px] rounded-full bg-accent-primary/5 blur-[120px] animate-pulse z-0" />
      <div className="absolute bottom-[-200px] left-[-200px] w-[400px] h-[400px] rounded-full bg-accent-secondary/5 blur-[100px] animate-pulse z-0" style={{ animationDelay: '2s' }} />

      <div className={`w-full min-h-screen flex z-10 ${isEn ? 'flex-row-reverse' : ''}`}>
        {/* Left Side: Premium Landing (55%) */}
        <div className={`w-[55%] hidden lg:flex flex-col justify-between p-12 bg-zinc-950 relative overflow-hidden ${isEn ? 'border-r border-zinc-800' : 'border-l border-zinc-800'}`}>
          {/* Floating orbs */}
          <div className="absolute top-[10%] left-[10%] w-64 h-64 rounded-full bg-emerald-500/5 blur-[80px] animate-pulse z-0" style={{ animationDuration: '6s' }} />
          <div className="absolute bottom-[20%] right-[15%] w-48 h-48 rounded-full bg-purple-500/5 blur-[60px] animate-pulse z-0" style={{ animationDuration: '8s', animationDelay: '1s' }} />

          {/* Logo Brand */}
          <div className={`flex items-center gap-3 relative z-10 ${isEn ? 'flex-row-reverse self-end' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center">
              <Shirt className="w-6 h-6 text-accent-primary" />
            </div>
            <span className="text-xl font-black tracking-widest bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
              {settings.store_name}
            </span>
          </div>

          {/* Central Hero */}
          <div className={`my-auto flex flex-col gap-5 max-w-xl relative z-10 ${isEn ? 'text-left pl-6 self-start' : 'text-right pr-6 self-end'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-[10px] font-black tracking-wider uppercase mb-2">
              <Zap className="w-3.5 h-3.5" />
              {isEn ? 'Next-Gen POS System' : 'نظام كاشير الجيل الجديد'}
            </div>
            <h1 className={`text-5xl font-black leading-tight ${isEn ? 'bg-gradient-to-r' : 'bg-gradient-to-l'} from-white via-accent-primary to-zinc-400 bg-clip-text text-transparent`}>
              {isEn ? 'Smart Sales & Inventory Management' : 'نظام إدارة المبيعات والمخزون الذكي'}
            </h1>
            <p className="text-base text-zinc-400 font-medium leading-relaxed">
              {isEn
                ? 'Complete control over sales, invoices, smart financial reports, and apparel inventory with a single click.'
                : 'تحكم متكامل في المبيعات، الفواتير، التقارير المالية الذكية ومستودعات الملابس بنقرة زر واحدة.'
              }
            </p>
          </div>

          {/* Floating Stats Grid */}
          <div className="grid grid-cols-3 gap-3.5 w-full relative z-10">
            {statCards.map((card, i) => (
              <FloatingCard
                key={i}
                icon={card.icon}
                label={isEn ? card.labelEn : card.labelAr}
                value={isEn ? card.valueEn : card.valueAr}
                color={card.color}
                delay={card.delay}
                isEn={isEn}
              />
            ))}
          </div>
        </div>

        {/* Right Side: Auth Form (45%) */}
        <div className="flex-grow lg:w-[45%] w-full flex items-center justify-center p-6 bg-black">
          <div className={`w-full max-w-[440px] glass-panel border border-zinc-800 rounded-3xl p-8 relative flex flex-col gap-6 shadow-2xl transition-all duration-500 ${
            shake ? 'animate-shake' : ''
          }`}
            style={{ background: 'rgba(24, 24, 27, 0.8)', backdropFilter: 'blur(20px)' }}
          >
            {/* Header */}
            <div className="flex flex-col items-center gap-2 border-b border-zinc-800 pb-5 select-none">
              <div className="w-12 h-12 bg-accent-primary/10 border border-accent-primary/30 rounded-2xl flex items-center justify-center text-accent-primary shadow-accent">
                {showRegister ? <UserPlus className="w-5.5 h-5.5" /> : <Lock className="w-5.5 h-5.5" />}
              </div>
              <h2 className="text-2xl font-black text-white mt-2">
                {showRegister ? (isEn ? 'Create Account' : 'إنشاء حساب جديد') : (isEn ? 'Log In' : 'تسجيل الدخول')}
              </h2>
              <p className="text-xs font-bold text-zinc-400 text-center">
                {showRegister
                  ? (isEn ? 'Register as a new staff member' : 'التسجيل كموظف جديد')
                  : (isEn ? `Welcome to ${settings.store_name} Cashier System` : `مرحباً بك مجدداً في نظام كاشير ${settings.store_name}`)
                }
              </p>
            </div>

            {/* Animated form wrapper */}
            <div className="transition-all duration-500 ease-in-out">
              {showOTP && (
                <form onSubmit={handleVerifyOTP} className={`flex flex-col gap-5 animate-fadeIn ${isEn ? 'text-left' : 'text-right'}`}>
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center">
                      <ShieldCheck className="w-7 h-7 text-accent-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-white">{isEn ? 'Verify Your Email' : 'تأكيد البريد الإلكتروني'}</h3>
                    <p className="text-xs text-zinc-400 text-center leading-relaxed">
                      {isEn
                        ? `A 6-digit verification code has been sent to ${otpEmail || 'your email'}.`
                        : `تم إرسال رمز تحقق مكون من 6 أرقام إلى ${otpEmail || 'بريدك الإلكتروني'}.`
                      }
                    </p>
                  </div>

                  {otpEmail ? (
                    <div className={`flex flex-col gap-2 ${isEn ? 'items-start' : 'items-end'}`}>
                      <label className="text-xs font-bold text-zinc-300">{isEn ? 'Verification Code' : 'رمز التحقق'}</label>
                      <div className={`flex gap-3 w-full ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                        {Array.from({ length: 6 }).map((_, i) => {
                          const char = (otpCode || '')[i] || '';
                          return (
                            <input
                              key={i}
                              type="text"
                              maxLength={1}
                              inputMode="numeric"
                              pattern="[0-9]"
                              value={char}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                const newCode = (otpCode || '').split('');
                                newCode[i] = val;
                                setOtpCode(newCode.join('').slice(0, 6));
                                if (val && i < 5) {
                                  const next = document.getElementById(`otp-${i + 1}`);
                                  if (next) next.focus();
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Backspace' && !(otpCode || '')[i] && i > 0) {
                                  const prev = document.getElementById(`otp-${i - 1}`);
                                  if (prev) prev.focus();
                                }
                              }}
                              id={`otp-${i}`}
                              className="w-full h-14 text-center text-xl font-black bg-zinc-900/60 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary outline-none transition-all placeholder-zinc-600"
                              placeholder="0"
                            />
                          );
                        })}
                      </div>

                      <Button type="submit" isLoading={isVerifyingOTP} className="h-[54px] w-full text-base font-extrabold mt-2 shadow-accent">
                        <ShieldCheck className="w-5 h-5" />
                        {isEn ? 'Verify Account' : 'تأكيد الحساب'}
                      </Button>

                      <div className="text-center mt-1">
                        <button type="button" onClick={() => { setShowOTP(false); setShowRegister(true); setOtpCode(''); }}
                          className="text-xs font-bold text-zinc-400 hover:text-accent-primary transition-colors flex items-center justify-center gap-1">
                          <ChevronLeft className="w-3.5 h-3.5" />
                          {isEn ? 'Back to Registration' : 'العودة للتسجيل'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-zinc-500 text-sm py-4">
                      {isEn ? 'No email provided. Please go back and try again.' : 'لم يتم تقديم بريد إلكتروني. يرجى العودة والمحاولة مرة أخرى.'}
                    </div>
                  )}
                </form>
              )}

              {!showForgot && !showRegister && !showOTP && (
                <form onSubmit={handleLoginSubmit} className={`flex flex-col gap-5 animate-fadeIn ${isEn ? 'text-left' : 'text-right'}`}>
                  <Input
                    label={isEn ? "Email or Username" : "البريد الإلكتروني أو اسم المستخدم"}
                    placeholder={isEn ? "Enter username or email" : "أدخل اسم المستخدم أو الإيميل"}
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    icon={UserIcon}
                    required
                    className="bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500"
                  />

                  <div className="relative">
                    <Input
                      label={isEn ? "Password" : "كلمة المرور"}
                      type={loginShowPassword ? 'text' : 'password'}
                      placeholder="••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      icon={Lock}
                      required
                      className="bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500"
                    />
                    <button type="button" onClick={() => setLoginShowPassword(prev => !prev)}
                      className={`absolute top-[42px] text-zinc-500 hover:text-white transition-colors focus:outline-none ${isEn ? 'right-4' : 'left-4'}`}>
                      {loginShowPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className={`flex items-center justify-between text-xs font-bold select-none ${isEn ? 'flex-row-reverse' : ''}`}>
                    <button type="button" onClick={() => setShowForgot(true)}
                      className="text-accent-primary hover:underline">
                      {isEn ? 'Forgot Password?' : 'نسيت كلمة المرور؟'}
                    </button>
                    <label className={`flex items-center gap-2 cursor-pointer text-zinc-400 ${isEn ? 'flex-row-reverse' : ''}`}>
                      <span>{isEn ? 'Remember me' : 'تذكرني'}</span>
                      <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-accent-primary cursor-pointer outline-none focus:ring-0" />
                    </label>
                  </div>

                  <Button type="submit" isLoading={isLoading} className="h-[54px] w-full text-base font-extrabold mt-2 shadow-accent">
                    <LogIn className="w-5 h-5" />
                    {isEn ? 'Login to System' : 'دخول إلى النظام'}
                  </Button>

                  <div className="text-center mt-1">
                    <button type="button" onClick={() => { setShowRegister(true); setShowForgot(false); }}
                      className="text-xs font-bold text-zinc-400 hover:text-accent-primary transition-colors">
                      {isEn ? "Don't have an account? Create one" : 'ليس لديك حساب؟ إنشاء حساب جديد'}
                    </button>
                  </div>
                </form>
              )}

              {!showForgot && showRegister && !showOTP && (
                <form onSubmit={handleRegisterSubmit} className={`flex flex-col gap-4 animate-fadeIn ${isEn ? 'text-left' : 'text-right'}`}>
                  <Input label={isEn ? "Full Name" : "الاسم الكامل"}
                    placeholder={isEn ? "Enter your full name" : "أدخل اسمك الكامل"}
                    value={regData.fullName} onChange={(e) => setRegData(prev => ({ ...prev, fullName: e.target.value }))}
                    icon={UserIcon} required
                    className="bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500" />

                  <Input label={isEn ? "Email Address" : "البريد الإلكتروني"}
                    placeholder="example@store.com" type="email"
                    value={regData.email} onChange={(e) => setRegData(prev => ({ ...prev, email: e.target.value }))}
                    icon={Mail} required
                    className="bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500" />

                  <Input label={isEn ? "Phone Number (Optional)" : "رقم الهاتف (اختياري)"}
                    placeholder={isEn ? "e.g. 0555123456" : "مثال: 0555123456"}
                    value={regData.phone} onChange={(e) => setRegData(prev => ({ ...prev, phone: e.target.value }))}
                    icon={Smartphone}
                    className="bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500" />

                  <div className="relative">
                    <Input label={isEn ? "Password" : "كلمة المرور"}
                      type={regShowPassword ? 'text' : 'password'} placeholder="••••••••••"
                      value={regData.password} onChange={(e) => setRegData(prev => ({ ...prev, password: e.target.value }))}
                      icon={Lock} required
                      className="bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500" />
                    <button type="button" onClick={() => setRegShowPassword(prev => !prev)}
                      className={`absolute top-[42px] text-zinc-500 hover:text-white transition-colors focus:outline-none ${isEn ? 'right-4' : 'left-4'}`}>
                      {regShowPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <PasswordStrengthMeter password={regData.password} isEn={isEn} />

                  <Input label={isEn ? "Confirm Password" : "تأكيد كلمة المرور"}
                    type="password" placeholder="••••••••••"
                    value={regData.confirmPassword} onChange={(e) => setRegData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    icon={Lock} required
                    className="bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500" />

                  <Button type="submit" isLoading={isRegistering} className="h-[54px] w-full text-base font-extrabold mt-1 shadow-accent">
                    <UserPlus className="w-5 h-5" />
                    {isEn ? 'Create Account' : 'إنشاء الحساب'}
                  </Button>

                  <div className="text-center mt-1">
                    <button type="button" onClick={() => { setShowRegister(false); setRegData({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' }); }}
                      className="text-xs font-bold text-zinc-400 hover:text-accent-primary transition-colors flex items-center justify-center gap-1">
                      <ChevronLeft className="w-3.5 h-3.5" />
                      {isEn ? 'Back to Login' : 'العودة لتسجيل الدخول'}
                    </button>
                  </div>
                </form>
              )}

              {showForgot && (
                <form onSubmit={forgotStep === 1 ? handleForgotEmailSubmit : forgotStep === 2 ? handleForgotOTPSubmit : handleResetPasswordSubmit} className={`flex flex-col gap-5 animate-fadeIn ${isEn ? 'text-left' : 'text-right'}`}>
                  <h3 className="text-lg font-bold text-accent-primary">{isEn ? 'Reset Password' : 'إعادة تعيين كلمة المرور'}</h3>

                  {forgotStep === 1 && (
                    <>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {isEn ? 'Enter your email to receive a 6-digit verification code.' : 'أدخل بريدك الإلكتروني لاستلام رمز تحقق مكون من 6 أرقام.'}
                      </p>
                      <Input label={isEn ? "Email Address" : "البريد الإلكتروني"} placeholder="example@store.com"
                        value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} icon={Mail} required
                        className="bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500" />
                      <Button type="submit" isLoading={isSendingForgotOTP} className="h-12 mt-2 shadow-accent">{isEn ? 'Send Verification Code' : 'إرسال رمز التحقق'}</Button>
                    </>
                  )}

                  {forgotStep === 2 && (
                    <>
                      <p className="text-xs text-zinc-400 text-center leading-relaxed">
                        {isEn ? `Enter the 6-digit code sent to ${forgotEmail || 'your email'}` : `أدخل رمز التحقق المكون من 6 أرقام المرسل إلى ${forgotEmail || 'بريدك الإلكتروني'}`}
                      </p>
                      <div className={`flex gap-3 w-full ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                        {Array.from({ length: 6 }).map((_, i) => {
                          const char = (forgotOTP || '')[i] || '';
                          return (
                            <input
                              key={i}
                              type="text"
                              maxLength={1}
                              inputMode="numeric"
                              pattern="[0-9]"
                              value={char}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                const newCode = (forgotOTP || '').split('');
                                newCode[i] = val;
                                setForgotOTP(newCode.join('').slice(0, 6));
                                if (val && i < 5) {
                                  const next = document.getElementById(`fotp-${i + 1}`);
                                  if (next) next.focus();
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Backspace' && !(forgotOTP || '')[i] && i > 0) {
                                  const prev = document.getElementById(`fotp-${i - 1}`);
                                  if (prev) prev.focus();
                                }
                              }}
                              id={`fotp-${i}`}
                              className="w-full h-14 text-center text-xl font-black bg-zinc-900/60 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary outline-none transition-all placeholder-zinc-600"
                              placeholder="0"
                            />
                          );
                        })}
                      </div>
                      <Button type="submit" isLoading={isResettingPass} className="h-12 mt-2 shadow-accent">{isEn ? 'Verify Code' : 'تأكيد الرمز'}</Button>
                    </>
                  )}

                  {forgotStep === 3 && (
                    <>
                      <p className="text-xs text-zinc-400">{isEn ? 'Enter a new strong password.' : 'أدخل كلمة مرور قوية جديدة.'}</p>
                      <div className="relative">
                        <Input label={isEn ? "New Password" : "كلمة المرور الجديدة"}
                          type="password" placeholder="••••••••••"
                          value={newPassword} onChange={(e) => setNewPassword(e.target.value)} icon={Lock} required
                          className="bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500" />
                      </div>
                      <PasswordStrengthMeter password={newPassword} isEn={isEn} />
                      <Input label={isEn ? "Confirm Password" : "تأكيد كلمة المرور"}
                        type="password" placeholder="••••••••••"
                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} icon={Lock} required
                        className="bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500" />
                      <Button type="submit" isLoading={isResettingPass} className="h-12 mt-2 shadow-accent">{isEn ? 'Reset Password' : 'إعادة تعيين كلمة المرور'}</Button>
                    </>
                  )}

                  <div className="flex gap-3 justify-center">
                    {forgotStep > 1 && (
                      <button type="button" onClick={() => setForgotStep(s => s - 1)}
                        className="text-xs text-zinc-500 hover:text-white font-bold transition-colors">
                        {isEn ? 'Previous' : 'السابق'}
                      </button>
                    )}
                    <button type="button" onClick={() => { setShowForgot(false); setForgotStep(1); setForgotOTP(''); }}
                      className="text-xs text-zinc-500 hover:text-white font-bold transition-colors">
                      {isEn ? 'Return to Login' : 'العودة لتسجيل الدخول'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-between text-[10px] font-bold text-zinc-600 border-t border-zinc-800 pt-4 select-none ${isEn ? 'flex-row-reverse' : ''}`}>
              <span>{isEn ? 'Version 1.0.0' : 'الإصدار 1.0.0'}</span>
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                &copy; 2026 {settings.store_name}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        .glass-panel { background: rgba(24, 24, 27, 0.6); backdrop-filter: blur(16px); }
      `}</style>
    </div>
  );
}