import { API_BASE } from './config';

function getAuthHeaders() {
  return {};
}

export const getMonthDataApi = async (year, month) => {
  try {
    const response = await fetch(
      `${API_BASE}/api/calendar/month?year=${year}&month=${month}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch month data'}`);
    }
    const json = await response.json();
    if (!json.success) throw new Error(json.error || 'فشلت العملية');
    return json.data || {};
  } catch (error) {
    console.error('getMonthData error:', error);
    throw error;
  }
};

export const getDayDataApi = async (year, month, day) => {
  try {
    const response = await fetch(
      `${API_BASE}/api/calendar/day?year=${year}&month=${month}&day=${day}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch day data'}`);
    }
    const json = await response.json();
    if (!json.success) throw new Error(json.error || 'فشلت العملية');
    return json.data || { sales: [], summary: { total_revenue: 0, sales_count: 0, avg_invoice: 0 } };
  } catch (error) {
    console.error('getDayData error:', error);
    throw error;
  }
};
