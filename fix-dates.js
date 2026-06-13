const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'pos_store.db');

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(dbPath));

  // 1. الفواتير — استخراج التاريخ من invoice_number (INV-YYYYMMDD-XXXX)
  const sales = db.exec('SELECT id, invoice_number FROM sales ORDER BY id');
  if (sales.length > 0 && sales[0].values.length > 0) {
    db.run('BEGIN');
    for (const row of sales[0].values) {
      const id = row[0];
      const inv = row[1];
      const match = inv.match(/INV-(\d{4})(\d{2})(\d{2})-/);
      if (match) {
        const dateStr = match[1] + '-' + match[2] + '-' + match[3];
        db.run("UPDATE sales SET created_at = ?, updated_at = ? WHERE id = ?", [dateStr, dateStr, id]);
      }
    }
    db.run('COMMIT');
    console.log('✅ الفواتير:', db.getRowsModified(), 'تم تصحيح تواريخها');
  }

  // 2. الملاحظات fixing null created_at
  db.run("UPDATE notes SET created_at = '2026-06-10' WHERE created_at IS NULL");

  fs.writeFileSync(dbPath, Buffer.from(db.export()));

  // التحقق
  const db2 = new SQL.Database(fs.readFileSync(dbPath));
  console.log('\n=== الفواتير بعد التصحيح ===');
  const s2 = db2.exec('SELECT id, invoice_number, created_at FROM sales ORDER BY id LIMIT 5');
  s2[0].values.forEach(r => console.log(' ', r[0], r[1], r[2]));

  console.log('\n=== الملاحظات بعد التصحيح ===');
  const n2 = db2.exec('SELECT id, title, created_at FROM notes');
  n2[0].values.forEach(r => console.log(' ', r[0], r[1], r[2]));
}
main().catch(console.error);
