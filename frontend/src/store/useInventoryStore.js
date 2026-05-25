import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  getProductsApi, createProductApi, updateProductApi, deleteProductApi,
  getCategoriesApi, createCategoryApi, updateCategoryApi, deleteCategoryApi
} from '../api/products.api';

const useInventoryStore = create((set, get) => ({
  products: [],
  categories: [],
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    set({ isLoading: true });
    try {
      const data = await getProductsApi();
      set({ products: data, isLoading: false });
    } catch (err) {
      set({ error: 'فشل تحميل المنتجات', isLoading: false });
    }
  },

  loadProducts: async () => {
    const { fetchProducts } = get();
    return fetchProducts();
  },

  fetchCategories: async () => {
    try {
      const data = await getCategoriesApi();
      set({ categories: data });
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  },

  addProduct: async (prodData) => {
    try {
      const newProduct = await createProductApi(prodData);
      set({ products: [newProduct, ...get().products] });
      return newProduct;
    } catch (err) {
      const msg = err.response?.data?.message || 'حدث خطأ أثناء إضافة المنتج';
      throw new Error(msg);
    }
  },

  updateProduct: async (id, prodData) => {
    try {
      const updated = await updateProductApi(id, prodData);
      set({
        products: get().products.map(p => p.id === parseInt(id, 10) ? updated : p)
      });
      return updated;
    } catch (err) {
      const msg = err.response?.data?.message || 'حدث خطأ أثناء تعديل المنتج';
      throw new Error(msg);
    }
  },

  deleteProduct: async (id) => {
    try {
      await deleteProductApi(id);
      set({
        products: get().products.filter(p => p.id !== parseInt(id, 10))
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'حدث خطأ أثناء حذف المنتج';
      throw new Error(msg);
    }
  },

  addCategory: async (catData) => {
    try {
      const newCategory = await createCategoryApi(catData);
      set({ categories: [...get().categories, newCategory] });
      return newCategory;
    } catch (err) {
      const msg = err.response?.data?.message || 'حدث خطأ أثناء إضافة الفئة';
      throw new Error(msg);
    }
  },

  updateCategory: async (id, catData) => {
    try {
      const updated = await updateCategoryApi(id, catData);
      set({
        categories: get().categories.map(c => c.id === parseInt(id, 10) ? updated : c)
      });
      return updated;
    } catch (err) {
      const msg = err.response?.data?.message || 'حدث خطأ أثناء تعديل الفئة';
      throw new Error(msg);
    }
  },

  deleteCategory: async (id) => {
    try {
      await deleteCategoryApi(id);
      set({
        categories: get().categories.filter(c => c.id !== parseInt(id, 10))
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'حدث خطأ أثناء حذف الفئة';
      throw new Error(msg);
    }
  },

  subscribeToProducts: () => {
    const channel = supabase.channel('products-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => { get().loadProducts(); }
      )
      .subscribe();
    return channel;
  },
}));

export default useInventoryStore;
