'use strict';

const path = require('path');
const fs = require('fs');
const https = require('https');

const ROOT = path.join(__dirname, '..', '..');

// ── Load .env ──────────────────────────────────────────────
try {
  const dotenvPath = path.join(ROOT, 'node_modules', 'dotenv');
  if (fs.existsSync(dotenvPath)) {
    require(dotenvPath).config({ path: path.join(__dirname, '.env.sync') });
  }
} catch (_) {
  try {
    require('dotenv').config({ path: path.join(__dirname, '.env.sync') });
  } catch (_2) {}
}

// ── Config ─────────────────────────────────────────────────
const SUPABASE_URL        = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const LICENSE_CODE         = process.env.SYNC_LICENSE_CODE || 'PN-2T7Q-7WVE-9BC4';
const DRY_RUN              = process.env.SYNC_DRY_RUN === '1';

const PAGE_SIZE = 1000;
const DB_PATH   = path.join(ROOT, 'database', 'pos_store.db');
const BACKUP_DB_DIR = path.join(ROOT, 'backups');
const UPLOADS_DIR    = path.join(ROOT, 'uploads', 'products');
const BACKUP_UPL_DIR = path.join(ROOT, 'backups');

// ── Validation ──────────────────────────────────────────────
if (!SUPABASE_URL) {
  console.error('ERROR: SUPABASE_URL is required.');
  process.exit(1);
}
if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_KEY is required.');
  process.exit(1);
}

// ── HTTP helper (Supabase REST via https) ──────────────────
function supabaseGet(pathname, queryString) {
  const url = new URL(pathname, SUPABASE_URL);
  if (queryString) url.search = queryString;

  return new Promise((resolve, reject) => {
    const opts = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: 'Bearer ' + SUPABASE_SERVICE_KEY,
        Accept: 'application/json',
      },
    };

    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          return reject(new Error('HTTP ' + res.statusCode + ' ' + body));
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error('Failed to parse response: ' + body.slice(0, 200)));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchAllPages(table, filterColumn, filterValue) {
  const rows = [];
  let page = 0;

  while (true) {
    let qs = 'select=*&limit=' + PAGE_SIZE + '&offset=' + (page * PAGE_SIZE) + '&order=id';
    if (filterColumn && filterValue !== undefined && filterValue !== null) {
      qs += '&' + encodeURIComponent(filterColumn) + '=eq.' + encodeURIComponent(filterValue);
    }

    const data = await supabaseGet('/rest/v1/' + table, qs);
    if (!Array.isArray(data)) break;

    rows.push(...data);
    console.log('  ' + table + ' page ' + (page + 1) + ': ' + data.length + ' rows');

    if (data.length < PAGE_SIZE) break;
    page++;
  }

  return rows;
}

// ── Local DB helpers (via db.js) ──────────────────────────
let _db = null;
async function getLocalDb() {
  if (_db) return _db;
  const { getDb } = require(path.join(ROOT, 'backend', 'database', 'db'));
  _db = await getDb();
  return _db;
}

function saveLocalDb() {
  if (_db) {
    const { saveDb } = require(path.join(ROOT, 'backend', 'database', 'db'));
    saveDb();
  }
}

