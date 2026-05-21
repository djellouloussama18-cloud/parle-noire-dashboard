import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useSettingsStore from '../store/useSettingsStore';
import useNotification from '../hooks/useNotification';
import { checkPasswordStrength } from '../utils/validators';
import { forgotPasswordApi, resetPasswordApi } from '../api/auth.api';
import {
  Mail, Lock, Eye, EyeOff, ChevronLeft, ShieldCheck,
  Shirt, Zap, ArrowLeft
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

function PasswordStrengthMeter({ password }) {
  const strength = checkPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-[10px] font-bold">
        <span className={`${strength.color.replace('bg-', 'text-')} tracking-wide`}>
          قوة كلمة المرور: {strength.label}
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

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const { settings } = useSettingsStore();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setIsSending(true);
    try {
      await forgotPasswordApi(email);
      showSuccess('تم إرسال رمز التحقق إلى بريدك الإلكتروني!');
      setStep(2);
    } catch (err) {
      showError(err.response?.data?.message || 'البريد الإلكتروني غير موجود');
    } finally {
      setIsSending(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      showError('يرجى إدخال رمز التحقق المكون من 6 أرقام');
      return;
    }
    setStep(3);
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      showError('كلمتا المرور غير متطابقتين');
      return;
    }
    if (newPassword.length < 6) {
      showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setIsResetting(true);
    try {
      await resetPasswordApi(email, otp, newPassword);
      showSuccess('تم إعادة تعيين كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.');
      navigate('/login');
    } catch (err) {
      showError(err.response?.data?.message || 'فشل إعادة التعيين');
    } finally {
      setIsResetting(false);
    }
  };

  const passwordStrength = checkPasswordStrength(newPassword);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-0 overflow-hidden relative selection:bg-accent-primary selection:text-black">
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

      <div className="w-full min-h-screen flex z-10">
        <div className="w-[55%] hidden lg:flex flex-col justify-between p-12 bg-zinc-950 relative overflow-hidden border-l border-zinc-800">
          <div className="absolute top-[10%] left-[10%] w-64 h-64 rounded-full bg-emerald-500/5 blur-[80px] animate-pulse z-0" style={{ animationDuration: '6s' }} />
          <div className="absolute bottom-[20%] right-[15%] w-48 h-48 rounded-full bg-purple-500/5 blur-[60px] animate-pulse z-0" style={{ animationDuration: '8s', animationDelay: '1s' }} />

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center">
              <Shirt className="w-6 h-6 text-accent-primary" />
            </div>
            <span className="text-xl font-black tracking-widest bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
              {settings.store_name}
            </span>
          </div>

          <div className="my-auto flex flex-col gap-5 max-w-xl relative z-10 text-right pr-6 self-end">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-[10px] font-black tracking-wider uppercase mb-2">
              <Zap className="w-3.5 h-3.5" />
              استعادة كلمة المرور
            </div>
            <h1 className="text-5xl font-black leading-tight bg-gradient-to-l from-white via-accent-primary to-zinc-400 bg-clip-text text-transparent">
              إعادة تعيين كلمة المرور
            </h1>
            <p className="text-base text-zinc-400 font-medium leading-relaxed">
              أدخل بريدك الإلكتروني لاستلام رمز التحقق وإعادة تعيين كلمة المرور الخاصة بك.
            </p>
          </div>

          <div className="relative z-10 text-right">
            <p className="text-xs text-zinc-500 font-bold">
              تذكرت كلمة المرور؟{' '}
              <Link to="/login" className="text-accent-primary hover:underline">تسجيل الدخول</Link>
            </p>
          </div>
        </div>

        <div className="flex-grow lg:w-[45%] w-full flex items-center justify-center p-6 bg-black">
          <div className="w-full max-w-[440px] glass-panel border border-zinc-800 rounded-3xl p-8 relative flex flex-col gap-6 shadow-2xl"
            style={{ background: 'rgba(24, 24, 27, 0.8)', backdropFilter: 'blur(20px)' }}
          >
            <div className="flex flex-col items-center gap-2 border-b border-zinc-800 pb-5 select-none">
              <div className="w-12 h-12 bg-accent-primary/10 border border-accent-primary/30 rounded-2xl flex items-center justify-center text-accent-primary shadow-accent">
                <ShieldCheck className="w-5.5 h-5.5" />
              </div>
              <h2 className="text-2xl font-black text-white mt-2">إعادة تعيين كلمة المرور</h2>
              <p className="text-xs font-bold text-zinc-400 text-center">
                {step === 1 && 'أدخل بريدك الإلكتروني لاستلام رمز التحقق'}
                {step === 2 && 'أدخل رمز التحقق المرسل إلى بريدك'}
                {step === 3 && 'أدخل كلمة المرور الجديدة'}
              </p>
            </div>

            <form onSubmit={step === 1 ? handleEmailSubmit : step === 2 ? handleOTPSubmit : handleResetSubmit} className="flex flex-col gap-5 text-right animate-fadeIn">
              {step === 1 && (
                <>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    أدخل بريدك الإلكتروني لاستلام رمز تحقق مكون من 6 أرقام.
                  </p>
                  <Input label="البريد الإلكتروني" placeholder="example@store.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} icon={Mail} required
                    className="bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500" />
                  <Button type="submit" isLoading={isSending} className="h-12 mt-2 shadow-accent">إرسال رمز التحقق</Button>
                </>
              )}

              {step === 2 && (
                <>
                  <p className="text-xs text-zinc-400 text-center leading-relaxed">
                    أدخل رمز التحقق المكون من 6 أرقام المرسل إلى {email || 'بريدك الإلكتروني'}
                  </p>
                  <div className="flex gap-3 w-full flex-row-reverse">
                    {Array.from({ length: 6 }).map((_, i) => {
                      const char = (otp || '')[i] || '';
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
                            const newCode = (otp || '').split('');
                            newCode[i] = val;
                            setOtp(newCode.join('').slice(0, 6));
                            if (val && i < 5) {
                              const next = document.getElementById(`fotp-${i + 1}`);
                              if (next) next.focus();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !(otp || '')[i] && i > 0) {
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
                  <Button type="submit" isLoading={isResetting} className="h-12 mt-2 shadow-accent">تأكيد الرمز</Button>
                </>
              )}

              {step === 3 && (
                <>
                  <p className="text-xs text-zinc-400">أدخل كلمة مرور قوية جديدة.</p>
                  <div className="relative">
                    <Input label="كلمة المرور الجديدة"
                      type={showNewPassword ? 'text' : 'password'} placeholder="••••••••••"
                      value={newPassword} onChange={(e) => setNewPassword(e.target.value)} icon={Lock} required
                      className="bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500" />
                    <button type="button" onClick={() => setShowNewPassword(prev => !prev)}
                      className="absolute top-[42px] left-4 text-zinc-500 hover:text-white transition-colors focus:outline-none">
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <PasswordStrengthMeter password={newPassword} />
                  <Input label="تأكيد كلمة المرور"
                    type="password" placeholder="••••••••••"
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} icon={Lock} required
                    className="bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500" />
                  <Button type="submit" isLoading={isResetting} className="h-12 mt-2 shadow-accent">إعادة تعيين كلمة المرور</Button>
                </>
              )}

              <div className="flex gap-3 justify-center mt-1">
                {step > 1 && (
                  <button type="button" onClick={() => setStep(s => s - 1)}
                    className="text-xs text-zinc-500 hover:text-white font-bold transition-colors flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" />
                    السابق
                  </button>
                )}
                <Link to="/login"
                  className="text-xs text-zinc-500 hover:text-white font-bold transition-colors">
                  العودة لتسجيل الدخول
                </Link>
              </div>
            </form>

            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-600 border-t border-zinc-800 pt-4 select-none">
              <span>الإصدار 1.0.0</span>
              <span>&copy; 2026 {settings.store_name}</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        .glass-panel { background: rgba(24, 24, 27, 0.6); backdrop-filter: blur(16px); }
      `}</style>
    </div>
  );
}
