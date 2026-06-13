const path = require('path');
const initSqlJs = require('sql.js');
const fs = require('fs');
const DB_PATH = path.join(__dirname, '../database/pos_store.db');
initSqlJs().then(SQL => {
  const buf = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buf);
  const r1 = db.exec('SELECT COUNT(*) FROM sale_items');
  console.log('sale_items count:', r1[0].values[0][0]);
  const r2 = db.exec('SELECT product_id, SUM(quantity) as total FROM sale_items GROUP BY product_id ORDER BY total DESC LIMIT 5');
  console.log('top products:', JSON.stringify(r2, null, 2));
});
