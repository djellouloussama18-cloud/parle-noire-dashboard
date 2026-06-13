require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  console.error('   Create a .env file at project root with:');
  console.error('   SUPABASE_URL=https://...');
  console.error('   SUPABASE_SERVICE_KEY=ey...');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  }
});

const dbPath = path.join(__dirname, 'database', 'pos_store.db');
const uploadsDir = path.join(__dirname, 'uploads');
const productsDir = path.join(uploadsDir, 'products');
const logosDir = path.join(uploadsDir, 'logos');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(productsDir)) fs.mkdirSync(productsDir, { recursive: true });
if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });

let db;

const stats = {
  categories: 0,
  products: 0,
  customers: 0,
  sales: 0,
  sale_items: 0,
  settings: 0,
  notes: 0,
  imagesTotal: 0,
  imagesDownloaded: 0,
  imagesFailed: 0,
  startTime: Date.now()
};

const COLUMNS = {
  categories: 'id, name_ar, name_en, color, icon, created_at, updated_at',
  products: 'id, name_ar, name_en, category_id, barcode, sku, purchase_price, sale_price, quantity, min_quantity, image_url, description, created_at, updated_at',
  customers: 'id, name, phone, email, address, total_purchases, created_at, updated_at',
  sales: 'id, invoice_number, total_amount, discount_amount, tax_amount, final_amount, payment_method, amount_paid, change_amount, notes, customer_id, created_at, updated_at',
  sale_items: 'id, sale_id, product_id, product_name, quantity, unit_price, total_price, created_at',
  settings: 'id, key, value, created_at, updated_at',
  notes: 'id, type, title, content, priority, product_id, reminder_date, read, created_at, updated_at'
};

async function fetchAllFromTable(tableName) {
  console.log(`  Fetching ${tableName}...`);
  const PAGE_SIZE = 1000;
  let allData = [];
  let page = 0;

  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from(tableName)
      .select(COLUMNS[tableName] || '*')
      .range(from, to)
      .order('id', { ascending: true });

    if (error) {
      console.error(`  ❌ Error fetching ${tableName}:`, error.message);
      return allData;
    }

    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    console.log(`    Got ${data.length} rows (total: ${allData.length})`);

    if (data.length < PAGE_SIZE) break;
    page++;
  }

  return allData;
}

function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, { timeout: 10000 }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, destPath).then(resolve);
          return;
        }
      }

      if (response.statusCode !== 200) {
        console.log(`  ⚠️ HTTP ${response.statusCode} for ${url}`);
        response.resume();
        resolve(false);
        return;
      }

      const fileStream = fs.createWriteStream(destPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(true);
      });

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {});
        resolve(false);
      });
    });

    request.on('error', (err) => {
      resolve(false);
    });

    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function downloadImage(url, destDir, prefix = '') {
  if (!url || typeof url !== 'string') return { success: false, newUrl: url };

  try {
    let filename;
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      filename = pathParts[pathParts.length - 1] || `image-${Date.now()}`;
    } catch {
      const pathParts = url.split('/');
      filename = pathParts[pathParts.length - 1] || `image-${Date.now()}`;
    }

    filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFilename = prefix ? `${prefix}-${filename}` : filename;
    const destPath = path.join(destDir, uniqueFilename);

    console.log(`  Downloading: ${filename}`);

    const success = await downloadFile(url, destPath);

    if (success) {
      stats.imagesDownloaded++;
      const relativePath = destDir.includes('logos')
        ? `/uploads/logos/${uniqueFilename}`
        : `/uploads/products/${uniqueFilename}`;
      return { success: true, newUrl: relativePath };
    } else {
      stats.imagesFailed++;
      console.log(`  ⚠️ Failed to download: ${filename}`);
      return { success: false, newUrl: url };
    }
  } catch (err) {
    stats.imagesFailed++;
    console.log(`  ⚠️ Error downloading image: ${err.message}`);
    return { success: false, newUrl: url };
  }
}

