const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const dbPath = path.join(__dirname, 'database', 'pos_store.db');

async function main() {
  const SQL = await initSqlJs();
  if (!fs.existsSync(dbPath)) {
    console.log('DB does not exist yet');
    return;
  }
  const fileBuffer = fs.readFileSync(dbPath);
  console.log('DB exists, size:', fileBuffer.length, 'bytes');
  const db = new SQL.Database(fileBuffer);

  console.log('\n=== Tables ===');
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  if (tables.length > 0) tables[0].values.forEach(t => console.log('-', t[0]));

  console.log('\n=== Row Counts ===');
  const tableNames = ['profiles', 'categories', 'products', 'customers', 'sales', 'sale_items', 'settings', 'notes'];
  for (const t of tableNames) {
    try {
      const r = db.exec('SELECT COUNT(*) FROM ' + t);
      console.log(t + ': ' + r[0].values[0][0]);
    } catch(e) { console.log(t + ': error - ' + e.message); }
  }

  console.log('\n=== Profiles ===');
  try {
    const profiles = db.exec('SELECT id, email, username, role FROM profiles');
    if (profiles.length > 0) profiles[0].values.forEach(p => console.log('- id:', p[0], 'email:', p[1], 'username:', p[2], 'role:', p[3]));
  } catch(e) { console.log('error:', e.message); }

  console.log('\n=== Settings ===');
  try {
    const settings = db.exec('SELECT * FROM settings');
    if (settings.length > 0) settings[0].values.forEach(s => console.log('-', s[1], '=', s[2]));
  } catch(e) { console.log('error:', e.message); }

  for (const tbl of ['categories', 'products', 'customers', 'sales', 'notes', 'settings']) {
    console.log('\n=== ' + tbl + ' columns ===');
    try {
      const cols = db.exec("PRAGMA table_info(" + tbl + ")");
      if (cols.length > 0) cols[0].values.forEach(c => console.log('  ', c[1], c[2]));
    } catch(e) { console.log('error:', e.message); }
  }

  // Check if admin has products/sales
  const adminProfile = db.exec("SELECT id FROM profiles WHERE email = 'admin@pos.local'");
  if (adminProfile.length > 0) {
    const adminId = adminProfile[0].values[0][0];
    console.log('\nAdmin ID:', adminId);
    const adminProducts = db.exec("SELECT COUNT(*) FROM products WHERE user_id = '" + adminId + "'");
    console.log('Admin products:', adminProducts[0].values[0][0]);
    const adminSales = db.exec("SELECT COUNT(*) FROM sales WHERE user_id = '" + adminId + "'");
    console.log('Admin sales:', adminSales[0].values[0][0]);
    // Products without user_id
    const nullProducts = db.exec("SELECT COUNT(*) FROM products WHERE user_id IS NULL OR user_id = ''");
    console.log('Products without user_id:', nullProducts[0].values[0][0]);
    const nullSales = db.exec("SELECT COUNT(*) FROM sales WHERE user_id IS NULL OR user_id = ''");
    console.log('Sales without user_id:', nullSales[0].values[0][0]);
  }
}
main().catch(console.error);
