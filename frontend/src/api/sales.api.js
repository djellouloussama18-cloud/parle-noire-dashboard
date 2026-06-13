import { offlineDB } from '../services/db.service';
import { addToQueue } from '../services/offline-queue.service';

import { API_BASE } from './config';

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

function getAuthHeaders() {
  return {};
}

function getAuthHeadersJson() {
  return { 'Content-Type': 'application/json' };
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

  try {
    const url = period
      ? `${API_BASE}/api/sales?period=${encodeURIComponent(period)}`
      : `${API_BASE}/api/sales`;

    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch sales'}`);
    }

    const json = await response.json();
    const data = json.data || json;
    for (const sale of data) {
      await offlineDB.put('sales', { ...sale, sale_items: sale.items });
    }
    return data;
  } catch (error) {
    console.error('getSales error:', error);
    throw error;
  }
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

  try {
    const response = await fetch(`${API_BASE}/api/sales`, {
      method: 'POST',
      headers: getAuthHeadersJson(),
      body: JSON.stringify({ ...restSaleData, items, invoice_number: invoiceNum }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'فشلت العملية');
    }

    const sale = result.data;
    const saleRecord = { ...sale, sale_items: sale.items };
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
    window.dispatchEvent(new CustomEvent('data-synced'));
    return result;
  } catch (error) {
    console.error('createSale error:', error);
    throw error;
  }
};

export const getSaleByIdApi = async (saleId) => {
  const response = await fetch(`${API_BASE}/api/sales/${saleId}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch sale'}`);
  }
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'فشلت العملية');
  return result.data;
};

export const deleteSaleItemApi = async (saleId, itemId) => {
  const response = await fetch(`${API_BASE}/api/sales/${saleId}/items/${itemId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to delete item'}`);
  }
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'فشلت العملية');
  return result.data;
};

export const deleteSaleApi = async (saleId) => {
  console.log('[salesApi.deleteSale] Called with id:', saleId);
  if (!navigator.onLine) {
    const allSales = await offlineDB.getAll('sales');
    const sale = allSales.find(s => s.id === saleId);
    if (!sale) throw new Error('Sale not found');
    const items = sale.sale_items || sale.items || [];
    for (const item of items) {
      const prod = await offlineDB.getById('products', item.product_id);
      if (prod) {
        await offlineDB.put('products', { ...prod, quantity: (prod.quantity || 0) + (item.quantity || 0) });
      }
    }
    await offlineDB.remove('sales', saleId);
    await addToQueue({ type: 'DELETE_SALE', payload: { sale_id: saleId } });
    window.dispatchEvent(new CustomEvent('data-synced'));
    return { ...sale, cancelled: true };
  }

  try {
    const response = await fetch(`${API_BASE}/api/sales/${saleId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
    }

    const text = await response.text();
    const result = JSON.parse(text);

    if (response.status === 404) {
      result.success = true;
      result.alreadyDeleted = true;
    }

    if (!result.success) {
      throw new Error(result.error || 'فشلت العملية');
    }

    await offlineDB.remove('sales', saleId);
    window.dispatchEvent(new CustomEvent('data-synced'));
    return result;
  } catch (error) {
    console.error('deleteSale error:', error);
    throw error;
  }
};
