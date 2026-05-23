import { supabase } from '../lib/supabase';
import { offlineDB } from '../services/db.service';
import { addToQueue } from '../services/offline-queue.service';

export const getCustomersApi = async () => {
  if (!navigator.onLine) {
    return await offlineDB.getAll('customers');
  }
  const { data, error } = await supabase.from('customers').select('*').order('id', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

export const createCustomerApi = async (customerData) => {
  if (!navigator.onLine) {
    const tempId = Date.now();
    const data = { ...customerData, id: tempId, total_purchases: 0, created_at: new Date().toISOString() };
    await addToQueue({ type: 'createCustomer', payload: data });
    await offlineDB.put('customers', data);
    return data;
  }
  const { data, error } = await supabase.from('customers').insert(customerData).select().single();
  if (error) throw new Error(error.message);
  await offlineDB.put('customers', data);
  return data;
};

export const updateCustomerApi = async (id, customerData) => {
  if (!navigator.onLine) {
    const data = { ...customerData, id };
    await addToQueue({ type: 'updateCustomer', payload: data });
    await offlineDB.put('customers', data);
    return data;
  }
  const { data, error } = await supabase.from('customers').update(customerData).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  await offlineDB.put('customers', data);
  return data;
};

export const deleteCustomerApi = async (id) => {
  if (!navigator.onLine) {
    await addToQueue({ type: 'deleteCustomer', payload: { id } });
    await offlineDB.remove('customers', id);
    return { success: true };
  }
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await offlineDB.remove('customers', id);
  return { success: true };
};
