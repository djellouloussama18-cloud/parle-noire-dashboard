const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'database', 'pos_store.db');
const JSON_PATH = path.join(__dirname, 'products_from_supabase.json');

async function main() {
  console.log('قراءة ملف JSON...');
  const jsonRaw = fs.readFileSync(JSON_PATH, 'utf8');
  const newProducts = JSON.parse(jsonRaw);
  console.log(`تم قراءة ${newProducts.length} منتج من JSON`);

  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);

  let updated = 0;
  let inserted = 0;
  let errors = 0;

  db.run('BEGIN');
  for (const p of newProducts) {
    try {
      db.run(
        `UPDATE products SET
          name_ar = ?,
          name_en = ?,
          barcode = ?,
          purchase_price = ?,
          sale_price = ?,
          quantity = ?,
          updated_at = datetime('now')
        WHERE id = ?`,
        [
          p.name_ar || '',
          p.name_en || '',
          p.barcode || '',
          p.purchase_price ?? 0,
          p.sale_price ?? 0,
          p.quantity ?? 0,
          p.id
        ]
      );
      if (db.getRowsModified() > 0) {
        updated++;
      } else {
        // غير موجود → إضافة منتج جديد
        db.run(
          `INSERT INTO products (id, name_ar, name_en, barcode, purchase_price, sale_price, quantity, user_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'default', datetime('now'), datetime('now'))`,
          [
            p.id,
            p.name_ar || '',
            p.name_en || '',
            p.barcode || '',
            p.purchase_price ?? 0,
            p.sale_price ?? 0,
            p.quantity ?? 0
          ]
        );
        inserted++;
      }
    } catch (err) {
      errors++;
      console.log(`❌ خطأ في المنتج ID ${p.id}: ${err.message}`);
    }
  }
  db.run('COMMIT');

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));

  console.log('\n========================================');
  console.log('  ✅ تم التحديث بنجاح');
  console.log('─────────────────────────────────────');
  console.log(`  إجمالي المنتجات في JSON : ${newProducts.length}`);
  console.log(`  تم تحديثها             : ${updated}`);
  console.log(`  تم إضافتها (جديدة)     : ${inserted}`);
  console.log(`  أخطاء                  : ${errors}`);
  console.log('========================================\n');
}

main().catch(err => {
  console.error('❌ فشل التحديث:', err.message);
  process.exit(1);
});
