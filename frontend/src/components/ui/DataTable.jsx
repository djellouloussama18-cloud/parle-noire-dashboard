import React from 'react';
import useSettingsStore from '../../store/useSettingsStore';

export default function DataTable({
  headers = [],
  data = [],
  renderRow,
  isLoading = false,
  emptyMessage,
  className = ''
}) {
  const { language } = useSettingsStore();
  const isEn = language === 'en';

  if (emptyMessage === undefined) {
    emptyMessage = isEn ? 'No data available' : 'لا توجد بيانات متاحة حالياً';
  }

  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-light bg-bg-card shadow-lg ${className}`}>
      <table className="w-full border-collapse text-right min-w-[600px] md:min-w-[700px] select-text">
        <thead>
          <tr className="border-b border-medium bg-subtle text-text-secondary text-[10px] md:text-xs font-bold">
            {headers.map((header, idx) => (
              <th key={idx} className="p-2 md:p-4 py-2 md:py-3.5 font-bold tracking-wide whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-light">
          {isLoading ? (
            <tr>
              <td colSpan={headers.length} className="p-12 text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-semibold text-text-secondary">{isEn ? 'Loading data...' : 'جاري تحميل البيانات...'}</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="p-12 text-center text-text-secondary text-sm font-medium">
                <div className="flex flex-col items-center justify-center gap-2">
                  <span className="text-2xl">📁</span>
                  <span>{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((item, index) => renderRow(item, index))
          )}
        </tbody>
      </table>
    </div>
  );
}
