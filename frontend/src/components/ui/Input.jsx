import React from 'react';

export default function Input({
  label,
  error,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  icon: Icon,
  className = '',
  inputClassName = '',
  required = false,
  ...props
}) {
  return (
    <div className={`flex flex-col gap-2 w-full text-right ${className}`}>
      {label && (
        <label className="text-[13px] font-medium text-text-secondary select-none">
          {label} {required && <span className="text-status-danger">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute right-4 text-text-secondary pointer-events-none transition-colors duration-200">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className={`w-full h-[52px] bg-subtle border border-default rounded-xl text-text-primary text-sm font-medium outline-none transition-all duration-200 focus:border-accent-primary focus:shadow-accent ${
            Icon ? 'pr-12 pl-4' : 'px-4'
          } ${error ? 'border-status-danger focus:border-status-danger focus:shadow-[0_0_15px_rgba(255,68,68,0.15)]' : ''} ${inputClassName}`}
          {...props}
        />
      </div>
      {error && (
        <span className="flex items-center gap-1.5 text-xs text-status-danger font-medium animate-pulse">
          <span>⚠️</span>
          <span>{error}</span>
        </span>
      )}
    </div>
  );
}
