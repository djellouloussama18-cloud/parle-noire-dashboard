import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'تأكيد الحذف',
  message = 'هل أنت متأكد من حذف هذا العنصر نهائياً؟',
  confirmText = 'تأكيد الحذف',
  cancelText = 'إلغاء',
  isDestructive = true,
  isLoading = false
}) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
      <div className="absolute inset-0 cursor-default" onClick={isLoading ? undefined : onClose} />

      <div
        className="relative w-full max-w-sm glass-panel rounded-2xl overflow-hidden shadow-2xl border border-medium text-center"
        style={{
          animation: 'confirmSlideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards'
        }}
      >
        <div className="p-8 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-status-danger/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-status-danger" />
          </div>

          <h3 className="text-lg font-black text-text-primary">{title}</h3>

          <p className="text-sm font-bold text-text-secondary leading-relaxed">
            {message}
          </p>

          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 h-12 rounded-xl border border-default bg-transparent text-text-secondary font-extrabold text-xs hover:bg-hover hover:text-text-primary transition-all disabled:opacity-30"
            >
              {cancelText}
            </button>

            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 h-12 rounded-xl font-extrabold text-xs transition-all disabled:opacity-30 flex items-center justify-center gap-2 ${
                isDestructive
                  ? 'bg-status-danger text-on-accent hover:brightness-110 shadow-lg shadow-status-danger/20'
                  : 'bg-accent-primary text-on-accent hover:brightness-110 shadow-lg shadow-accent-primary/20'
              }`}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-on-accent border-t-transparent rounded-full animate-spin" />
                  جاري...
                </>
              ) : confirmText}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes confirmSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
