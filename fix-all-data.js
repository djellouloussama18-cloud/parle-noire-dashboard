const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'pos_store.db');

async function main() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);
  
  console.log('=== قبل التعديل ===');
  console.log('منتجات:', db.exec('SELECT COUNT(*) FROM products')[0].values[0][0]);
  console.log('فواتير:', db.exec('SELECT COUNT(*) FROM sales')[0].values[0][0]);
  console.log('أصناف:', db.exec('SELECT COUNT(*) FROM sale_items')[0].values[0][0]);
  console.log('ملاحظات:', db.exec('SELECT COUNT(*) FROM notes')[0].values[0][0]);

  // ---- 1. فواتير ----
  const sales = JSON.parse(fs.readFileSync(path.join(__dirname, 'sales_from_supabase.json'), 'utf8'));
  db.run('BEGIN');
  for (const s of sales) {
    db.run("INSERT OR REPLACE INTO sales (id, invoice_number, total_amount, discount_amount, tax_amount, final_amount, payment_method, amount_paid, change_amount, user_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,'default',datetime('now'),datetime('now'))",
      [s.id, s.invoice_number, s.total_amount, s.discount_amount, s.tax_amount, s.final_amount, s.payment_method, s.amount_paid, s.change_amount]);
  }
  db.run('COMMIT');
  console.log('فواتير بعد:', db.exec('SELECT COUNT(*) FROM sales')[0].values[0][0]);

  // ---- 2. المنتجات المفقودة ----
  const newProds = [
    [235,'جمانة','62294288174',400,700,34],[236,'versace دبي','62261050809',3400,3800,1],
    [237,'bvlgarin rose rose دبي','62236375691',3400,3800,1],[238,'victorias secret','62244959616',2600,3000,1],
    [241,'الوردة','62229164099',450,900,2],[242,'العقدة','62274163655',900,1300,1],
    [243,'قورمات بلاكيور','62234215518',600,800,6],[244,'قورمات','62267200544',1200,1500,1],
    [245,'سنسلة تاع ى40','62221094074',200,400,12],[246,'سنسلة','62275786284',400,600,2],
    [247,'خاتم','62233895231',230,300,12],[248,'قورمات','62271033463',450,800,1],
    [249,'قورمات','62220879653',450,800,1],[250,'قورمات','62286991655',400,500,1],
    [251,'CD','62236664822',850,1300,1],[252,'ايف سان لوران','62250032001',400,600,1],
    [253,'قرازلة','62266857604',1900,2200,1],[254,'فلورا','62211630662',150,250,23],
    [255,'فلورة','62296246780',1500,1900,1],[256,'قراند كافي','62231334159',600,800,1],
    [257,'قرازلة','62215158916',1400,1700,1],[258,'روبيرتو','62221883672',1200,1600,1],
    [259,'محزمة','62222629741',1500,2500,1],[260,'محزمة','62235612395',1400,2200,1],
    [261,'محزمة','62245837776',1750,2200,1],[262,'ليبوكل','62239442970',200,250,2]
  ];
  db.run('BEGIN');
  for (const p of newProds) {
    db.run("INSERT OR IGNORE INTO products (id, name_ar, barcode, purchase_price, sale_price, quantity, user_id, created_at, updated_at) VALUES (?,?,?,?,?,?,'default',datetime('now'),datetime('now'))", p);
  }
  db.run('COMMIT');
  console.log('منتجات بعد:', db.exec('SELECT COUNT(*) FROM products')[0].values[0][0]);
  
  // ---- 3. حفظ ----
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  
  console.log('\n=== بعد التعديل (قراءة جديدة) ===');
  const db2 = new SQL.Database(fs.readFileSync(dbPath));
  console.log('منتجات:', db2.exec('SELECT COUNT(*) FROM products')[0].values[0][0]);
  console.log('فواتير:', db2.exec('SELECT COUNT(*) FROM sales')[0].values[0][0]);
  console.log('أصناف:', db2.exec('SELECT COUNT(*) FROM sale_items')[0].values[0][0]);
  console.log('ملاحظات:', db2.exec('SELECT COUNT(*) FROM notes')[0].values[0][0]);
}
main().catch(console.error);
