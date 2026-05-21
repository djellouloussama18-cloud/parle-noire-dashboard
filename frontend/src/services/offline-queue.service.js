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

async function flushQueue() {
  if (!navigator.onLine) return { flushed: 0, failed: 0 };
  const items = await getAllQueued();
  let flushed = 0;
  let failed = 0;
  for (const item of items) {
    if (item.status === 'pending') {
      try {
        const response = await fetch(item.url, {
          method: item.method || 'POST',
          headers: { 'Content-Type': 'application/json', ...(item.headers || {}) },
          body: JSON.stringify(item.payload)
        });
        if (response.ok) {
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
  }
  return { flushed, failed };
}

export function setupOnlineSync() {
  window.addEventListener('online', async () => {
    const result = await flushQueue();
    if (result.flushed > 0) {
      const event = new CustomEvent('queue-flushed', { detail: result });
      window.dispatchEvent(event);
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