function localQuery(sql, params) {
  const stmt = _db.prepare(sql);
  if (params) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function localExec(sql, params) {
  if (params) {
    _db.run(sql, params);
  } else {
    _db.run(sql);
  }
}

function getMaxId(table) {
  const r = localQuery('SELECT COALESCE(MAX(id), 0) AS maxid FROM ' + table);
  return r.length > 0 ? r[0].maxid : 0;
}

function localExists(table, id) {
  const r = localQuery('SELECT 1 AS found FROM ' + table + ' WHERE id = ? LIMIT 1', [id]);
  return r.length > 0;
}

// ── Backup ─────────────────────────────────────────────────
function createBackup() {
  if (DRY_RUN) {
    console.log('  [DRY RUN] Skipping backup.');
    return null;
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dbBackupName = 'pos_store.db.pre-sync-' + ts + '.db';
  const dbBackupPath = path.join(BACKUP_DB_DIR, dbBackupName);

  if (!fs.existsSync(BACKUP_DB_DIR)) {
    fs.mkdirSync(BACKUP_DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, dbBackupPath);
    console.log('  Backup created: ' + dbBackupPath);
  } else {
    console.log('  WARNING: Local DB not found at ' + DB_PATH + ', skipping DB backup.');
  }

  const ulBackupDir = path.join(BACKUP_UPL_DIR, 'uploads-products.pre-sync-' + ts);
  if (fs.existsSync(UPLOADS_DIR)) {
    if (!fs.existsSync(ulBackupDir)) {
      fs.mkdirSync(ulBackupDir, { recursive: true });
    }
    const files = fs.readdirSync(UPLOADS_DIR);
    for (const f of files) {
      const src = path.join(UPLOADS_DIR, f);
      if (fs.statSync(src).isFile()) {
        fs.copyFileSync(src, path.join(ulBackupDir, f));
      }
    }
    console.log('  Uploads backup created: ' + ulBackupDir + ' (' + files.length + ' files)');
  } else {
    console.log('  WARNING: Uploads directory not found, skipping uploads backup.');
  }

  return { db: dbBackupPath, uploads: ulBackupDir };
}

// ── STEP 1a: Resolve SUPABASE_USER_ID ─────────────────────
async function resolveSupabaseUserId() {
  const fields = 'id,email,full_name';
  let tries = [
    { col: 'license_key',   val: LICENSE_CODE },
    { col: 'license_code',  val: LICENSE_CODE },
    { col: 'serial',        val: LICENSE_CODE },
  ];

  for (const t of tries) {
    let rows;
    try {
      rows = await fetchAllPages('profiles', t.col, t.val);
    } catch (err) {
      console.log('  profiles.' + t.col + ' lookup failed (' + err.message + '), trying next...');
      continue;
    }
    if (rows.length === 0) {
      console.log('  profiles.' + t.col + ' = ' + LICENSE_CODE + ' → 0 rows, trying next...');
      continue;
    }
    if (rows.length > 1) {
      console.error('ERROR: ' + rows.length + ' profiles matched ' + t.col + ' = ' + LICENSE_CODE + '. Expected 1.');
      process.exit(3);
    }
    console.log('  Matched profile: id=' + rows[0].id + ', email=' + (rows[0].email || '') + ', name=' + (rows[0].full_name || ''));
    return rows[0];
  }

  console.error('ERROR: No profile found matching license code "' + LICENSE_CODE + '" in Supabase.');
  console.error('  Tried columns: license_key, license_code, serial');
  process.exit(2);
}

// ── STEP 1b: Resolve LOCAL_USER_ID ────────────────────────
async function resolveLocalUserId() {
  const db = await getLocalDb();

  let rows = localQuery("SELECT id, email FROM profiles WHERE email = 'admin@pos.local' LIMIT 1");
  if (rows.length === 0) {
    rows = localQuery('SELECT id, email FROM profiles LIMIT 1');
  }
  if (rows.length === 0) {
    console.error('ERROR: No local profile found. Run setup first.');
    process.exit(1);
  }

  console.log('  Local user: id=' + rows[0].id + ', email=' + (rows[0].email || ''));
  return rows[0].id;
}

// ── STEP 3: Fetch from Supabase ────────────────────────────
async function fetchSupabaseData(supabaseUserId) {
  const data = {};

  console.log('\n── Fetching from Supabase ──');

  data.categories = await fetchAllPages('categories');
  console.log('  → ' + data.categories.length + ' categories total');

  data.customers = await fetchAllPages('customers');
  console.log('  → ' + data.customers.length + ' customers total');

  data.settings = await fetchAllPages('settings');
  console.log('  → ' + data.settings.length + ' settings total');

  data.products = await fetchAllPages('products', 'user_id', supabaseUserId);
  console.log('  → ' + data.products.length + ' products for user ' + supabaseUserId);

  data.sales = await fetchAllPages('sales', 'user_id', supabaseUserId);
  console.log('  → ' + data.sales.length + ' sales for user ' + supabaseUserId);

  // sale_items: fetch only items linked to fetched sales
  if (data.sales.length > 0) {
    const saleIds = data.sales.map(s => s.id);
    // Fetch in batches via OR filter if needed, or just fetch all and filter
    const allItems = await fetchAllPages('sale_items');
    data.sale_items = allItems.filter(item => saleIds.includes(item.sale_id));
    console.log('  → ' + data.sale_items.length + ' sale_items (filtered from ' + allItems.length + ' total)');
  } else {
    data.sale_items = [];
    console.log('  → 0 sale_items (no sales)');
  }

  return data;
}

// ── STEP 4: Apply to local SQLite ──────────────────────────
async function applyCategories(rows, localUserId) {
  console.log('\n── Applying categories ──');
  let inserted = 0, updated = 0, remapped = 0;

  for (const r of rows) {
    const exists = localExists('categories', r.id);
    if (exists) {
      localExec(
        'UPDATE categories SET name_ar=?, name_en=?, color=?, icon=?, user_id=?, updated_at=? WHERE id=?',
        [r.name_ar || '', r.name_en || '', r.color || '', r.icon || '', localUserId, r.updated_at || '', r.id]
      );
      updated++;
    } else {
      let newId = r.id;
      if (localExists('categories', newId)) {
        newId = getMaxId('categories') + 1;
        remapped++;
      }
      localExec(
        'INSERT INTO categories (id, name_ar, name_en, color, icon, user_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
        [newId, r.name_ar || '', r.name_en || '', r.color || '', r.icon || '', localUserId, r.created_at || '', r.updated_at || '']
      );
      inserted++;
    }
  }

  console.log('  inserted=' + inserted + ' updated=' + updated + ' remapped=' + remapped);
}

async function applyProducts(rows, localUserId) {
  console.log('\n── Applying products ──');
  let inserted = 0, updated = 0, matchedByBarcode = 0, matchedByName = 0, remapped = 0;

  for (const r of rows) {
    let localRow = null;

    // Match by barcode
    if (r.barcode && r.barcode.trim()) {
      const matches = localQuery(
        'SELECT id FROM products WHERE barcode = ? AND user_id = ? LIMIT 1',
        [r.barcode.trim(), localUserId]
      );
      if (matches.length > 0) {
        localRow = matches[0];
        matchedByBarcode++;
      }
    }

    // Match by name_ar + name_en
    if (!localRow && r.name_ar && r.name_ar.trim()) {
      const matches = localQuery(
        'SELECT id FROM products WHERE name_ar = ? AND name_en = ? AND user_id = ? LIMIT 1',
        [r.name_ar.trim(), (r.name_en || '').trim(), localUserId]
      );
      if (matches.length > 0) {
        localRow = matches[0];
        matchedByName++;
      }
    }

    if (localRow) {
      localExec(
        `UPDATE products SET name_ar=?, name_en=?, category_id=?, barcode=?, sku=?,
         purchase_price=?, sale_price=?, quantity=?, min_quantity=?, image_url=?,
         description=?, user_id=?, updated_at=?
         WHERE id=?`,
        [r.name_ar || '', r.name_en || '', r.category_id || null, r.barcode || '', r.sku || '',
         r.purchase_price || 0, r.sale_price || 0, r.quantity || 0, r.min_quantity || 5,
         r.image_url || '', r.description || '', localUserId, r.updated_at || '',
         localRow.id]
      );
      updated++;
    } else {
      let newId = r.id;
      if (localExists('products', newId)) {
        newId = getMaxId('products') + 1;
        remapped++;
      }
      localExec(
        `INSERT INTO products (id, name_ar, name_en, category_id, barcode, sku,
         purchase_price, sale_price, quantity, min_quantity, image_url,
         description, user_id, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [newId, r.name_ar || '', r.name_en || '', r.category_id || null, r.barcode || '', r.sku || '',
         r.purchase_price || 0, r.sale_price || 0, r.quantity || 0, r.min_quantity || 5,
         r.image_url || '', r.description || '', localUserId, r.created_at || '', r.updated_at || '']
      );
      inserted++;
    }
  }

  console.log('  inserted=' + inserted + ' updated=' + updated + ' (barcode=' + matchedByBarcode + ', name=' + matchedByName + ') remapped=' + remapped);
}

async function applyCustomers(rows, localUserId) {
  console.log('\n── Applying customers ──');
  let inserted = 0, updated = 0, remapped = 0;

  for (const r of rows) {
    const exists = localExists('customers', r.id);
    if (exists) {
      localExec(
        'UPDATE customers SET name=?, phone=?, email=?, address=?, total_purchases=?, user_id=?, updated_at=? WHERE id=?',
        [r.name || '', r.phone || '', r.email || '', r.address || '', r.total_purchases || 0, localUserId, r.updated_at || '', r.id]
      );
      updated++;
    } else {
      let newId = r.id;
      if (localExists('customers', newId)) {
        newId = getMaxId('customers') + 1;
        remapped++;
      }
      localExec(
        'INSERT INTO customers (id, name, phone, email, address, total_purchases, user_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
        [newId, r.name || '', r.phone || '', r.email || '', r.address || '', r.total_purchases || 0, localUserId, r.created_at || '', r.updated_at || '']
      );
      inserted++;
    }
  }

  console.log('  inserted=' + inserted + ' updated=' + updated + ' remapped=' + remapped);
}

async function applySales(rows, localUserId) {
  console.log('\n── Applying sales ──');
  let inserted = 0, updated = 0;

  for (const r of rows) {
    const exists = localExists('sales', r.id);
    if (exists) {
      localExec(
        `UPDATE sales SET invoice_number=?, total_amount=?, discount_amount=?, tax_amount=?,
         final_amount=?, payment_method=?, amount_paid=?, change_amount=?, notes=?,
         customer_id=?, user_id=?, updated_at=?
         WHERE id=?`,
        [r.invoice_number || '', r.total_amount || 0, r.discount_amount || 0, r.tax_amount || 0,
         r.final_amount || 0, r.payment_method || 'cash', r.amount_paid || 0, r.change_amount || 0,
         r.notes || '', r.customer_id || null, localUserId, r.updated_at || '', r.id]
      );
      updated++;
    } else {
      let newId = r.id;
      if (localExists('sales', newId)) {
        newId = getMaxId('sales') + 1;
      }
      localExec(
        `INSERT INTO sales (id, invoice_number, total_amount, discount_amount, tax_amount,
         final_amount, payment_method, amount_paid, change_amount, notes,
         customer_id, user_id, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [newId, r.invoice_number || '', r.total_amount || 0, r.discount_amount || 0, r.tax_amount || 0,
         r.final_amount || 0, r.payment_method || 'cash', r.amount_paid || 0, r.change_amount || 0,
         r.notes || '', r.customer_id || null, localUserId, r.created_at || '', r.updated_at || '']
      );
      inserted++;
    }
  }

  console.log('  inserted=' + inserted + ' updated=' + updated);

  // Remap sale_id references in sale_items if any sale IDs changed
  // (handled in applySaleItems)
}

async function applySaleItems(rows) {
  console.log('\n── Applying sale_items ──');
  let inserted = 0, updated = 0;

  if (rows.length === 0) {
    console.log('  (none)');
    return;
  }

  for (const r of rows) {
    const exists = localExists('sale_items', r.id);
    if (exists) {
      localExec(
        'UPDATE sale_items SET sale_id=?, product_id=?, product_name=?, quantity=?, unit_price=?, total_price=?, created_at=? WHERE id=?',
        [r.sale_id || null, r.product_id || null, r.product_name || '', r.quantity || 0, r.unit_price || 0, r.total_price || 0, r.created_at || '', r.id]
      );
      updated++;
    } else {
      localExec(
        'INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, total_price, created_at) VALUES (?,?,?,?,?,?,?,?)',
        [r.id, r.sale_id || null, r.product_id || null, r.product_name || '', r.quantity || 0, r.unit_price || 0, r.total_price || 0, r.created_at || '']
      );
      inserted++;
    }
  }

  console.log('  inserted=' + inserted + ' updated=' + updated);
}

async function applySettings(rows, localUserId) {
  console.log('\n── Applying settings ──');
  let inserted = 0, updated = 0, remapped = 0;

  for (const r of rows) {
    const exists = localExists('settings', r.id);
    if (exists) {
      localExec(
        'UPDATE settings SET key=?, value=?, user_id=?, updated_at=? WHERE id=?',
        [r.key || '', r.value || '', localUserId, r.updated_at || '', r.id]
      );
      updated++;
    } else {
      let newId = r.id;
      if (localExists('settings', newId)) {
        newId = getMaxId('settings') + 1;
        remapped++;
      }
      localExec(
        'INSERT INTO settings (id, key, value, user_id, created_at, updated_at) VALUES (?,?,?,?,?,?)',
        [newId, r.key || '', r.value || '', localUserId, r.created_at || '', r.updated_at || '']
      );
      inserted++;
    }
  }

  console.log('  inserted=' + inserted + ' updated=' + updated + ' remapped=' + remapped);
}

// ── MAIN ───────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Parle Noire POS — Sync from Supabase');
  console.log('  License: ' + LICENSE_CODE);
  console.log('  Dry run: ' + (DRY_RUN ? 'YES (no changes written)' : 'NO'));
  console.log('═══════════════════════════════════════════════════');

  // ── STEP 1a ──
  console.log('\n── STEP 1a: Resolving Supabase profile ──');
  const supabaseProfile = await resolveSupabaseUserId();
  const supabaseUserId = supabaseProfile.id;

  // ── STEP 1b ──
  console.log('\n── STEP 1b: Resolving local user ──');
  const localUserId = await resolveLocalUserId();

  // ── STEP 2: Backup ──
  console.log('\n── STEP 2: Creating backup ──');
  const backupPaths = createBackup();

  // ── STEP 3: Fetch from Supabase ──
  const supabaseData = await fetchSupabaseData(supabaseUserId);

  // ── Summary before apply ──
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Data fetched from Supabase:');
  console.log('    categories : ' + supabaseData.categories.length);
  console.log('    products   : ' + supabaseData.products.length);
  console.log('    customers  : ' + supabaseData.customers.length);
  console.log('    sales      : ' + supabaseData.sales.length);
  console.log('    sale_items : ' + supabaseData.sale_items.length);
  console.log('    settings   : ' + supabaseData.settings.length);
  console.log('═══════════════════════════════════════════════════');

  if (DRY_RUN) {
    console.log('\n  DRY RUN — no changes written. To apply, set SYNC_DRY_RUN=0.');
    console.log('  Done.');
    return;
  }

  // ── STEP 4: Apply ──
  console.log('\n── STEP 4: Applying to local database ──');
  const db = await getLocalDb();

  try {
    db.run('BEGIN');

    await applyCategories(supabaseData.categories, localUserId);
    await applyProducts(supabaseData.products, localUserId);
    await applyCustomers(supabaseData.customers, localUserId);
    await applySales(supabaseData.sales, localUserId);
    await applySaleItems(supabaseData.sale_items);
    await applySettings(supabaseData.settings, localUserId);

    db.run('COMMIT');
    saveLocalDb();
    console.log('\n  ✅ All changes committed and saved.');
  } catch (err) {
    db.run('ROLLBACK');
    console.error('\n  ❌ Error during apply, transaction rolled back:', err.message);
    if (backupPaths) {
      console.error('  Backup available for restore:');
      if (backupPaths.db) console.error('    DB: ' + backupPaths.db);
      if (backupPaths.uploads) console.error('    Uploads: ' + backupPaths.uploads);
    }
    process.exit(1);
  }

  console.log('\n  ✅ Sync complete.');
}

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
