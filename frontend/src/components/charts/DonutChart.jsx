import React from 'react';
import useSettingsStore from '../../store/useSettingsStore';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function DonutChart({ data = [] }) {
  const { language } = useSettingsStore();
  const isEn = language === 'en';

  const defaultColors = ['var(--color-accent-primary)', '#00CC66', '#1DB954', '#FFA500', '#FF4444', '#8A2BE2'];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-3.5 rounded-xl border border-[rgba(var(--color-accent-rgb),0.2)] text-xs" style={{ direction: isEn ? 'ltr' : 'rtl' }}>
          <p className="font-bold text-text-primary mb-1">{payload[0].name}</p>
          <p className="text-accent-primary font-extrabold text-sm">
            {payload[0].value.toLocaleString()} {isEn ? 'DZD' : 'د.ج'}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-xs font-semibold text-text-secondary select-none">
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center gap-1.5 cursor-pointer">
            <span>{entry.value}</span>
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full h-[280px] select-none dir-ltr">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<CustomTooltip />} />
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || defaultColors[index % defaultColors.length]}
                stroke="var(--color-chart-stroke)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Legend content={renderLegend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
