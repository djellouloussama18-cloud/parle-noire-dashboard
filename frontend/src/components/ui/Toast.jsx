import React from 'react';
import useNotification from '../../hooks/useNotification';
import { X, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

export default function Toast() {
  const { toasts, remove } = useNotification();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3 max-w-sm w-full no-print">
      {toasts.map((toast) => {
        let bg = 'bg-[var(--color-toast-success-bg)] border-accent-primary text-text-primary';
        let Icon = CheckCircle;

        if (toast.type === 'error') {
          bg = 'bg-[var(--color-toast-error-bg)] border-status-danger text-[var(--color-toast-error-text)]';
          Icon = AlertCircle;
        } else if (toast.type === 'warning') {
          bg = 'bg-[var(--color-toast-warning-bg)] border-status-warning text-[var(--color-toast-warning-text)]';
          Icon = AlertTriangle;
        }

        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 p-4 rounded-xl border glass-panel shadow-2xl animate-slide-in transition-all duration-300 ${bg}`}
            style={{
              animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards'
            }}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium flex-grow text-right leading-relaxed">{toast.message}</span>
            <button
              onClick={() => remove(toast.id)}
              className="text-text-disabled hover:text-text-primary transition-colors focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
