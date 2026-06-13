const path = require('path');
const initSqlJs = require('sql.js');
const fs = require('fs');
const DB_PATH = path.join(__dirname, '../database/pos_store.db');
initSqlJs().then(SQL => {
  const buf = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buf);
  const count = db.exec('SELECT COUNT(*) FROM products');
  console.log('Products count:', count[0].values[0][0]);
  const rows = db.exec('SELECT id, name_ar, name_en, sale_price, quantity FROM products LIMIT 3');
  console.log(JSON.stringify(rows, null, 2));
});
