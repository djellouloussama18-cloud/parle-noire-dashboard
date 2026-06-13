import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Select({
  value,
  onChange,
  options = [],
  placeholder = '',
  className = '',
  size = 'md',
  disabled = false,
  dir = 'rtl'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const selectedOption = options.find(o => o.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const selectedEl = listRef.current.querySelector('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    const currentIndex = options.findIndex(o => o.value === value);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = Math.min(currentIndex + 1, options.length - 1);
      if (nextIdx !== currentIndex && options[nextIdx]) {
        onChange(options[nextIdx].value);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = Math.max(currentIndex - 1, 0);
      if (prevIdx !== currentIndex && options[prevIdx]) {
        onChange(options[prevIdx].value);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, [isOpen, options, value, onChange]);

  const sizeStyles = size === 'sm'
    ? 'h-[36px] text-xs px-3'
    : 'h-[48px] text-sm px-4';

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${className}`}
      dir={dir}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 ${sizeStyles} bg-subtle border ${isOpen ? 'border-accent-primary' : 'border-default'} rounded-xl text-text-primary font-medium outline-none transition-all duration-200 hover:border-accent-primary/50 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${!selectedOption && placeholder ? 'text-text-disabled' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && options.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-bg-card border border-medium rounded-xl shadow-2xl overflow-hidden animate-fade-in"
          style={{
            animation: 'dropdownFadeIn 0.15s ease-out forwards',
            maxHeight: '240px',
            overflowY: 'auto'
          }}
          ref={listRef}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              data-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-right px-4 py-2.5 text-sm transition-all duration-100 ${
                option.value === value
                  ? 'bg-accent-primary/10 text-accent-primary font-bold'
                  : 'text-text-primary hover:bg-hover'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
