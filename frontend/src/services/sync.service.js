import { supabase } from '../lib/supabase';
import { offlineDB } from './db.service';

export async function syncAllData() {
  if (!navigator.onLine) return;

  console.log('🔄 Starting full data sync...');
  
  try {
    const syncTasks = [
      { store: 'products', table: 'products' },
      { store: 'categories', table: 'categories' },
      { store: 'customers', table: 'customers' },
      { store: 'settings', table: 'settings' },
      { store: 'sales', table: 'sales' },
      { store: 'notes', table: 'notes' }
    ];

    for (const task of syncTasks) {
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
    window.dispatchEvent(new CustomEvent('data-synced'));
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
  window.dispatchEvent(new CustomEvent('dashboard-refresh'));
  _syncingAfterFlush = false;
});
