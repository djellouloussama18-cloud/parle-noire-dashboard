import { supabase } from '../lib/supabase';
import { offlineDB } from '../services/db.service';
import { addToQueue } from '../services/offline-queue.service';

// Products
export const getProductsApi = async () => {
  if (!navigator.onLine) {
    return await offlineDB.getAll('products');
  }
  const { data, error } = await supabase.from('products').select('*').order('id', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

export const createProductApi = async (productData) => {
  if (!navigator.onLine) {
    const tempId = Date.now();
    const data = { ...productData, id: tempId, created_at: new Date().toISOString() };
    await addToQueue({ type: 'createProduct', payload: data });
    await offlineDB.put('products', data);
    return data;
  }
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('products').insert({ ...productData, user_id: user?.id }).select().single();
  if (error) throw new Error(error.message);
  return data;
};

export const updateProductApi = async (id, productData) => {
  if (!navigator.onLine) {
    const data = { ...productData, id };
    await addToQueue({ type: 'updateProduct', payload: data });
    await offlineDB.put('products', data);
    return data;
  }
  const { data, error } = await supabase
    .from('products')
    .update(productData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const deleteProductApi = async (id) => {
  if (!navigator.onLine) {
    await addToQueue({ type: 'deleteProduct', payload: { id } });
    await offlineDB.remove('products', id);
    return { success: true };
  }
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
};

// Categories
export const getCategoriesApi = async () => {
  if (!navigator.onLine) {
    return await offlineDB.getAll('categories');
  }
  const { data, error } = await supabase.from('categories').select('*').order('id', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

export const createCategoryApi = async (categoryData) => {
  if (!navigator.onLine) {
    const tempId = Date.now();
    const data = { ...categoryData, id: tempId, created_at: new Date().toISOString() };
    await addToQueue({ type: 'createCategory', payload: data });
    await offlineDB.put('categories', data);
    return data;
  }
  const { data, error } = await supabase.from('categories').insert(categoryData).select().single();
  if (error) throw new Error(error.message);
  return data;
};

export const updateCategoryApi = async (id, categoryData) => {
  if (!navigator.onLine) {
    const data = { ...categoryData, id };
    await addToQueue({ type: 'updateCategory', payload: data });
    await offlineDB.put('categories', data);
    return data;
  }
  const { data, error } = await supabase.from('categories').update(categoryData).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
};

export const deleteCategoryApi = async (id) => {
  if (!navigator.onLine) {
    await addToQueue({ type: 'deleteCategory', payload: { id } });
    await offlineDB.remove('categories', id);
    return { success: true };
  }
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
};
