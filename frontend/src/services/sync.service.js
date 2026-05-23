import { supabase } from '../lib/supabase';
import { offlineDB } from './db.service';
import { offlineQueue } from './offline-queue.service';

export async function syncAllData() {
  if (!navigator.onLine) return;

  console.log('🔄 Starting full data sync...');
  window.dispatchEvent(new CustomEvent('sync-started'));
  
  try {
    const pendingItems = await offlineQueue.getAllQueued();
    const typeToStore = {
      createProduct: 'products', updateProduct: 'products', deleteProduct: 'products',
      createCategory: 'categories', updateCategory: 'categories', deleteCategory: 'categories',
      createCustomer: 'customers', updateCustomer: 'customers', deleteCustomer: 'customers',
      createNote: 'notes', updateNote: 'notes', deleteNote: 'notes',
      updateSetting: 'settings',
      CREATE_SALE: 'sales',
    };
    const storesWithPending = new Set(
      pendingItems
        .filter(item => item.status === 'pending' || item.status === 'failed')
        .map(item => typeToStore[item.type])
        .filter(Boolean)
    );

    const syncTasks = [
      { store: 'products', table: 'products' },
      { store: 'categories', table: 'categories' },
      { store: 'customers', table: 'customers' },
      { store: 'settings', table: 'settings' },
      { store: 'sales', table: 'sales' },
      { store: 'notes', table: 'notes' }
    ];

    for (const task of syncTasks) {
      if (storesWithPending.has(task.store)) {
        console.log(`⏸️ Skipping ${task.store} sync — pending queue items exist`);
        continue;
      }

      const { data, error } = await supabase.from(task.table).select('*');
      
      if (!error && data) {
        await offlineDB.clear(task.store);
        await offlineDB.bulkPut(task.store, data);
        console.log(`✅ Synced ${data.length} items to ${task.store}`);
      } else if (error) {
        console.error(`❌ Sync error for ${task.table}:`, error.message);
      }
    }

    localStorage.setItem('last_sync', Date.now().toString());
    window.dispatchEvent(new CustomEvent('products-synced'));
    window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    console.log('✨ Data sync complete!');
  } catch (err) {
    console.error('💥 Critical sync failure:', err);
  }
}

let _syncingAfterFlush = false;

window.addEventListener('data-synced', async () => {
  if (_syncingAfterFlush) return;
  _syncingAfterFlush = true;
  await new Promise(resolve => setTimeout(resolve, 500));
  await syncAllData();
  _syncingAfterFlush = false;
});
