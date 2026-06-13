const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const newProducts = [
  {id:235,name_ar:'جمانة',barcode:'62294288174',purchase_price:400,sale_price:700,quantity:34},
  {id:236,name_ar:'versace دبي',barcode:'62261050809',purchase_price:3400,sale_price:3800,quantity:1},
  {id:237,name_ar:'bvlgarin rose rose دبي',barcode:'62236375691',purchase_price:3400,sale_price:3800,quantity:1},
  {id:238,name_ar:'victorias secret',barcode:'62244959616',purchase_price:2600,sale_price:3000,quantity:1},
  {id:241,name_ar:'الوردة',barcode:'62229164099',purchase_price:450,sale_price:900,quantity:2},
  {id:242,name_ar:'العقدة',barcode:'62274163655',purchase_price:900,sale_price:1300,quantity:1},
  {id:243,name_ar:'قورمات بلاكيور',barcode:'62234215518',purchase_price:600,sale_price:800,quantity:6},
  {id:244,name_ar:'قورمات',barcode:'62267200544',purchase_price:1200,sale_price:1500,quantity:1},
  {id:245,name_ar:'سنسلة تاع ى40',barcode:'62221094074',purchase_price:200,sale_price:400,quantity:12},
  {id:246,name_ar:'سنسلة',barcode:'62275786284',purchase_price:400,sale_price:600,quantity:2},
  {id:247,name_ar:'خاتم',barcode:'62233895231',purchase_price:230,sale_price:300,quantity:12},
  {id:248,name_ar:'قورمات',barcode:'62271033463',purchase_price:450,sale_price:800,quantity:1},
  {id:249,name_ar:'قورمات',barcode:'62220879653',purchase_price:450,sale_price:800,quantity:1},
  {id:250,name_ar:'قورمات',barcode:'62286991655',purchase_price:400,sale_price:500,quantity:1},
  {id:251,name_ar:'CD',barcode:'62236664822',purchase_price:850,sale_price:1300,quantity:1},
  {id:252,name_ar:'ايف سان لوران',barcode:'62250032001',purchase_price:400,sale_price:600,quantity:1},
  {id:253,name_ar:'قرازلة',barcode:'62266857604',purchase_price:1900,sale_price:2200,quantity:1},
  {id:254,name_ar:'فلورا',barcode:'62211630662',purchase_price:150,sale_price:250,quantity:23},
  {id:255,name_ar:'فلورة',barcode:'62296246780',purchase_price:1500,sale_price:1900,quantity:1},
  {id:256,name_ar:'قراند كافي',barcode:'62231334159',purchase_price:600,sale_price:800,quantity:1},
  {id:257,name_ar:'قرازلة',barcode:'62215158916',purchase_price:1400,sale_price:1700,quantity:1},
  {id:258,name_ar:'روبيرتو',barcode:'62221883672',purchase_price:1200,sale_price:1600,quantity:1},
  {id:259,name_ar:'محزمة',barcode:'62222629741',purchase_price:1500,sale_price:2500,quantity:1},
  {id:260,name_ar:'محزمة',barcode:'62235612395',purchase_price:1400,sale_price:2200,quantity:1},
  {id:261,name_ar:'محزمة',barcode:'62245837776',purchase_price:1750,sale_price:2200,quantity:1},
  {id:262,name_ar:'ليبوكل',barcode:'62239442970',purchase_price:200,sale_price:250,quantity:2}
];

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'database', 'pos_store.db');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  let count = 0;
  db.run('BEGIN');
  for (const p of newProducts) {
    db.run(
      "INSERT OR IGNORE INTO products (id, name_ar, barcode, purchase_price, sale_price, quantity, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'default', datetime('now'), datetime('now'))",
      [p.id, p.name_ar, p.barcode, p.purchase_price, p.sale_price, p.quantity]
    );
    count++;
  }
  db.run('COMMIT');
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  
  const total = db.exec('SELECT COUNT(*) FROM products')[0].values[0][0];
  console.log('تم إضافة ' + count + ' منتج');
  console.log('إجمالي المنتجات الآن: ' + total);
}
main().catch(console.error);
