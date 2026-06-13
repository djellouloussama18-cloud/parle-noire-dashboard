const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'database', 'pos_store.db');
const JSON_PATH = path.join(__dirname, 'sale_items_from_supabase.json');

async function main() {
  console.log('قراءة ملف JSON...');
  const jsonRaw = fs.readFileSync(JSON_PATH, 'utf8');
  const items = JSON.parse(jsonRaw);
  console.log(`تم قراءة ${items.length} صنف من JSON`);

  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);

  let updated = 0;
  let inserted = 0;
  let errors = 0;

  db.run('BEGIN');
  for (const s of items) {
    try {
      db.run(
        `UPDATE sale_items SET
          sale_id = ?,
          product_id = ?,
          product_name = ?,
          quantity = ?,
          unit_price = ?,
          total_price = ?
        WHERE id = ?`,
        [
          s.sale_id,
          s.product_id || null,
          s.product_name || '',
          s.quantity ?? 1,
          s.unit_price ?? 0,
          s.total_price ?? 0,
          s.id
        ]
      );
      if (db.getRowsModified() > 0) {
        updated++;
      } else {
        db.run(
          `INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, total_price, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            s.id,
            s.sale_id,
            s.product_id || null,
            s.product_name || '',
            s.quantity ?? 1,
            s.unit_price ?? 0,
            s.total_price ?? 0
          ]
        );
        inserted++;
      }
    } catch (err) {
      errors++;
      console.log(`❌ خطأ في ID ${s.id}: ${err.message}`);
    }
  }
  db.run('COMMIT');

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));

  console.log('\n========================================');
  console.log('  ✅ تم التحديث بنجاح');
  console.log('─────────────────────────────────────');
  console.log(`  إجمالي الأصناف في JSON : ${items.length}`);
  console.log(`  تم تحديثها             : ${updated}`);
  console.log(`  تم إضافتها (جديدة)     : ${inserted}`);
  console.log(`  أخطاء                  : ${errors}`);
  console.log('========================================\n');
}

main().catch(err => {
  console.error('❌ فشل التحديث:', err.message);
  process.exit(1);
});
