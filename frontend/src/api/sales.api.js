import { supabase } from '../lib/supabase';
import { offlineDB } from '../services/db.service';
import { addToQueue } from '../services/offline-queue.service';

function getDateRange(period) {
  if (!period) return null;
  const now = new Date();
  let start;
  switch (period) {
    case 'today':
    case 'day':
      start = new Date();
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - start.getDay());
      break;
    case 'month':
      start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start = new Date();
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      return null;
  }
  return { start: start.toISOString(), end: now.toISOString() };
}

export const getSalesApi = async (period) => {
  const dateRange = getDateRange(period);
  if (!navigator.onLine) {
    const allData = await offlineDB.getAll('sales');
    const data = dateRange
      ? allData.filter(s => s.created_at >= dateRange.start && s.created_at < dateRange.end)
      : allData;
    return data.map(sale => ({ ...sale, items: sale.sale_items || sale.items || [] }));
  }
  let query = supabase.from('sales').select('*, sale_items(*)').order('id', { ascending: false });
  if (dateRange) {
    query = query.gte('created_at', dateRange.start);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map(sale => ({ ...sale, items: sale.sale_items }));
};

export const createSaleApi = async (saleData) => {
  const { items, ...restSaleData } = saleData;
  const invoiceNum = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  if (!navigator.onLine) {
    const tempId = Date.now();
    const saleRecord = {
      ...restSaleData,
      id: tempId,
      invoice_number: invoiceNum,
      created_at: new Date().toISOString(),
      sale_items: items || [],
    };
    await addToQueue({ type: 'CREATE_SALE', payload: { ...restSaleData, invoice_number: invoiceNum, items: items || [] } });
    await offlineDB.put('sales', saleRecord);
    if (items && items.length > 0) {
      for (const item of items) {
        const prod = await offlineDB.getById('products', item.product_id);
        if (prod) {
          await offlineDB.put('products', { ...prod, quantity: (prod.quantity || 0) - (item.quantity || 0) });
        }
      }
    }
    window.dispatchEvent(new CustomEvent('sale-completed'));
    window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    return { ...saleRecord, offline: true };
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { data: sale, error: saleError } = await supabase.from('sales').insert({
    ...restSaleData,
    user_id: user?.id,
    invoice_number: invoiceNum,
  }).select().single();

  if (saleError) throw new Error(saleError.message);

  let saleItems = [];
  if (items && items.length > 0) {
    const saleItemsToInsert = items.map(item => ({ ...item, sale_id: sale.id }));
    const { data: insertedItems, error: itemsError } = await supabase.from('sale_items').insert(saleItemsToInsert).select();
    if (itemsError) throw new Error(itemsError.message);
    saleItems = insertedItems || [];

    for (const item of items) {
      const { data: prod } = await supabase.from('products').select('quantity').eq('id', item.product_id).single();
      if (prod) {
        await supabase.from('products').update({ quantity: prod.quantity - item.quantity }).eq('id', item.product_id);
        await offlineDB.put('products', { ...prod, quantity: (prod.quantity || 0) - (item.quantity || 0) });
      }
    }
  }

  const saleRecord = { ...sale, sale_items: saleItems };
  await offlineDB.put('sales', saleRecord);

  window.dispatchEvent(new CustomEvent('sale-completed'));
  window.dispatchEvent(new CustomEvent('data-synced'));
  return sale;
};
