import { offlineDB } from '../services/db.service';
import { addToQueue } from '../services/offline-queue.service';

import { API_BASE } from './config';

function getAuthHeaders() {
  return {};
}

function getAuthHeadersJson() {
  return { 'Content-Type': 'application/json' };
}

export const getCustomersApi = async () => {
  if (!navigator.onLine) {
    return await offlineDB.getAll('customers');
  }
  try {
    const response = await fetch(`${API_BASE}/api/customers`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch customers'}`);
    }
    const data = await response.json();
    for (const customer of data) {
      await offlineDB.put('customers', customer);
    }
    return data;
  } catch (error) {
    console.error('getCustomers error:', error);
    throw error;
  }
};

export const createCustomerApi = async (customerData) => {
  if (!navigator.onLine) {
    const tempId = Date.now();
    const data = { ...customerData, id: tempId, total_purchases: 0, created_at: new Date().toISOString() };
    await addToQueue({ type: 'createCustomer', payload: data });
    await offlineDB.put('customers', data);
    return data;
  }

  try {
    const response = await fetch(`${API_BASE}/api/customers`, {
      method: 'POST',
      headers: getAuthHeadersJson(),
      body: JSON.stringify(customerData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'فشلت العملية');
    }

    await offlineDB.put('customers', result.data);
    return result;
  } catch (error) {
    console.error('createCustomer error:', error);
    throw error;
  }
};

export const updateCustomerApi = async (id, customerData) => {
  if (!navigator.onLine) {
    const data = { ...customerData, id: parseInt(id, 10) };
    await addToQueue({ type: 'updateCustomer', payload: data });
    await offlineDB.put('customers', data);
    return data;
  }

  try {
    const response = await fetch(`${API_BASE}/api/customers/${id}`, {
      method: 'PUT',
      headers: getAuthHeadersJson(),
      body: JSON.stringify(customerData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'فشلت العملية');
    }

    await offlineDB.put('customers', result.data);
    return result;
  } catch (error) {
    console.error('updateCustomer error:', error);
    throw error;
  }
};

export const deleteCustomerApi = async (id) => {
  if (!navigator.onLine) {
    await addToQueue({ type: 'deleteCustomer', payload: { id } });
    await offlineDB.remove('customers', parseInt(id, 10));
    return { success: true };
  }

  try {
    const response = await fetch(`${API_BASE}/api/customers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'فشلت العملية');
    }

    await offlineDB.remove('customers', parseInt(id, 10));
    return result;
  } catch (error) {
    console.error('deleteCustomer error:', error);
    throw error;
  }
};
