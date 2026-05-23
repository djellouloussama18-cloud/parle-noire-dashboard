import { supabase } from '../lib/supabase';

const QUEUE_DB = 'ParleNoireQueue';
const QUEUE_VERSION = 1;
const QUEUE_STORE = 'actions';

function openQueueDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(QUEUE_DB, QUEUE_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllQueued() {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.getAll();
    req.onsuccess = () => { resolve(req.result || []); db.close(); };
    req.onerror = () => { reject(req.error); db.close(); };
  });
}

export async function addToQueue(action) {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const record = {
      ...action,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0
    };
    const req = store.add(record);
    req.onsuccess = () => { resolve(req.result); db.close(); };
    req.onerror = () => { reject(req.error); db.close(); };
  });
}

async function removeFromQueue(id) {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.delete(id);
    req.onsuccess = () => { resolve(); db.close(); };
    req.onerror = () => { reject(req.error); db.close(); };
  });
}

async function markFailed(id) {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const record = getReq.result;
      if (!record) { db.close(); resolve(); return; }
      record.status = 'failed';
      record.retries = (record.retries || 0) + 1;
      record.lastError = Date.now();
      store.put(record);
      db.close();
      resolve();
    };
    getReq.onerror = () => { reject(getReq.error); db.close(); };
  });
}

async function flushCreateSale(payload) {
  const { items, ...saleData } = payload;
  const { data: { user } } = await supabase.auth.getUser();
  const { data: sale, error: saleError } = await supabase.from('sales').insert({
    ...saleData,
    user_id: user?.id,
  }).select().single();
  if (saleError || !sale) return false;
  if (items?.length > 0) {
    const saleItemsToInsert = items.map(item => ({ ...item, sale_id: sale.id }));
    const { error: itemsError } = await supabase.from('sale_items').insert(saleItemsToInsert);
    if (itemsError) return false;
    for (const item of items) {
      const { data: prod } = await supabase.from('products').select('quantity').eq('id', item.product_id).single();
      if (prod) {
        await supabase.from('products').update({ quantity: prod.quantity - item.quantity }).eq('id', item.product_id);
      }
    }
  }
  return true;
}

// Track temp ID -> real ID mapping across queue flushes
let _idMapping = {};

function sanitizePayload(payload) {
  const { updatedAt, ...clean } = payload;
  return clean;
}

async function flushCreateProduct(payload) {
  const { data: { user } } = await supabase.auth.getUser();
  const { id: tempId, ...productData } = sanitizePayload(payload);
  const { data, error } = await supabase.from('products').insert({
    ...productData,
    user_id: user?.id,
  }).select().single();
  if (error || !data) return false;
  _idMapping[tempId] = data.id;
  return true;
}

async function flushUpdateProduct(payload) {
  const { id, ...productData } = sanitizePayload(payload);
  const resolvedId = _idMapping[id] || id;
  const { error } = await supabase.from('products').update(productData).eq('id', resolvedId);
  if (error) return false;
  return true;
}

async function flushDeleteProduct(payload) {
  const resolvedId = _idMapping[payload.id] || payload.id;
  const { error } = await supabase.from('products').delete().eq('id', resolvedId);
  if (error) return false;
  return true;
}

async function flushCreateCategory(payload) {
  const { id: tempId, ...categoryData } = sanitizePayload(payload);
  const { data, error } = await supabase.from('categories').insert(categoryData).select().single();
  if (error || !data) return false;
  _idMapping[tempId] = data.id;
  return true;
}

async function flushUpdateCategory(payload) {
  const { id, ...categoryData } = sanitizePayload(payload);
  const resolvedId = _idMapping[id] || id;
  const { error } = await supabase.from('categories').update(categoryData).eq('id', resolvedId);
  if (error) return false;
  return true;
}

async function flushDeleteCategory(payload) {
  const resolvedId = _idMapping[payload.id] || payload.id;
  const { error } = await supabase.from('categories').delete().eq('id', resolvedId);
  if (error) return false;
  return true;
}