function importCategories(data) {
  if (!data || data.length === 0) return 0;

  db.run("BEGIN");
  for (const item of data) {
    try {
      db.run(`
        INSERT OR REPLACE INTO categories (id, name_ar, name_en, color, icon, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
        item.id,
        item.name_ar || item.name_en || 'بدون اسم',
        item.name_en || null,
        item.color || null,
        item.icon || null,
        item.created_at,
        item.updated_at
      );
    } catch (err) {
      console.log(`  ⚠️ Skipping category ${item.id}: ${err.message}`);
    }
  }
  db.run("COMMIT");
  stats.categories = data.length;
  return data.length;
}

function importProducts(data) {
  if (!data || data.length === 0) return 0;

  db.run("BEGIN");
  for (const item of data) {
    try {
      db.run(`
        INSERT OR REPLACE INTO products (
          id, name_ar, name_en, category_id, barcode, sku,
          purchase_price, sale_price, quantity, min_quantity,
          image_url, description, user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        item.id,
        item.name_ar || item.name_en || 'بدون اسم',
        item.name_en || null,
        item.category_id || null,
        item.barcode || null,
        item.sku || null,
        item.purchase_price ?? 0,
        item.sale_price,
        item.quantity ?? 0,
        item.min_quantity ?? 5,
        item.image_url || null,
        item.description || null,
        item.user_id || null,
        item.created_at,
        item.updated_at
      );
    } catch (err) {
      console.log(`  ⚠️ Skipping product ${item.id}: ${err.message}`);
    }
  }
  db.run("COMMIT");
  stats.products = data.length;
  return data.length;
}

function importCustomers(data) {
  if (!data || data.length === 0) return 0;

  db.run("BEGIN");
  for (const item of data) {
    try {
      db.run(`
        INSERT OR REPLACE INTO customers (
          id, name, phone, email, address, total_purchases, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        item.id,
        item.name,
        item.phone || null,
        item.email || null,
        item.address || null,
        item.total_purchases ?? 0,
        item.created_at,
        item.updated_at
      );
    } catch (err) {
      console.log(`  ⚠️ Skipping customer ${item.id}: ${err.message}`);
    }
  }
  db.run("COMMIT");
  stats.customers = data.length;
  return data.length;
}

function importSales(data) {
  if (!data || data.length === 0) return 0;

  db.run("BEGIN");
  for (const item of data) {
    try {
      db.run(`
        INSERT OR REPLACE INTO sales (
          id, invoice_number, total_amount, discount_amount, tax_amount,
          final_amount, payment_method, amount_paid, change_amount,
          notes, customer_id, user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        item.id,
        item.invoice_number,
        item.total_amount ?? 0,
        item.discount_amount ?? 0,
        item.tax_amount ?? 0,
        item.final_amount,
        item.payment_method || 'cash',
        item.amount_paid ?? 0,
        item.change_amount ?? 0,
        item.notes || null,
        item.customer_id || null,
        item.user_id || null,
        item.created_at,
        item.updated_at
      );
    } catch (err) {
      console.log(`  ⚠️ Skipping sale ${item.id}: ${err.message}`);
    }
  }
  db.run("COMMIT");
  stats.sales = data.length;
  return data.length;
}

function importSaleItems(data) {
  if (!data || data.length === 0) return 0;

  db.run("BEGIN");
  for (const item of data) {
    try {
      db.run(`
        INSERT OR REPLACE INTO sale_items (
          id, sale_id, product_id, product_name, quantity,
          unit_price, total_price, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        item.id,
        item.sale_id,
        item.product_id || null,
        item.product_name,
        item.quantity,
        item.unit_price,
        item.total_price,
        item.created_at
      );
    } catch (err) {
      console.log(`  ⚠️ Skipping sale_item ${item.id}: ${err.message}`);
    }
  }
  db.run("COMMIT");
  stats.sale_items = data.length;
  return data.length;
}

function importSettings(data) {
  if (!data || data.length === 0) return 0;

  db.run("BEGIN");
  for (const item of data) {
    try {
      db.run(`
        INSERT INTO settings (key, value, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `,
        item.key,
        item.value,
        item.created_at,
        item.updated_at
      );
    } catch (err) {
      console.log(`  ⚠️ Skipping setting ${item.key}: ${err.message}`);
    }
  }
  db.run("COMMIT");
  stats.settings = data.length;
  return data.length;
}

function importNotes(data) {
  if (!data || data.length === 0) return 0;

  db.run("BEGIN");
  for (const item of data) {
    try {
      const readVal = item.read === true || item.read === 1 ? 1 : 0;
      db.run(`
        INSERT OR REPLACE INTO notes (
          id, type, title, content, priority, product_id,
          reminder_date, read, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        item.id,
        item.type || 'general',
        item.title || null,
        item.content || null,
        item.priority || 'normal',
        item.product_id || null,
        item.reminder_date || null,
        readVal,
        item.created_by || null,
        item.created_at,
        item.updated_at
      );
    } catch (err) {
      console.log(`  ⚠️ Skipping note ${item.id}: ${err.message}`);
    }
  }
  db.run("COMMIT");
  stats.notes = data.length;
  return data.length;
}

async function main() {
  console.log('========================================');
  console.log('  Parle Noire POS - Data Migration');
  console.log('========================================');
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log(`  SQLite: ${dbPath}`);
  console.log('========================================\n');

  console.log('Initializing SQLite database...');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  let fileBuffer;
  if (fs.existsSync(dbPath)) {
    fileBuffer = fs.readFileSync(dbPath);
  }
  const SQL = await initSqlJs();
  db = new SQL.Database(fileBuffer);
  db.run("PRAGMA foreign_keys = ON");

  db.run(`CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  name_ar TEXT,
  name_en TEXT,
  color TEXT,
  icon TEXT,
  created_at TEXT,
  updated_at TEXT
)`);
  db.run(`CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  name_ar TEXT,
  name_en TEXT,
  category_id INTEGER,
  barcode TEXT,
  sku TEXT,
  purchase_price REAL DEFAULT 0,
  sale_price REAL DEFAULT 0,
  quantity INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 5,
  image_url TEXT,
  description TEXT,
  user_id TEXT,
  created_at TEXT,
  updated_at TEXT
)`);
  db.run("CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT, total_purchases REAL DEFAULT 0, created_at TEXT, updated_at TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY, invoice_number TEXT UNIQUE, total_amount REAL DEFAULT 0, discount_amount REAL DEFAULT 0, tax_amount REAL DEFAULT 0, final_amount REAL NOT NULL DEFAULT 0, payment_method TEXT DEFAULT 'cash', amount_paid REAL DEFAULT 0, change_amount REAL DEFAULT 0, notes TEXT, customer_id INTEGER, user_id TEXT, created_at TEXT, updated_at TEXT)");
  db.run(`CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY,
  sale_id INTEGER,
  product_id INTEGER,
  product_name TEXT,
  quantity INTEGER,
  unit_price REAL,
  total_price REAL,
  created_at TEXT
)`);
  db.run(`CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  key TEXT UNIQUE,
  value TEXT,
  created_at TEXT,
  updated_at TEXT
)`);
  db.run("CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, type TEXT, title TEXT, content TEXT, priority TEXT, product_id INTEGER, reminder_date TEXT, read INTEGER DEFAULT 0, created_by TEXT, created_at TEXT, updated_at TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, username TEXT, full_name TEXT, phone TEXT, role TEXT DEFAULT 'user', created_at TEXT, updated_at TEXT)");

  console.log('  Database ready.\n');

  console.log('STEP 1: Exporting data from Supabase...');
  const categories = await fetchAllFromTable('categories');
  console.log('Sample category row:', JSON.stringify(categories[0]));
  const products = await fetchAllFromTable('products');
  console.log('Sample product row:', JSON.stringify(products[0]));
  const customers = await fetchAllFromTable('customers');
  const sales = await fetchAllFromTable('sales');
  const sale_items = await fetchAllFromTable('sale_items');
  const settings = await fetchAllFromTable('settings');
  const notes = await fetchAllFromTable('notes');

  console.log(`\n  Fetched: ${categories.length} categories, ${products.length} products, ${customers.length} customers`);
  console.log(`           ${sales.length} sales, ${sale_items.length} sale_items, ${settings.length} settings, ${notes.length} notes`);

  console.log('\nSTEP 2: Downloading product images...');
  const productsWithImages = products.filter(p => p.image_url && p.image_url.startsWith('http'));
  stats.imagesTotal = productsWithImages.length;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    if (product.image_url && product.image_url.startsWith('http')) {
      const result = await downloadImage(product.image_url, productsDir, `prod-${product.id}`);
      if (result.success) {
        products[i].image_url = result.newUrl;
      }
    }
  }

  const logoSetting = settings.find(s => s.key === 'store_logo');
  if (logoSetting && logoSetting.value && logoSetting.value.startsWith('http')) {
    stats.imagesTotal++;
    console.log('\n  Downloading store logo...');
    const result = await downloadImage(logoSetting.value, logosDir, 'logo');
    if (result.success) {
      logoSetting.value = result.newUrl;
    }
  }

  console.log(`\n  Images: ${stats.imagesDownloaded} downloaded, ${stats.imagesFailed} failed`);

  console.log('\nSTEP 3: Importing into SQLite...');

  console.log('  Importing categories...');
  importCategories(categories);
  console.log(`    ${stats.categories} rows`);

  console.log('  Importing products...');
  importProducts(products);
  console.log(`    ${stats.products} rows`);

  console.log('  Importing customers...');
  importCustomers(customers);
  console.log(`    ${stats.customers} rows`);

  console.log('  Importing sales...');
  importSales(sales);
  console.log(`    ${stats.sales} rows`);

  console.log('  Importing sale_items...');
  importSaleItems(sale_items);
  console.log(`    ${stats.sale_items} rows`);

  console.log('  Importing settings...');
  importSettings(settings);
  console.log(`    ${stats.settings} rows`);

  console.log('  Importing notes...');
  importNotes(notes);
  console.log(`    ${stats.notes} rows`);

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));

  const totalTime = ((Date.now() - stats.startTime) / 1000).toFixed(1);

  console.log('\n========================================');
  console.log('  ✅ Migration Complete');
  console.log('─────────────────────────────────────');
  console.log(`  categories   : ${String(stats.categories).padEnd(4)} rows imported`);
  console.log(`  products     : ${String(stats.products).padEnd(4)} rows imported`);
  console.log(`  customers    : ${String(stats.customers).padEnd(4)} rows imported`);
  console.log(`  sales        : ${String(stats.sales).padEnd(4)} rows imported`);
  console.log(`  sale_items   : ${String(stats.sale_items).padEnd(4)} rows imported`);
  console.log(`  settings     : ${String(stats.settings).padEnd(4)} rows imported`);
  console.log(`  notes        : ${String(stats.notes).padEnd(4)} rows imported`);
  console.log('─────────────────────────────────────');
  console.log(`  Images downloaded : ${stats.imagesDownloaded} / ${stats.imagesTotal}`);
  console.log(`  Images failed     : ${stats.imagesFailed}`);
  console.log('─────────────────────────────────────');
  console.log(`  Total time: ${totalTime}s`);
  console.log('========================================\n');
}

main().catch(err => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
