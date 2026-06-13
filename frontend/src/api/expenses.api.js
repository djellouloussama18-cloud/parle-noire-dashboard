// Option B — expenses are API-only, no offline IndexedDB writes.
// Backend CRUD (Express + SQLite) is always available on the local
// network, so there is no need for offline queue or IndexedDB storage.
// Other entities (products, customers, sales) keep their offline
// behavior untouched.

import { API_BASE } from './config';

function getAuthHeaders() {
  return {};
}

function getAuthHeadersJson() {
  return { 'Content-Type': 'application/json' };
}

export const getExpenses = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.category) query.append('category', params.category);
  if (params.payment_method) query.append('payment_method', params.payment_method);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);

  try {
    const response = await fetch(`${API_BASE}/api/expenses?${query}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch expenses'}`);
    }
    const json = await response.json();
    if (!json.success) throw new Error(json.error || 'فشلت العملية');
    return json.data || { expenses: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 }, summary: { total_amount: 0, count: 0 } };
  } catch (error) {
    console.error('getExpenses error:', error);
    throw error;
  }
};

export const getExpensesSummary = async (year, month) => {
  try {
    const response = await fetch(`${API_BASE}/api/expenses/summary?year=${year}&month=${month}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch summary'}`);
    }
    const json = await response.json();
    if (!json.success) throw new Error(json.error || 'فشلت العملية');
    return json.data;
  } catch (error) {
    console.error('getExpensesSummary error:', error);
    throw error;
  }
};

export const getExpensesCategories = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/expenses/categories`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch categories'}`);
    }
    const json = await response.json();
    if (!json.success) throw new Error(json.error || 'فشلت العملية');
    return json.data.categories || [];
  } catch (error) {
    console.error('getExpensesCategories error:', error);
    throw error;
  }
};

export const createExpense = async (data) => {
  try {
    const response = await fetch(`${API_BASE}/api/expenses`, {
      method: 'POST',
      headers: getAuthHeadersJson(),
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
    }
    const json = await response.json();
    if (!json.success) throw new Error(json.error || 'فشلت العملية');
    return json;
  } catch (error) {
    console.error('createExpense error:', error);
    throw error;
  }
};

export const updateExpense = async (id, data) => {
  try {
    const response = await fetch(`${API_BASE}/api/expenses/${id}`, {
      method: 'PUT',
      headers: getAuthHeadersJson(),
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
    }
    const json = await response.json();
    if (!json.success) throw new Error(json.error || 'فشلت العملية');
    return json;
  } catch (error) {
    console.error('updateExpense error:', error);
    throw error;
  }
};

export const deleteExpense = async (id) => {
  try {
    const response = await fetch(`${API_BASE}/api/expenses/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
    }
    const json = await response.json();
    if (!json.success) throw new Error(json.error || 'فشلت العملية');
    return json;
  } catch (error) {
    console.error('deleteExpense error:', error);
    throw error;
  }
};

export async function getExpensesPeriodSummary(params = {}) {
  const query = new URLSearchParams();
  if (params.date_from) query.append('date_from', params.date_from);
  if (params.date_to) query.append('date_to', params.date_to);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.user_id) query.append('user_id', params.user_id);

  try {
    const response = await fetch(`${API_BASE}/api/expenses/summary?${query}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch expenses summary'}`);
    }
    const json = await response.json();
    if (!json.success) throw new Error(json.error || 'فشلت العملية');
    return json.data;
  } catch (error) {
    console.error('getExpensesSummary error:', error);
    throw error;
  }
}

const expensesApi = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.category) query.append('category', params.category);
    if (params.paymentMethod) query.append('paymentMethod', params.paymentMethod);
    if (params.payment_method) query.append('payment_method', params.payment_method);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.search) query.append('search', params.search);
    try {
      const response = await fetch(`${API_BASE}/api/expenses?${query}`, { headers: getAuthHeaders() });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch expenses'}`);
      }
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'فشلت العملية');
      return json.data || { expenses: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 }, summary: { total_amount: 0, count: 0 } };
    } catch (error) {
      console.error('expensesApi.getAll error:', error);
      throw error;
    }
  },
  getCategories: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/expenses/categories`, { headers: getAuthHeaders() });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch categories'}`);
      }
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'فشلت العملية');
      return json.data.categories || [];
    } catch (error) {
      console.error('expensesApi.getCategories error:', error);
      throw error;
    }
  },
  getSummary: async (year, month) => {
    try {
      const response = await fetch(`${API_BASE}/api/expenses/summary?year=${year}&month=${month}`, { headers: getAuthHeaders() });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch summary'}`);
      }
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'فشلت العملية');
      return json.data;
    } catch (error) {
      console.error('expensesApi.getSummary error:', error);
      throw error;
    }
  },
  create: async (data) => {
    try {
      const response = await fetch(`${API_BASE}/api/expenses`, {
        method: 'POST', headers: getAuthHeadersJson(), body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
      }
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'فشلت العملية');
      return json;
    } catch (error) {
      console.error('expensesApi.create error:', error);
      throw error;
    }
  },
  update: async (id, data) => {
    try {
      const response = await fetch(`${API_BASE}/api/expenses/${id}`, {
        method: 'PUT', headers: getAuthHeadersJson(), body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
      }
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'فشلت العملية');
      return json;
    } catch (error) {
      console.error('expensesApi.update error:', error);
      throw error;
    }
  },
  delete: async (id) => {
    try {
      const response = await fetch(`${API_BASE}/api/expenses/${id}`, {
        method: 'DELETE', headers: getAuthHeaders()
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Server error'}`);
      }
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'فشلت العملية');
      return json;
    } catch (error) {
      console.error('expensesApi.delete error:', error);
      throw error;
    }
  },
  getSummaryInPeriod: async (startDate, endDate) => {
    try {
      const response = await fetch(`${API_BASE}/api/expenses/summary?date_from=${startDate}&date_to=${endDate}`, { headers: getAuthHeaders() });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch summary'}`);
      }
      const json = await response.json();
      if (!json.success) throw new Error(json.error || 'فشلت العملية');
      return json.data;
    } catch (error) {
      console.error('expensesApi.getSummaryInPeriod error:', error);
      throw error;
    }
  }
};

export default expensesApi;
