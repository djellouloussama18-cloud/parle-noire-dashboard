const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const dbPath = path.join(__dirname, 'database', 'pos_store.db');

async function main() {
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  // Check before
  console.log('قبل التعديل — عدد الفواتير:', db.exec("SELECT COUNT(*) FROM sales")[0].values[0][0]);

  // Try INSERT OR REPLACE for all 29 sales
  const jsonRaw = fs.readFileSync(path.join(__dirname, 'sales_from_supabase.json'), 'utf8');
  const sales = JSON.parse(jsonRaw);

  let ok = 0, fail = 0;
  db.run('BEGIN');
  for (const s of sales) {
    try {
      db.run(
        `INSERT OR REPLACE INTO sales (id, invoice_number, total_amount, discount_amount, tax_amount, final_amount, payment_method, amount_paid, change_amount, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'default', datetime('now'), datetime('now'))`,
        [s.id, s.invoice_number, s.total_amount, s.discount_amount, s.tax_amount, s.final_amount, s.payment_method, s.amount_paid, s.change_amount]
      );
      ok++;
    } catch (e) {
      fail++;
      console.log('خطأ في ID ' + s.id + ': ' + e.message);
    }
  }
  db.run('COMMIT');
  
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log('نجاح: ' + ok + ', فشل: ' + fail);
  console.log('بعد التعديل — عدد الفواتير:', db.exec("SELECT COUNT(*) FROM sales")[0].values[0][0]);
  
  // Show them
  const all = db.exec('SELECT id, invoice_number, final_amount FROM sales ORDER BY id');
  console.log('\n--- الفواتير ---');
  all[0].values.forEach(r => console.log('id:', r[0], '|', r[1], '|', r[2]));
}
main().catch(console.error);
