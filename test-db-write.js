const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'pos_store.db');

async function main() {
  const SQL = await initSqlJs();
  
  // Read and check
  let buf = fs.readFileSync(dbPath);
  let db = new SQL.Database(buf);
  console.log('قبل: منتجات=' + db.exec('SELECT COUNT(*) FROM products')[0].values[0][0] + ' فواتير=' + db.exec('SELECT COUNT(*) FROM sales')[0].values[0][0]);
  
  // Write test data
  db.run("INSERT OR IGNORE INTO products (id, name_ar, sale_price, quantity, user_id, created_at, updated_at) VALUES (9999, 'TEST', 100, 1, 'default', datetime('now'), datetime('now'))");
  db.run("INSERT OR IGNORE INTO sales (id, invoice_number, final_amount, user_id, created_at, updated_at) VALUES (9999, 'TEST-INV', 500, 'default', datetime('now'), datetime('now'))");
  
  // Export
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log('بعد الكتابة: منتجات=' + db.exec('SELECT COUNT(*) FROM products')[0].values[0][0] + ' فواتير=' + db.exec('SELECT COUNT(*) FROM sales')[0].values[0][0]);
  
  // Read fresh
  buf = fs.readFileSync(dbPath);
  db = new SQL.Database(buf);
  console.log('قراءة جديدة: منتجات=' + db.exec('SELECT COUNT(*) FROM products')[0].values[0][0] + ' فواتير=' + db.exec('SELECT COUNT(*) FROM sales')[0].values[0][0]);
  
  // Cleanup
  db.run("DELETE FROM products WHERE id = 9999");
  db.run("DELETE FROM sales WHERE id = 9999");
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log('تم التنظيف');
}
main().catch(console.error);
