import { supabase } from '../lib/supabase';

// Products
export const getProductsApi = async () => {
  const { data, error } = await supabase.from('products').select('*').order('id', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

export const createProductApi = async (productData) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('products').insert({ ...productData, user_id: user?.id }).select().single();
  if (error) throw new Error(error.message);
  return data;
};

export const updateProductApi = async (id, productData) => {
  const { data, error } = await supabase.from('products').update(productData).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
};

export const deleteProductApi = async (id) => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
};

// Categories
export const getCategoriesApi = async () => {
  const { data, error } = await supabase.from('categories').select('*').order('id', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

export const createCategoryApi = async (categoryData) => {
  const { data, error } = await supabase.from('categories').insert(categoryData).select().single();
  if (error) throw new Error(error.message);
  return data;
};

export const updateCategoryApi = async (id, categoryData) => {
  const { data, error } = await supabase.from('categories').update(categoryData).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
};

export const deleteCategoryApi = async (id) => {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
};
