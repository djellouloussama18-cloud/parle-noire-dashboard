import { supabase } from '../lib/supabase';

export const getReportsSummaryApi = async () => {
  const { data: _sales, error: salesError } = await supabase.from('sales').select('final_amount');
  const { data: _products, error: productsError } = await supabase.from('products').select('quantity');
  
  if (salesError) throw new Error(salesError.message);
  if (productsError) throw new Error(productsError.message);
  
  const sales = _sales || [];
  const products = _products || [];
  
  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.final_amount || 0), 0);
  const totalSalesCount = sales.length;
  const outOfStockCount = products.filter(p => p.quantity <= 0).length;
  
  return {
    totalRevenue,
    totalSales: totalSalesCount,
    outOfStock: outOfStockCount,
  };
};

export const getReportsChartsApi = async () => {
  const { data: _sales, error } = await supabase.from('sales').select('created_at, final_amount');
  if (error) throw new Error(error.message);
  
  const sales = _sales || [];
  const salesByDate = {};
  sales.forEach(sale => {
    const date = new Date(sale.created_at).toISOString().split('T')[0];
    salesByDate[date] = (salesByDate[date] || 0) + Number(sale.final_amount);
  });
  
  const labels = Object.keys(salesByDate).sort();
  const data = labels.map(label => salesByDate[label]);
  
  return {
    labels,
    datasets: [
      {
        label: 'المبيعات',
        data,
      }
    ]
  };
};

export const getBackupsApi = async () => {
  return [];
};

export const triggerBackupApi = async () => {
  return { message: "النسخ الاحتياطي مدار تلقائياً بواسطة Supabase" };
};

export const downloadBackupApi = async (id) => {
  throw new Error("غير متاح مع Supabase");
};
