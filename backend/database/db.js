const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', '..', 'database', 'pos_store.db');
let db = null;
let SQL = null;

async function getDb() {
  if (db) return db;
  SQL = await initSqlJs();
  let fileBuffer;
  if (fs.existsSync(dbPath)) {
    fileBuffer = fs.readFileSync(dbPath);
  }
  db = new SQL.Database(fileBuffer);
  db.run("PRAGMA foreign_keys = ON");
  initializeSchema();
  migrateForMultiTenant();
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function hasColumn(table, column) {
  const cols = db.exec("PRAGMA table_info(" + table + ")");
  return cols.length > 0 && cols[0].values.some(c => c[1] === column);
}

function initializeSchema() {
  db.run(`CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  name_ar TEXT,
  name_en TEXT,
  color TEXT,
  icon TEXT,
  user_id TEXT,
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
  db.run(`CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  total_purchases REAL DEFAULT 0,
  user_id TEXT,
  created_at TEXT,
  updated_at TEXT
)`);
  db.run(`CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  amount REAL NOT NULL CHECK(amount > 0),
  category TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  date TEXT NOT NULL,
  notes TEXT DEFAULT '',
  is_recurring INTEGER DEFAULT 0,
  recurring_type TEXT DEFAULT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  start_date TEXT,
  end_date TEXT
)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)`);
  db.run(`CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY,
  invoice_number TEXT UNIQUE,
  total_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  final_amount REAL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  amount_paid REAL DEFAULT 0,
  change_amount REAL DEFAULT 0,
  notes TEXT,
  customer_id INTEGER,
  user_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
)`);
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
  key TEXT,
  value TEXT,
  user_id TEXT,
  created_at TEXT,
  updated_at TEXT
)`);
  db.run(`CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY,
  type TEXT,
  title TEXT,
  content TEXT,
  priority TEXT,
  product_id INTEGER,
  reminder_date TEXT,
  read INTEGER DEFAULT 0,
  created_by TEXT,
  user_id TEXT,
  created_at TEXT,
  updated_at TEXT
)`);
  db.run(`CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  password_hash TEXT,
  username TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user',
  created_at TEXT,
  updated_at TEXT
)`);
  db.run(`INSERT OR IGNORE INTO profiles (id, email, password_hash, username, full_name, role, created_at, updated_at)
  VALUES ('default', 'merchant@local', 'no-password-needed', 'merchant', 'Merchant Owner', 'admin', datetime('now'), datetime('now'))`);

  try { db.run("ALTER TABLE sales ADD COLUMN created_at TEXT DEFAULT (datetime('now'))"); } catch (e) {}
  try { db.run("ALTER TABLE notes ADD COLUMN user_id TEXT"); } catch (e) {}
  try { db.run("ALTER TABLE expenses ADD COLUMN start_date TEXT"); } catch (e) {}
  try { db.run("ALTER TABLE expenses ADD COLUMN end_date TEXT"); } catch (e) {}
  try { db.run("UPDATE expenses SET start_date = date WHERE start_date IS NULL"); } catch (e) {}

  saveDb();
}

function migrateForMultiTenant() {
  try {
    if (hasColumn('categories', 'user_id')) return;

    db.run("ALTER TABLE categories ADD COLUMN user_id TEXT");
    db.run("ALTER TABLE customers ADD COLUMN user_id TEXT");
    db.run("ALTER TABLE settings ADD COLUMN user_id TEXT");

    const adminResult = db.exec("SELECT id FROM profiles WHERE email = 'admin@pos.local' LIMIT 1");
    const adminId = adminResult.length > 0 ? adminResult[0].values[0][0] : null;

    if (adminId) {
      db.run("UPDATE categories SET user_id = ?", [adminId]);
      db.run("UPDATE products SET user_id = ? WHERE user_id IS NULL OR user_id = ''", [adminId]);
      db.run("UPDATE sales SET user_id = ? WHERE user_id IS NULL OR user_id = ''", [adminId]);
      db.run("UPDATE customers SET user_id = ? WHERE user_id IS NULL OR user_id = ''", [adminId]);
      db.run("UPDATE settings SET user_id = ?", [adminId]);
    }

    db.run("DROP TABLE IF EXISTS settings_old");
    db.run("ALTER TABLE settings RENAME TO settings_old");
    db.run(`CREATE TABLE settings (
      id INTEGER PRIMARY KEY,
      key TEXT,
      value TEXT,
      user_id TEXT,
      created_at TEXT,
      updated_at TEXT
    )`);
    db.run(`INSERT INTO settings (id, key, value, user_id, created_at, updated_at)
            SELECT id, key, value, user_id, created_at, updated_at FROM settings_old WHERE key IS NOT NULL`);
    db.run("DROP TABLE settings_old");

    saveDb();
  } catch (err) {
    console.error('Multi-tenant migration error:', err);
  }
}

function closeDb() {
  if (db) {
    try { db.close(); } catch (e) {}
    db = null;
  }
}

module.exports = { getDb, saveDb, closeDb, get db() { return db; } };
