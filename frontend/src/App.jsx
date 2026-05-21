import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore';
import useSettingsStore from './store/useSettingsStore';

// Layout & UI
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
            onClick={() => { this.setState({ hasError: false }); window.location.href = '/login'; }}
            style={{
              padding: '10px 24px', background: '#00FF7F', color: '#000',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            العودة لتسجيل الدخول
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Pages
import Login from './pages/Login';
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

// Protected Route Guard
function ProtectedRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  const checkSessionTimeout = useAuthStore((state) => state.checkSessionTimeout);

  useEffect(() => {
    // Audit active sessions every time routes change
    checkSessionTimeout();
  }, []);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  const { accentColor, fontSize, themeMode, language, loadLocalPreferences, fetchSettings } = useSettingsStore();
  const token = useAuthStore((state) => state.token);
  const isLoginPage = window.location.pathname === '/login';

  // Apply theme to CSS variables on mount and whenever they change
  useEffect(() => {
    loadLocalPreferences();
    // Only fetch settings from backend if authenticated and not on login page
    if (token && !isLoginPage) {
      fetchSettings();
    }
  }, []);

  useEffect(() => {
    if (accentColor) {
      // Convert hex to RGB for rgba() usage
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

  // Apply Light/Dark Mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  // Apply Language and Direction
  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
  }, [language]);

  return (
    <ErrorBoundary>
      <Router>
      <Routes>
        {/* Public Auth Pages */}
        <Route path="/login" element={<PageErrorBoundary><Login /></PageErrorBoundary>} />
        <Route path="/register" element={<PageErrorBoundary><Register /></PageErrorBoundary>} />
        <Route path="/forgot-password" element={<PageErrorBoundary><ForgotPassword /></PageErrorBoundary>} />

        {/* Protected POS System */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Sales />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Inventory />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Customers />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Reports />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/barcode"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Barcode />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/print"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Print />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Settings />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Notes />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </ErrorBoundary>
  );
}
