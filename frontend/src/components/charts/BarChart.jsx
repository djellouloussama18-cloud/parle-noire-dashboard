import React from 'react';
import useSettingsStore from '../../store/useSettingsStore';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function BarChart({ data = [] }) {
  const { language } = useSettingsStore();
  const isEn = language === 'en';

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-4 rounded-xl border border-[rgba(var(--color-accent-rgb),0.2)] text-right text-xs flex flex-col gap-1.5">
          <p className="font-bold text-text-primary border-b border-[rgba(var(--color-accent-rgb),0.08)] pb-1 mb-1">{label}</p>
          <p className="text-accent-primary font-bold">
            {isEn ? 'Revenue:' : 'الإيرادات:'} {payload[0].value.toLocaleString()} د.ج
          </p>
          <p className="text-[#FF4444] font-bold">
            {isEn ? 'Expenses:' : 'التكاليف:'} {payload[1].value.toLocaleString()} د.ج
          </p>
          <p className="text-[#FFA500] font-bold border-t border-[rgba(var(--color-accent-rgb),0.08)] pt-1 mt-1">
            {isEn ? 'Net Profit:' : 'صافي الربح:'} {payload[2].value.toLocaleString()} د.ج
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex justify-center gap-6 mt-4 text-xs font-semibold select-none">
        <div className="flex items-center gap-1.5 text-accent-primary">
          <span className="w-3 h-3 rounded bg-accent-primary" />
          <span>{isEn ? 'Revenue' : 'الإيرادات'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#FF4444]">
          <span className="w-3 h-3 rounded bg-[#FF4444]" />
          <span>{isEn ? 'Expenses' : 'التكاليف'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#FFA500]">
          <span className="w-6 h-0.5 bg-[#FFA500] block relative after:w-2 after:h-2 after:bg-[#FFA500] after:rounded-full after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2" />
          <span>{isEn ? 'Net Profit' : 'صافي الأرباح'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-[320px] select-none dir-ltr">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--color-accent-rgb), 0.05)" />
          <XAxis
            dataKey="month"
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
          <Legend content={renderLegend} />
          <Bar dataKey="revenues" fill="var(--color-accent-primary)" radius={[4, 4, 0, 0]} barSize={12} />
          <Bar dataKey="expenses" fill="#FF4444" radius={[4, 4, 0, 0]} barSize={12} />
          <Line
            type="monotone"
            dataKey="profit"
            stroke="#FFA500"
            strokeWidth={3}
            dot={{ r: 4, fill: '#FFA500', strokeWidth: 1 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
