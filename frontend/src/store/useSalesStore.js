import { create } from 'zustand';
import { getSalesApi } from '../api/sales.api';
import { getReportsSummaryApi, getReportsChartsApi } from '../api/reports.api';

const useSalesStore = create((set, get) => ({
  recentSales: [],
  summary: {
    totalRevenue: 0,
    netProfit: 0,
    profitMargin: 0,
    avgInvoice: 0,
    lowStockCount: 0,
    topProduct: 'None',
    topProductQty: 0,
    invoiceCount: 0,
    totalInventoryValue: 0,
    expectedProfit: 0,
  },
  chartsData: {
    salesTrend: [],
    categorySplit: [],
    topProducts: [],
    financialTimeline: []
  },
  isLoading: false,

  loadDashboardStats: async (force = false, period = 'week') => {
    set({ isLoading: true });
    try {
      const [sumRes, chartsRes, salesRes] = await Promise.all([
        getReportsSummaryApi(period),
        getReportsChartsApi(period),
        getSalesApi(period)
      ]);
      set({
        summary: sumRes,
        chartsData: chartsRes,
        recentSales: salesRes.slice(0, 5),
        isLoading: false
      });
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
      set({ isLoading: false });
    }
  },

  loadRecentSales: async () => {
    try {
      const sales = await getSalesApi();
      set({ recentSales: sales.slice(0, 5) });
    } catch (err) {
      console.error('Failed to load recent sales:', err);
    }
  }
}));

export default useSalesStore;
