import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useSettingsStore from './store/useSettingsStore';
import useInventoryStore from './store/useInventoryStore';
import useSalesStore from './store/useSalesStore';
import useLicenseStore from './store/useLicenseStore';

import MainLayout from './components/layout/MainLayout';
import PageErrorBoundary from './components/ErrorBoundary';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('App Error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', background: '#000', color: '#fff',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px'
        }}>
          <h2>حدث خطأ غير متوقع</h2>
          <p style={{ color: '#888', fontSize: '14px' }}>
            {this.state.error?.message}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
            style={{
              padding: '10px 24px', background: '#00FF7F', color: '#000',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            العودة للرئيسية
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Barcode from './pages/Barcode';
import Print from './pages/Print';
import Settings from './pages/Settings';
import Customers from './pages/Customers';
import Notes from './pages/Notes';
import SalesLog from './pages/SalesLog';
import SalesCalendar from './pages/SalesCalendar';
import Expenses from './pages/Expenses';
import SetupWizard from './pages/SetupWizard';
import { getSetupStatus } from './api/setup.api';

export default function App() {
  const { accentColor, fontSize, themeMode, language } = useSettingsStore();

  var [setupLoading, setSetupLoading] = useState(true);
  var [isFirstRun, setIsFirstRun] = useState(null);

  useEffect(function () {
    getSetupStatus()
      .then(function (res) {
        setIsFirstRun(res.isFirstRun);
        setSetupLoading(false);
      })
      .catch(function () {
        setIsFirstRun(false);
        setSetupLoading(false);
      });
  }, []);

  useEffect(() => {
    Promise.all([
      useInventoryStore.getState().loadProducts(),
      useSalesStore.getState().loadDashboardStats(),
      useSettingsStore.getState().loadSettings(),
      useLicenseStore.getState().loadLicenseInfo(),
    ]).catch(err => console.error('Prefetch failed:', err));
  }, []);

  useEffect(() => {
    if (accentColor) {
      const hex = accentColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      document.documentElement.style.setProperty('--color-accent-primary', accentColor);
      document.documentElement.style.setProperty('--color-accent-rgb', `${r}, ${g}, ${b}`);
    }
  }, [accentColor]);

  useEffect(() => {
    const sizes = { small: '13px', normal: '15px', large: '17px' };
    document.documentElement.style.setProperty('--app-font-size', sizes[fontSize] || '15px');
    document.documentElement.style.fontSize = sizes[fontSize] || '15px';
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
  }, [language]);

  if (setupLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center">
            <svg className="animate-spin h-6 w-6 text-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <span className="text-xs font-bold text-zinc-500">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
      <Routes>
        {isFirstRun ? (
          <>
            <Route path="/setup" element={<SetupWizard />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </>
        ) : (
          <>
        <Route path="/register" element={<PageErrorBoundary><Register /></PageErrorBoundary>} />
        <Route path="/forgot-password" element={<PageErrorBoundary><ForgotPassword /></PageErrorBoundary>} />
        <Route path="/setup" element={<Navigate to="/" replace />} />

        <Route
          path="/"
          element={
            <MainLayout>
              <Dashboard />
            </MainLayout>
          }
        />
        <Route
          path="/sales"
          element={
            <MainLayout>
              <Sales />
            </MainLayout>
          }
        />
        <Route
          path="/inventory"
          element={
            <MainLayout>
              <Inventory />
            </MainLayout>
          }
        />
        <Route
          path="/customers"
          element={
            <MainLayout>
              <Customers />
            </MainLayout>
          }
        />
        <Route
          path="/reports"
          element={
            <MainLayout>
              <Reports />
            </MainLayout>
          }
        />
        <Route
          path="/expenses"
          element={
            <MainLayout>
              <Expenses />
            </MainLayout>
          }
        />
        <Route
          path="/barcode"
          element={
            <MainLayout>
              <Barcode />
            </MainLayout>
          }
        />
        <Route
          path="/print"
          element={
            <MainLayout>
              <Print />
            </MainLayout>
          }
        />
        <Route
          path="/settings"
          element={
            <MainLayout>
              <Settings />
            </MainLayout>
          }
        />
        <Route
          path="/sales-log"
          element={
            <MainLayout>
              <SalesLog />
            </MainLayout>
          }
        />
        <Route
          path="/calendar"
          element={
            <MainLayout>
              <SalesCalendar />
            </MainLayout>
          }
        />
        <Route
          path="/notes"
          element={
            <MainLayout>
              <Notes />
            </MainLayout>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Router>
    </ErrorBoundary>
  );
}
