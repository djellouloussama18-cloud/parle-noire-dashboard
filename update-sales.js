const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'database', 'pos_store.db');
const JSON_PATH = path.join(__dirname, 'sales_from_supabase.json');

async function main() {
  console.log('قراءة ملف JSON...');
  const jsonRaw = fs.readFileSync(JSON_PATH, 'utf8');
  const newSales = JSON.parse(jsonRaw);
  console.log(`تم قراءة ${newSales.length} فاتورة من JSON`);

  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);

  let updated = 0;
  let inserted = 0;
  let errors = 0;

  db.run('BEGIN');
  for (const s of newSales) {
    try {
      db.run(
        `UPDATE sales SET
          invoice_number = ?,
          total_amount = ?,
          discount_amount = ?,
          tax_amount = ?,
          final_amount = ?,
          payment_method = ?,
          amount_paid = ?,
          change_amount = ?,
          updated_at = datetime('now')
        WHERE id = ?`,
        [
          s.invoice_number || '',
          s.total_amount ?? 0,
          s.discount_amount ?? 0,
          s.tax_amount ?? 0,
          s.final_amount ?? 0,
          s.payment_method || 'cash',
          s.amount_paid ?? 0,
          s.change_amount ?? 0,
          s.id
        ]
      );
      if (db.getRowsModified() > 0) {
        updated++;
      } else {
        db.run(
          `INSERT INTO sales (id, invoice_number, total_amount, discount_amount, tax_amount, final_amount, payment_method, amount_paid, change_amount, user_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'default', datetime('now'), datetime('now'))`,
          [
            s.id,
            s.invoice_number || '',
            s.total_amount ?? 0,
            s.discount_amount ?? 0,
            s.tax_amount ?? 0,
            s.final_amount ?? 0,
            s.payment_method || 'cash',
            s.amount_paid ?? 0,
            s.change_amount ?? 0
          ]
        );
        inserted++;
      }
    } catch (err) {
      errors++;
      console.log(`❌ خطأ في الفاتورة ID ${s.id}: ${err.message}`);
    }
  }
  db.run('COMMIT');

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));

  console.log('\n========================================');
  console.log('  ✅ تم التحديث بنجاح');
  console.log('─────────────────────────────────────');
  console.log(`  إجمالي الفواتير في JSON : ${newSales.length}`);
  console.log(`  تم تحديثها              : ${updated}`);
  console.log(`  تم إضافتها (جديدة)      : ${inserted}`);
  console.log(`  أخطاء                   : ${errors}`);
  console.log('========================================\n');
}

main().catch(err => {
  console.error('❌ فشل التحديث:', err.message);
  process.exit(1);
});
