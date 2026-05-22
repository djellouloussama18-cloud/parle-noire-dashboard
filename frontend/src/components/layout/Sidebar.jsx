import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useCartStore from '../../store/useCartStore';
import useInventoryStore from '../../store/useInventoryStore';
import useSettingsStore from '../../store/useSettingsStore';
import useNotesStore from '../../store/useNotesStore';
import {
  Home,
  Receipt,
  Package,
  TrendingUp,
  QrCode,
  Printer,
  Settings,
  LogOut,
  Shirt,
  Menu,
  Users,
  StickyNote
} from 'lucide-react';

export default function Sidebar({ isExpanded, setIsExpanded }) {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  
  const { language, settings } = useSettingsStore();
  const isEn = language === 'en';

  const cartItemsCount = useCartStore(state => state.items.length);
  const products = useInventoryStore(state => state.products);
  const lowStockCount = products.filter(p => p.quantity <= p.min_quantity).length;
  const unreadNotes = useNotesStore(state => state.unreadCount.total);
  const fetchUnreadCount = useNotesStore(state => state.fetchUnreadCount);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const [isHovered, setIsHovered] = useState(false);

  const menuItems = [
    { path: '/', label: isEn ? 'Home' : 'الرئيسية', icon: Home },
    { path: '/sales', label: isEn ? 'Sales' : 'المبيعات', icon: Receipt, badge: cartItemsCount > 0 ? (isEn ? 'New' : 'جديد') : null },
    { path: '/inventory', label: isEn ? 'Inventory' : 'المخزون', icon: Package, alert: lowStockCount > 0 ? lowStockCount : null },
    { path: '/customers', label: isEn ? 'Customers' : 'الزبائن', icon: Users },
    { path: '/reports', label: isEn ? 'Reports' : 'التقارير', icon: TrendingUp },
    { path: '/barcode', label: isEn ? 'Barcode' : 'الباركود', icon: QrCode },
    { path: '/print', label: isEn ? 'Printing' : 'الطباعة', icon: Printer },
    { path: '/notes', label: isEn ? 'Notes' : 'الملاحظات', icon: StickyNote, alert: unreadNotes > 0 ? unreadNotes : null },
    { path: '/settings', label: isEn ? 'Settings' : 'الإعدادات', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const expanded = isExpanded || isHovered;

  return (
    <>
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed top-0 ${isEn ? 'left-0 border-r' : 'right-0 border-l'} h-full z-40 bg-bg-primary/95 border-light backdrop-blur-md flex flex-col transition-all duration-300 select-none no-print ${
        expanded ? 'w-60' : 'w-[72px]'
      }`}
    >
      {/* 1. Header */}
      <div className={`h-16 flex items-center justify-between px-4 border-b border-light flex-shrink-0 ${isEn ? 'flex-row-reverse' : ''}`}>
        {expanded ? (
          <div className={`flex items-center gap-2 ${isEn ? 'flex-row-reverse' : ''}`}>
            {settings.store_logo ? (
              <img src={`${settings.store_logo}?t=${Date.now()}`} alt="Logo" className="w-8 h-8 rounded-xl object-contain bg-bg-card border border-default p-0.5" />
            ) : (
              <Shirt className="w-6 h-6 text-accent-primary animate-pulse" />
            )}
            <span className="font-black text-sm tracking-widest bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
              {settings.store_name}
            </span>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            {settings.store_logo ? (
              <img src={`${settings.store_logo}?t=${Date.now()}`} alt="Logo" className="w-7 h-7 rounded-lg object-contain bg-bg-card border border-default p-0.5" />
            ) : (
              <Shirt className="w-6 h-6 text-accent-primary animate-pulse" />
            )}
          </div>
        )}
      </div>

      {/* 2. Menu Links (scrollable) */}
      <nav className="flex flex-col gap-1.5 p-3 mt-4 overflow-y-auto flex-grow">
        {menuItems.map((item, idx) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={idx}
              onClick={() => navigate(item.path)}
              className={`relative w-full h-[52px] rounded-xl flex items-center transition-all duration-200 group flex-shrink-0 ${
                expanded ? 'justify-start px-4 gap-4' : 'justify-center'
              } ${isEn && expanded ? 'flex-row-reverse' : ''} ${
                isActive
                  ? `bg-active ${isEn ? 'border-l-4' : 'border-r-4'} border-accent-primary text-accent-primary`
                  : 'text-text-secondary hover:bg-hover hover:text-text-primary'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'text-accent-primary' : ''}`} />

              {expanded && (
                <span className="text-sm font-bold tracking-wide transition-all duration-200">
                  {item.label}
                </span>
              )}

              {!expanded && item.badge && (
                <span className={`absolute top-2 ${isEn ? 'left-2' : 'right-2'} w-2.5 h-2.5 rounded-full bg-accent-primary border-2 border-bg-primary`} />
              )}
              {!expanded && item.alert && (
                <span className={`absolute top-2 ${isEn ? 'left-2' : 'right-2'} w-2.5 h-2.5 rounded-full bg-status-warning border-2 border-bg-primary`} />
              )}

              {expanded && item.badge && (
                <span className={`${isEn ? 'ml-auto' : 'mr-auto'} text-[10px] font-black bg-accent-primary text-on-accent px-2 py-0.5 rounded-full animate-bounce`}>
                  {isEn ? 'New' : 'جديد'}
                </span>
              )}
              {expanded && item.alert && (
                <span className={`${isEn ? 'ml-auto' : 'mr-auto'} text-[10px] font-black bg-status-warning text-on-accent px-2 py-0.5 rounded-full`}>
                  {item.alert}
                </span>
              )}

              {!expanded && (
                <div className={`absolute ${isEn ? 'left-16 group-hover:left-20' : 'right-16 group-hover:right-20'} bg-[var(--color-tooltip-bg)] border border-accent-primary/20 text-text-primary text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 z-50 shadow-xl whitespace-nowrap`}>
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* 3. User Details Footer */}
      <div className="border-t border-light bg-bg-secondary/40 p-3 flex flex-col gap-2 flex-shrink-0">
        <div className={`flex items-center ${expanded ? 'justify-between px-1' : 'justify-center'} ${isEn ? 'flex-row-reverse' : ''}`}>
          {expanded && (
            <div className={`flex items-center gap-2.5 ${isEn ? 'text-left flex-row-reverse' : 'text-right'}`}>
              <div className="w-9 h-9 rounded-full bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center font-extrabold text-accent-primary text-xs select-none">
                {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
              </div>
              <div className={`flex flex-col ${isEn ? 'items-start' : 'items-start'}`}>
                <span className="text-[13px] font-bold text-text-primary">{user?.username || (isEn ? 'Admin' : 'المدير')}</span>
                <span className="text-[10px] text-text-secondary font-medium">{isEn ? 'System Admin' : 'مدير النظام'}</span>
              </div>
            </div>
          )}
          {!expanded && (
            <div className="w-9 h-9 rounded-full bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center font-extrabold text-accent-primary text-xs select-none">
              {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
            </div>
          )}

          {expanded && (
            <button
              onClick={handleLogout}
              className="p-2 text-status-danger hover:bg-status-danger/10 rounded-lg transition-colors focus:outline-none"
              title={isEn ? 'Logout' : 'تسجيل الخروج'}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>

    {isExpanded && (
      <div
        className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
        onClick={() => setIsExpanded(false)}
      />
    )}
    </>
  );
}