async function flushCreateCustomer(payload) {
  const { id: tempId, ...customerData } = sanitizePayload(payload);
  const { data, error } = await supabase.from('customers').insert(customerData).select().single();
  if (error || !data) return false;
  _idMapping[tempId] = data.id;
  return true;
}

async function flushUpdateCustomer(payload) {
  const { id, ...customerData } = sanitizePayload(payload);
  const resolvedId = _idMapping[id] || id;
  const { error } = await supabase.from('customers').update(customerData).eq('id', resolvedId);
  if (error) return false;
  return true;
}

async function flushDeleteCustomer(payload) {
  const resolvedId = _idMapping[payload.id] || payload.id;
  const { error } = await supabase.from('customers').delete().eq('id', resolvedId);
  if (error) return false;
  return true;
}

async function flushCreateNote(payload) {
  const { id: tempId, ...noteData } = sanitizePayload(payload);
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('notes').insert({
    ...noteData,
    created_by: user?.id,
  }).select().single();
  if (error || !data) return false;
  _idMapping[tempId] = data.id;
  return true;
}

async function flushUpdateNote(payload) {
  const { id, ...noteData } = sanitizePayload(payload);
  const resolvedId = _idMapping[id] || id;
  const { error } = await supabase.from('notes').update(noteData).eq('id', resolvedId);
  if (error) return false;
  return true;
}

async function flushDeleteNote(payload) {
  const resolvedId = _idMapping[payload.id] || payload.id;
  const { error } = await supabase.from('notes').delete().eq('id', resolvedId);
  if (error) return false;
  return true;
}

async function flushUpdateSetting(payload) {
  const { key, value } = sanitizePayload(payload);
  const { error } = await supabase.from('settings').upsert(
    { key, value: String(value) },
    { onConflict: 'key' }
  );
  if (error) return false;
  return true;
}

const ACTION_HANDLERS = {
  createProduct: flushCreateProduct,
  updateProduct: flushUpdateProduct,
  deleteProduct: flushDeleteProduct,
  createCategory: flushCreateCategory,
  updateCategory: flushUpdateCategory,
  deleteCategory: flushDeleteCategory,
  createCustomer: flushCreateCustomer,
  updateCustomer: flushUpdateCustomer,
  deleteCustomer: flushDeleteCustomer,
  createNote: flushCreateNote,
  updateNote: flushUpdateNote,
  deleteNote: flushDeleteNote,
  updateSetting: flushUpdateSetting,
  CREATE_SALE: flushCreateSale,
};

async function flushQueue() {
  if (!navigator.onLine) return { flushed: 0, failed: 0 };
  const items = await getAllQueued();
  let flushed = 0;
  let failed = 0;
  _idMapping = {};
  for (const item of items) {
    if (item.status !== 'pending') continue;
    try {
      let ok = false;
      const handler = ACTION_HANDLERS[item.type];
      if (handler) {
        ok = await handler(item.payload);
      } else if (item.url) {
        const response = await fetch(item.url, {
          method: item.method || 'POST',
          headers: { 'Content-Type': 'application/json', ...(item.headers || {}) },
          body: JSON.stringify(item.payload)
        });
        ok = response.ok;
      }
      if (ok) {
        await removeFromQueue(item.id);
        flushed++;
      } else {
        await markFailed(item.id);
        failed++;
      }
    } catch {
      await markFailed(item.id);
      failed++;
    }
  }
  if (flushed > 0) {
    window.dispatchEvent(new CustomEvent('data-synced'));
  }
  return { flushed, failed };
}

export function setupOnlineSync() {
  window.addEventListener('online', async () => {
    window.dispatchEvent(new CustomEvent('sync-started'));
    const result = await flushQueue();
    window.dispatchEvent(new CustomEvent('queue-flushed', { detail: result }));
    if (result.flushed > 0) {
      window.dispatchEvent(new CustomEvent('data-synced'));
    }
  });
}

export const offlineQueue = {
  addToQueue,
  getAllQueued,
  removeFromQueue,
  flushQueue,
  markFailed,
  setupOnlineSync
};
