import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Toast from '../ui/Toast';
import useSettingsStore from '../../store/useSettingsStore';

export default function MainLayout({ children }) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const { language } = useSettingsStore();
  const isEn = language === 'en';

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col font-tajawal antialiased">
      {/* 1. Top Navigation Bar */}
      <TopBar
        isSidebarExpanded={isSidebarExpanded}
        setIsSidebarExpanded={setIsSidebarExpanded}
      />

      <div className="flex flex-grow pt-14 md:pt-16 relative">
        {/* 2. Content Area */}
        <main
          className={`flex-grow p-4 md:p-6 transition-all duration-300 ${
            isSidebarExpanded 
              ? (isEn ? 'md:pl-60' : 'md:pr-60') 
              : (isEn ? 'md:pl-[72px]' : 'md:pr-[72px]')
          }`}
        >
          <div className="max-w-[1600px] mx-auto animate-page-transition">
            {children}
          </div>
        </main>

        {/* 3. RTL Fixed Sidebar */}
        <Sidebar
          isExpanded={isSidebarExpanded}
          setIsExpanded={setIsSidebarExpanded}
        />
      </div>

      {/* 4. Global Toast Notifications */}
      <Toast />

      {/* Slide / Fade Page transitions */}
      <style>{`
        .animate-page-transition {
          animation: pageFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes pageFadeIn {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
