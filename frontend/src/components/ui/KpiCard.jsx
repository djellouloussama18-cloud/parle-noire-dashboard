import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function KpiCard({
  title,
  value,
  icon: Icon,
  trendText,
  trendType = 'up', // up, down, neutral
  iconColorClass = 'text-accent-primary bg-active',
  className = '',
  isLoading = false,
  onClick
}) {
  if (isLoading) {
    return (
      <div className={`glass-panel p-6 rounded-2xl flex flex-col justify-between min-h-[140px] animate-pulse ${className}`}>
        <div className="flex items-start justify-between w-full">
          <div className="w-12 h-12 bg-subtle rounded-xl" />
          <div className="w-24 h-4 bg-subtle rounded-md" />
        </div>
        <div className="mt-4 flex flex-col gap-1.5">
          <div className="w-32 h-8 bg-subtle rounded-lg" />
          <div className="w-20 h-3 bg-subtle rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`glass-panel glass-panel-hover p-6 rounded-2xl flex flex-col justify-between min-h-[140px] text-right cursor-pointer select-none ${className}`}
    >
      <div className="flex items-start justify-between w-full">
        {/* Themed Icon Envelope */}
        <div className={`p-3 rounded-xl flex items-center justify-center ${iconColorClass}`}>
          {Icon && <Icon className="w-6 h-6" />}
        </div>
        
        {/* Title */}
        <span className="text-xs font-semibold text-text-secondary">{title}</span>
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        {/* Large Value */}
        <span className="text-2xl lg:text-3xl font-extrabold text-text-primary tracking-tight">
          {value}
        </span>

        {/* Growth Statistics */}
        {trendText && (
          <div className="flex items-center gap-1 text-[11px] font-bold justify-start dir-ltr">
            {trendType === 'up' && (
              <span className="flex items-center text-accent-primary gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                {trendText}
              </span>
            )}
            {trendType === 'down' && (
              <span className="flex items-center text-status-danger gap-0.5">
                <ArrowDownRight className="w-3.5 h-3.5" />
                {trendText}
              </span>
            )}
            {trendType === 'neutral' && (
              <span className="text-text-secondary">
                {trendText}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
