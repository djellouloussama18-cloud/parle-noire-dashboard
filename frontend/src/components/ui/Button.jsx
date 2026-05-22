import React from 'react';
import useSettingsStore from '../../store/useSettingsStore';

export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  className = '',
  disabled = false,
  isLoading = false,
  ...props
}) {
  const { language } = useSettingsStore();
  const isEn = language === 'en';

  let baseStyle = "relative flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold text-sm transition-all duration-200 outline-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
  let variantStyle = "";

  if (variant === 'primary') {
    variantStyle = "bg-gradient-to-r from-accent-primary to-accent-secondary text-on-accent hover:brightness-110 hover:shadow-accent hover:-translate-y-[1px]";
  } else if (variant === 'secondary') {
    variantStyle = "border border-accent-primary bg-transparent text-accent-primary hover:bg-hover hover:-translate-y-[1px]";
  } else if (variant === 'danger') {
    variantStyle = "bg-status-danger text-on-accent hover:brightness-110 hover:shadow-lg hover:-translate-y-[1px]";
  } else if (variant === 'ghost') {
    variantStyle = "bg-transparent text-text-secondary hover:bg-hover hover:text-text-primary";
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variantStyle} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span translate="no">{isEn ? 'Processing...' : 'جاري المعالجة...'}</span>
        </span>
      ) : (
        <span translate="no">{children}</span>
      )}
    </button>
  );
}
