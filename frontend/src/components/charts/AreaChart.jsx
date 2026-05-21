import React from 'react';
import useSettingsStore from '../../store/useSettingsStore';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function AreaChart({ data = [], xKey = 'date', yKey = 'sales' }) {
  const { language } = useSettingsStore();
  const isEn = language === 'en';

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-3.5 rounded-xl border border-[rgba(var(--color-accent-rgb),0.2)] text-xs" style={{ direction: isEn ? 'ltr' : 'rtl' }}>
          <p className="font-bold text-text-secondary mb-1">{label}</p>
          <p className="text-accent-primary font-extrabold text-sm">
            {payload[0].value.toLocaleString()} {isEn ? 'DZD' : 'د.ج'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[300px] select-none dir-ltr">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-accent-primary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-accent-primary)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--color-accent-rgb), 0.05)" />
          <XAxis
            dataKey={xKey}
            stroke="var(--color-text-secondary)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            stroke="var(--color-text-secondary)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            dx={-8}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke="var(--color-accent-primary)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#areaGradient)"
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
