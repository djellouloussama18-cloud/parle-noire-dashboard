import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import useSettingsStore from '../store/useSettingsStore';
import useNotification from '../hooks/useNotification';
import {
  Lock, Mail, User as UserIcon, Eye, EyeOff,
  Shirt, DollarSign, TrendingUp, Package,
  ChevronLeft, LogIn,
  BarChart3, ShieldCheck, Zap, Globe
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

function FloatingCard({ icon: Icon, label, value, color, delay }) {
  return (
    <div
      className="glass-panel p-4.5 rounded-2xl border border-zinc-800 hover:scale-[1.02] transition-all duration-300 select-none animate-float"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-zinc-500">{label}</span>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <span className="text-lg font-black text-white tracking-tight">{value}</span>
    </div>
  );
}

const statCards = [
  { icon: DollarSign, label: 'مبيعات اليوم', value: '142,500 د.ج', color: '#00FF7F', delay: 0 },
  { icon: BarChart3, label: 'الفواتير النشطة', value: '28 فاتورة', color: '#0EA5E9', delay: 0.15 },
  { icon: Package, label: 'القطع في المخزن', value: '3,450 قطعة', color: '#F59E0B', delay: 0.3 },
  { icon: TrendingUp, label: 'هامش الربح', value: '+18.5%', color: '#10B981', delay: 0.45 },
  { icon: Zap, label: 'تحليلات ذكية', value: '7 تنبيهات', color: '#8B5CF6', delay: 0.6 },
  { icon: ShieldCheck, label: 'حالة النظام', value: 'آمن بالكامل', color: '#22C55E', delay: 0.75 },
];

export default function Login() {
  const navigate = useNavigate();
  const loginUser = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const { showSuccess, showError } = useNotification();
  const { settings } = useSettingsStore();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [shake, setShake] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!login || !password) return;
    try {
      const success = await loginUser(login, password);
      if (success) {
        showSuccess('تم تسجيل الدخول بنجاح! مرحباً بك.');
        navigate('/');
      }
    } catch (err) {
      setShake(true);
      showError(err.message || 'بيانات الدخول غير صحيحة');
      setTimeout(() => setShake(false), 600);
    }
  };

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
              نظام كاشير الجيل الجديد
            </div>
            <h1 className="text-5xl font-black leading-tight bg-gradient-to-l from-white via-accent-primary to-zinc-400 bg-clip-text text-transparent">
              نظام إدارة المبيعات والمخزون الذكي
            </h1>
            <p className="text-base text-zinc-400 font-medium leading-relaxed">
              تحكم متكامل في المبيعات، الفواتير، التقارير المالية الذكية ومستودعات الملابس بنقرة زر واحدة.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3.5 w-full relative z-10">
            {statCards.map((card, i) => (
              <FloatingCard
                key={i}
                icon={card.icon}
                label={card.label}
                value={card.value}
                color={card.color}
                delay={card.delay}
              />
            ))}
          </div>
        </div>

        <div className="flex-grow lg:w-[45%] w-full flex items-center justify-center p-6 bg-black">
          <div className={`w-full max-w-[440px] glass-panel border border-zinc-800 rounded-3xl p-8 relative flex flex-col gap-6 shadow-2xl transition-all duration-500 ${
            shake ? 'animate-shake' : ''
          }`}
            style={{ background: 'rgba(24, 24, 27, 0.8)', backdropFilter: 'blur(20px)' }}
          >
            <div className="flex flex-col items-center gap-2 border-b border-zinc-800 pb-5 select-none">
              <div className="w-12 h-12 bg-accent-primary/10 border border-accent-primary/30 rounded-2xl flex items-center justify-center text-accent-primary shadow-accent">
                <Lock className="w-5.5 h-5.5" />
              </div>
              <h2 className="text-2xl font-black text-white mt-2">تسجيل الدخول</h2>
              <p className="text-xs font-bold text-zinc-400 text-center">
                مرحباً بك مجدداً في نظام كاشير {settings.store_name}
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-5 text-right animate-fadeIn">
              <Input
                label="البريد الإلكتروني أو اسم المستخدم"
                placeholder="أدخل اسم المستخدم أو الإيميل"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                icon={UserIcon}
                required
                className="bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500"
              />

              <div className="relative">
                <Input
                  label="كلمة المرور"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={Lock}
                  required
                  className="bg-zinc-900/60 border-zinc-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-accent-primary text-white placeholder-zinc-500"
                />
                <button type="button" onClick={() => setShowPassword(prev => !prev)}
                  className="absolute top-[42px] left-4 text-zinc-500 hover:text-white transition-colors focus:outline-none">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs font-bold select-none">
                <Link to="/forgot-password"
                  className="text-accent-primary hover:underline">
                  نسيت كلمة المرور؟
                </Link>
                <label className="flex items-center gap-2 cursor-pointer text-zinc-400">
                  <span>تذكرني</span>
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-accent-primary cursor-pointer outline-none focus:ring-0" />
                </label>
              </div>

              <Button type="submit" isLoading={isLoading} className="h-[54px] w-full text-base font-extrabold mt-2 shadow-accent">
                <LogIn className="w-5 h-5" />
                دخول إلى النظام
              </Button>

              <div className="text-center mt-1">
                <Link to="/register"
                  className="text-xs font-bold text-zinc-400 hover:text-accent-primary transition-colors">
                  ليس لديك حساب؟ إنشاء حساب جديد
                </Link>
              </div>
            </form>

            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-600 border-t border-zinc-800 pt-4 select-none">
              <span>الإصدار 1.0.0</span>
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
