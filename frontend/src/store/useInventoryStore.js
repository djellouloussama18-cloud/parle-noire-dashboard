import { create } from 'zustand';
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
      set({ products: data || [], isLoading: false });
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
      set({ categories: data || [] });
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  },

  addProduct: async (prodData) => {
    try {
      const result = await createProductApi(prodData);
      const product = result.data || result; // API returns { success, data }, local returns object directly
      set({ products: [product, ...get().products] });
      return product;
    } catch (err) {
      throw new Error(err.message || 'حدث خطأ أثناء إضافة المنتج');
    }
  },

  updateProduct: async (id, prodData) => {
    try {
      const result = await updateProductApi(id, prodData);
      const updated = result.data || result; // API returns { success, data }, local returns object directly
      set({
        products: get().products.map(p => p.id === parseInt(id, 10) ? updated : p)
      });
      return updated;
    } catch (err) {
      throw new Error(err.message || 'حدث خطأ أثناء تعديل المنتج');
    }
  },

  deleteProduct: async (id) => {
    try {
      await deleteProductApi(id);
      set({
        products: get().products.filter(p => p.id !== parseInt(id, 10))
      });
    } catch (err) {
      throw new Error(err.message || 'حدث خطأ أثناء حذف المنتج');
    }
  },

  addCategory: async (catData) => {
    try {
      const result = await createCategoryApi(catData);
      const category = result.data || result; // API returns { success, data }, local returns object directly
      set({ categories: [...get().categories, category] });
      return category;
    } catch (err) {
      throw new Error(err.message || 'حدث خطأ أثناء إضافة الفئة');
    }
  },

  updateCategory: async (id, catData) => {
    try {
      const result = await updateCategoryApi(id, catData);
      const updated = result.data || result;
      set({
        categories: get().categories.map(c => c.id === parseInt(id, 10) ? updated : c)
      });
      return updated;
    } catch (err) {
      throw new Error(err.message || 'حدث خطأ أثناء تعديل الفئة');
    }
  },

  deleteCategory: async (id) => {
    try {
      await deleteCategoryApi(id);
      set({
        categories: get().categories.filter(c => c.id !== parseInt(id, 10))
      });
    } catch (err) {
      throw new Error(err.message || 'حدث خطأ أثناء حذف الفئة');
    }
  },

  subscribeToProducts: () => {
    return {
      unsubscribe: () => {}
    };
  },
}));

export default useInventoryStore;
