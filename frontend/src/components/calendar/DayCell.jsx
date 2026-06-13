import React from 'react';
import formatCurrency from '../../utils/formatCurrency';
import { ShoppingBag } from 'lucide-react';

const getDayColor = (revenue, maxRevenue) => {
  if (!revenue || revenue === 0) return 'bg-zinc-800/50 border-zinc-700/30';
  const ratio = revenue / maxRevenue;
  if (ratio < 0.25) return 'bg-emerald-900/60 border-emerald-700/40';
  if (ratio < 0.5) return 'bg-emerald-800/70 border-emerald-600/50';
  if (ratio < 0.75) return 'bg-emerald-700/80 border-emerald-500/60';
  return 'bg-emerald-600 border-emerald-400/70';
};

export default function DayCell({ day, data, maxRevenue, isToday, onClick, isEn }) {
  if (!day) {
    return <div className="aspect-square rounded-xl bg-transparent" />;
  }

  const revenue = data ? Number(data.total_revenue) : 0;
  const count = data ? Number(data.sales_count) : 0;

  return (
    <button
      onClick={onClick}
      className={`
        relative aspect-square rounded-xl border flex flex-col items-center justify-center gap-0.5
        transition-all duration-200 hover:scale-105 hover:shadow-lg hover:z-10
        ${isToday ? 'ring-2 ring-accent-primary ring-offset-2 ring-offset-bg-primary' : ''}
        ${revenue > 0 ? getDayColor(revenue, maxRevenue) : 'bg-zinc-800/30 border-zinc-700/20 hover:bg-zinc-800/50'}
      `}
    >
      <span className={`font-black text-sm leading-none ${revenue > 0 ? 'text-white' : 'text-zinc-500'}`}>
        {day}
      </span>
      {revenue > 0 && (
        <>
          <span className="text-[9px] font-bold text-emerald-300/90 leading-none mt-0.5 truncate max-w-[90%]">
            {formatCurrency(revenue)}
          </span>
          <span className="flex items-center gap-0.5 text-[8px] text-zinc-400 leading-none">
            <ShoppingBag className="w-2.5 h-2.5" />
            {count}
          </span>
        </>
      )}
    </button>
  );
}
