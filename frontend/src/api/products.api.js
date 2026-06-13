import { offlineDB } from '../services/db.service';
import { addToQueue } from '../services/offline-queue.service';

import { API_BASE } from './config';

function getAuthHeaders() {
  return {};
}

function getAuthHeadersJson() {
  return { 'Content-Type': 'application/json' };
}

export const getProductsApi = async () => {
  if (!navigator.onLine) {
    return await offlineDB.getAll('products');
  }
  try {
    const response = await fetch(`${API_BASE}/api/products`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch products'}`);
    }
    const data = await response.json();
    for (const product of data) {
      await offlineDB.put('products', product);
    }
    return data;
  } catch (error) {
    console.error('getProducts error:', error);
    throw error;
  }
};

export const createProductApi = async (productData) => {
  if (productData.id !== undefined) {
    console.error('[createProductApi] Refusing to POST with id — use updateProductApi instead', productData.id);
    throw new Error('Cannot create a product that already has an id. Use updateProductApi.');
  }

  if (!navigator.onLine) {
    const tempId = Date.now();
    const data = { ...productData, id: tempId, created_at: new Date().toISOString() };
    await addToQueue({ type: 'createProduct', payload: data });
    await offlineDB.put('products', data);
    return data;
  }

  try {
    let body;
    let headers;

    if (productData.image instanceof File) {
      const formData = new FormData();
      Object.keys(productData).forEach(key => {
        if (key !== 'image' && productData[key] !== undefined) {
          if (key === 'image_url' && typeof productData[key] === 'string' && productData[key].startsWith('data:')) {
            return;
          }
          formData.append(key, productData[key]);
        }
      });
      formData.append('image', productData.image);
      body = formData;
      headers = getAuthHeaders();
    } else {
      const jsonData = { ...productData };
      delete jsonData.id; // safety: never send id to POST
      if (typeof jsonData.image_url === 'string' && jsonData.image_url.startsWith('data:')) {
        delete jsonData.image_url;
      }
      body = JSON.stringify(jsonData);
      headers = getAuthHeadersJson();
    }

    const response = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'فشلت العملية');
    }

    await offlineDB.put('products', result.data);
    return result;
  } catch (error) {
    console.error('createProduct error:', error);
    throw error;
  }
};

export const updateProductApi = async (id, productData) => {
  if (!navigator.onLine) {
    const data = { ...productData, id: parseInt(id, 10) };
    await addToQueue({ type: 'updateProduct', payload: data });
    await offlineDB.put('products', data);
    return data;
  }

  try {
    let body;
    let headers;

    if (productData.image instanceof File) {
      const formData = new FormData();
      Object.keys(productData).forEach(key => {
        if (key !== 'image' && productData[key] !== undefined) {
          if (key === 'image_url' && typeof productData[key] === 'string' && productData[key].startsWith('data:')) {
            return;
          }
          formData.append(key, productData[key]);
        }
      });
      formData.append('image', productData.image);
      body = formData;
      headers = getAuthHeaders();
    } else {
      const jsonData = { ...productData };
      delete jsonData.id; // safety: id is in the URL, not the body
      if (typeof jsonData.image_url === 'string' && jsonData.image_url.startsWith('data:')) {
        delete jsonData.image_url;
      }
      body = JSON.stringify(jsonData);
      headers = getAuthHeadersJson();
    }

    const response = await fetch(`${API_BASE}/api/products/${id}`, {
      method: 'PUT',
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'فشلت العملية');
    }

    await offlineDB.put('products', result.data);
    return result;
  } catch (error) {
    console.error('updateProduct error:', error);
    throw error;
  }
};

export const deleteProductApi = async (id) => {
  if (!navigator.onLine) {
    await addToQueue({ type: 'deleteProduct', payload: { id } });
    await offlineDB.remove('products', parseInt(id, 10));
    return { success: true };
  }

  try {
    const response = await fetch(`${API_BASE}/api/products/${id}`, {
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

    await offlineDB.remove('products', parseInt(id, 10));
    return result;
  } catch (error) {
    console.error('deleteProduct error:', error);
    throw error;
  }
};

export const getCategoriesApi = async () => {
  if (!navigator.onLine) {
    return await offlineDB.getAll('categories');
  }
  try {
    const response = await fetch(`${API_BASE}/api/categories`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch categories'}`);
    }
    const data = await response.json();
    for (const cat of data) {
      await offlineDB.put('categories', cat);
    }
    return data;
  } catch (error) {
    console.error('getCategories error:', error);
    throw error;
  }
};

export const createCategoryApi = async (categoryData) => {
  if (!navigator.onLine) {
    const tempId = Date.now();
    const data = { ...categoryData, id: tempId, created_at: new Date().toISOString() };
    await addToQueue({ type: 'createCategory', payload: data });
    await offlineDB.put('categories', data);
    return data;
  }

  try {
    const response = await fetch(`${API_BASE}/api/categories`, {
      method: 'POST',
      headers: getAuthHeadersJson(),
      body: JSON.stringify(categoryData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'فشلت العملية');
    }

    await offlineDB.put('categories', result.data);
    return result;
  } catch (error) {
    console.error('createCategory error:', error);
    throw error;
  }
};

export const updateCategoryApi = async (id, categoryData) => {
  if (!navigator.onLine) {
    const data = { ...categoryData, id: parseInt(id, 10) };
    await addToQueue({ type: 'updateCategory', payload: data });
    await offlineDB.put('categories', data);
    return data;
  }

  try {
    const response = await fetch(`${API_BASE}/api/categories/${id}`, {
      method: 'PUT',
      headers: getAuthHeadersJson(),
      body: JSON.stringify(categoryData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'فشلت العملية');
    }

    await offlineDB.put('categories', result.data);
    return result;
  } catch (error) {
    console.error('updateCategory error:', error);
    throw error;
  }
};

export const deleteCategoryApi = async (id) => {
  if (!navigator.onLine) {
    await addToQueue({ type: 'deleteCategory', payload: { id } });
    await offlineDB.remove('categories', parseInt(id, 10));
    return { success: true };
  }

  try {
    const response = await fetch(`${API_BASE}/api/categories/${id}`, {
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

    await offlineDB.remove('categories', parseInt(id, 10));
    return result;
  } catch (error) {
    console.error('deleteCategory error:', error);
    throw error;
  }
};
