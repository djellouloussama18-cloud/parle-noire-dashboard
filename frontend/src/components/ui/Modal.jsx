import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md', // sm, md, lg, xl, full
  className = ''
}) {
  // Listen for Escape key to close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Lock background scroll
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let sizeClass = 'max-w-md';
  if (size === 'sm') sizeClass = 'max-w-sm';
  if (size === 'lg') sizeClass = 'max-w-2xl';
  if (size === 'xl') sizeClass = 'max-w-5xl w-[90%]';
  if (size === 'full') sizeClass = 'max-w-full w-[95%] h-[95vh]';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print transition-all duration-300">
      {/* Backdrop Click */}
      <div className="absolute inset-0 cursor-default" onClick={onClose}></div>

      {/* Modal Dialog Card */}
      <div
        className={`relative w-full glass-panel rounded-2xl overflow-hidden flex flex-col max-h-[80vh] shadow-2xl border border-medium animate-fade-in ${sizeClass} ${className}`}
        style={{
          animation: 'modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-light bg-bg-secondary select-none shrink-0">
          <button
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-status-danger rounded-lg transition-colors focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
          
          <h3 className="text-lg font-bold text-text-primary text-right">{title}</h3>
        </div>

        {/* Scrollable Body */}
        <div className="flex-grow overflow-y-auto bg-bg-primary text-right p-6">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="shrink-0 bg-bg-primary border-t border-light">
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(30px);
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
