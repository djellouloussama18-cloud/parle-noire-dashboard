import React, { useState, useEffect, useRef } from 'react';
import useInventoryStore from '../../store/useInventoryStore';
import useCartStore from '../../store/useCartStore';
import useSettingsStore from '../../store/useSettingsStore';
import ConnectionStatus from '../ui/ConnectionStatus';
import {
  Menu,
  Search,
  Bell,
  PackageCheck,
  Moon,
  Sun,
  Globe,
  Database
} from 'lucide-react';

export default function TopBar({ isSidebarExpanded, setIsSidebarExpanded }) {
  const { themeMode, language, setThemeMode, setLanguage, storeName } = useSettingsStore();
  const isEn = language === 'en';

  const searchInputRef = useRef(null);
  const [searchVal, setSearchVal] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [lastBackupAgo, setLastBackupAgo] = useState('');

  // Fetch last backup time every minute
  useEffect(function () {
    var fetchLastBackup = function () {
      fetch('/api/backups')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var list = data && data.success && data.backups ? data.backups : (Array.isArray(data) ? data : []);
          if (list.length === 0) { setLastBackupAgo(''); return; }
          var latest = list[0];
          var createdAt = latest.createdAt || latest.created_at;
          if (!createdAt) { setLastBackupAgo(''); return; }
          var diff = Date.now() - new Date(createdAt).getTime();
          var mins = Math.floor(diff / 60000);
          if (mins < 1) setLastBackupAgo(isEn ? 'Just now' : 'الآن');
          else if (mins < 60) setLastBackupAgo(mins + (isEn ? 'm' : 'د'));
          else if (mins < 1440) setLastBackupAgo(Math.floor(mins / 60) + (isEn ? 'h' : 'س'));
          else setLastBackupAgo(Math.floor(mins / 1440) + (isEn ? 'd' : 'ي'));
        })
        .catch(function () {});
    };
    fetchLastBackup();
    var interval = setInterval(fetchLastBackup, 60000);
    return function () { clearInterval(interval); };
  }, [isEn]);

  // Dropdown states
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);

  // Notifications bell mock list
  const products = useInventoryStore(state => state.products);
  const lowStockProducts = products.filter(p => p.quantity <= p.min_quantity);

  const notifications = lowStockProducts.map(p => ({
    id: p.id,
    title: isEn ? 'Low Stock Alert' : 'تنبيه مخزون منخفض',
    text: isEn ? `Product: ${p.name_en || p.name_ar} is running low (Remaining: ${p.quantity})` : `المنتج: ${p.name_ar} شارف على النفاد (المتبقي: ${p.quantity} قطع)`,
    type: 'warning',
    time: isEn ? 'Just now' : 'منذ قليل'
  }));

  // 1. Clock timer
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setCurrentTime(
        date.toLocaleTimeString(isEn ? 'en-US' : 'ar-DZ', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
      );
      setCurrentDate(
        date.toLocaleDateString(isEn ? 'en-US' : 'ar-DZ', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isEn]);

  // 2. Ctrl+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Theme & Language
  const toggleTheme = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  return (
    <header className={`h-14 md:h-16 fixed top-0 left-0 right-0 z-30 bg-bg-primary/90 border-b border-light backdrop-blur-md flex items-center justify-between px-3 md:px-6 select-none no-print ${isEn ? 'flex-row-reverse' : ''}`}>
      
      {/* Right side in RTL: Hamburger & Brand Clock */}
      <div className={`flex items-center gap-4 ${isEn ? 'flex-row-reverse' : ''}`}>
        {/* Mobile hamburger */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
          className="md:hidden p-1.5 text-text-secondary hover:text-accent-primary hover:bg-hover rounded-xl transition-all duration-200 focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>
        {/* Desktop sidebar toggle */}
        <button
          onClick={() => setIsSidebarExpanded(prev => !prev)}
          className="hidden md:block p-1.5 md:p-2 text-text-secondary hover:text-accent-primary hover:bg-hover rounded-xl transition-all duration-200 focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Real-time Digital Clock & Date */}
        <div className={`flex flex-col ${isEn ? 'text-left' : 'text-right'} hidden xs:flex`}>
          <span className="text-xs md:text-sm font-extrabold text-accent-primary tracking-wider tabular-nums">
            {currentTime}
          </span>
          <span className="text-[8px] md:text-[10px] font-bold text-text-secondary leading-tight">
            {storeName}
          </span>
          <span className="text-[8px] md:text-[10px] font-semibold text-text-secondary hidden sm:block">
            {currentDate}
          </span>
        </div>
      </div>

      {/* Middle: Search Box */}
      <div className="relative max-w-lg w-full hidden md:block mx-4">
        <div className={`absolute top-1/2 -translate-y-1/2 text-text-secondary ${isEn ? 'left-4' : 'right-4'}`}>
          <Search className="w-5 h-5" />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          placeholder={isEn ? "Search by product name or barcode... (Ctrl+K)" : "ابحث عن منتج بالاسم أو الباركود... (Ctrl+K)"}
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          className={`w-full h-10 bg-subtle border border-medium rounded-full text-sm font-medium focus:border-accent-primary outline-none transition-all duration-200 focus:shadow-accent ${isEn ? 'text-left pl-12 pr-16' : 'text-right pr-12 pl-16'}`}
        />
        <div className={`absolute top-1/2 -translate-y-1/2 text-[10px] font-black bg-bg-card border border-accent-primary/20 text-text-secondary px-2 py-0.5 rounded-md ${isEn ? 'right-4' : 'left-4'}`}>
          Ctrl+K
        </div>
      </div>

      {/* Connection Status & Tools Section */}
      <div className={`flex items-center gap-2 md:gap-4 ${isEn ? 'flex-row-reverse' : ''}`}>
        {/* Language Toggle */}
        <ConnectionStatus />

        {/* Backup indicator */}
        {lastBackupAgo && (
          <div className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-subtle border border-light text-[9px] font-bold text-text-secondary ${isEn ? 'flex-row-reverse' : ''}`}>
            <Database className="w-3 h-3 text-accent-primary" />
            <span>{isEn ? 'Backup: ' : 'نسخة: '}{lastBackupAgo}</span>
          </div>
        )}

        <button
          onClick={toggleLanguage}
          className="p-1.5 md:p-2 text-text-secondary hover:text-accent-primary hover:bg-hover rounded-xl transition-all duration-200 focus:outline-none flex items-center gap-1"
          title={language === 'ar' ? 'English' : 'العربية'}
        >
          <Globe className="w-[18px] md:w-5 h-[18px] md:h-5" />
          <span className="text-[10px] font-bold uppercase">{language === 'ar' ? 'en' : 'ar'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 md:p-2 text-text-secondary hover:text-accent-primary hover:bg-hover rounded-xl transition-all duration-200 focus:outline-none"
          title={themeMode === 'dark' ? 'Light Mode' : 'Dark Mode'}
        >
          {themeMode === 'dark' ? <Sun className="w-[18px] md:w-5 h-[18px] md:h-5" /> : <Moon className="w-[18px] md:w-5 h-[18px] md:h-5" />}
        </button>

        {/* Notifications bell */}
        <div className="relative">
          <button
            onClick={() => {
              setIsNotifyOpen(prev => !prev);
              setIsProfileOpen(false);
            }}
            className="p-2 md:p-2.5 text-text-secondary hover:text-accent-primary hover:bg-hover rounded-xl relative transition-all duration-200 focus:outline-none"
          >
            <Bell className="w-[18px] md:w-5 h-[18px] md:h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-status-danger text-[9px] font-black text-on-accent flex items-center justify-center animate-pulse">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Notifications dropdown panel */}
          {isNotifyOpen && (
            <div className={`absolute mt-3 w-80 glass-panel rounded-2xl shadow-2xl py-3 z-50 animate-fade-in ${isEn ? 'right-0 text-left' : 'left-0 text-right'}`}>
              <div className={`px-4 py-2 border-b border-light flex justify-between items-center ${isEn ? 'flex-row-reverse' : ''}`}>
                <span className="text-[10px] font-bold text-text-disabled">{isEn ? 'Stock Alerts' : 'تنبيهات المخزون'}</span>
                <span className="text-xs font-black text-text-primary">{isEn ? 'Notifications' : 'الإشعارات'}</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-text-secondary">
                    <PackageCheck className="w-8 h-8 text-accent-primary mx-auto mb-2 opacity-60" />
                    {isEn ? 'No notifications at this moment. Inventory is healthy!' : 'لا توجد إشعارات حالياً. المخزون سليم!'}
                  </div>
                ) : (
                  notifications.map((notif, idx) => (
                    <div key={idx} className="p-3 border-b border-light hover:bg-subtle transition-colors">
                      <div className={`flex justify-between items-start ${isEn ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[9px] text-text-disabled">{notif.time}</span>
                        <h4 className="text-xs font-bold text-status-warning">{notif.title}</h4>
                      </div>
                      <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">{notif.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Store name display */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-subtle border border-light rounded-full select-none">
          <span className="text-xs font-extrabold text-accent-primary">{storeName}</span>
        </div>
      </div>
    </header>
  );
}
