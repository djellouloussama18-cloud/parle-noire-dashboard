const db = require('./db');
const bcrypt = require('bcryptjs');

function runMigrations() {
  console.log('⏳ Running database migrations...');

  // Create tables (initialized in memory by db.js)
  db.prepare('CREATE TABLE IF NOT EXISTS users').run();
  db.prepare('CREATE TABLE IF NOT EXISTS categories').run();
  db.prepare('CREATE TABLE IF NOT EXISTS products').run();
  db.prepare('CREATE TABLE IF NOT EXISTS sales').run();
  db.prepare('CREATE TABLE IF NOT EXISTS sale_items').run();
  db.prepare('CREATE TABLE IF NOT EXISTS settings').run();
  db.prepare('CREATE TABLE IF NOT EXISTS backups').run();
  db.prepare('CREATE TABLE IF NOT EXISTS customers').run();
  db.prepare('CREATE TABLE IF NOT EXISTS notes').run();

  // 1. Seed Default Admin User if not exists (gets id=1)
  const existingAdmin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  if (!existingAdmin) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('admin', salt);
    db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run('admin', 'admin@store.com', passwordHash, 'admin');
    console.log('✅ Default admin user created (Username: admin, Password: admin)');
  }

  // 2. Seed Master Admin User if not exists (gets id=2 or higher)
  const existingMaster = db.prepare('SELECT * FROM users WHERE email = ?').get('djellouloussama18@gmail.com');
  if (!existingMaster) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('Parle_noir13', salt);
    db.prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run('djellouloussama18', 'djellouloussama18@gmail.com', passwordHash, 'admin');
    console.log('✅ Master admin user created (Email: djellouloussama18@gmail.com)');
  }

  // 3. Seed Default Categories if empty
  const categoriesCount = db.prepare('SELECT * FROM categories').all().length;
  if (categoriesCount === 0) {
    db.prepare('INSERT INTO categories (name_ar, name_en, color, icon) VALUES (?, ?, ?, ?)')
      .run('ملابس', 'Clothes', '#00FF7F', 'Shirt');
    db.prepare('INSERT INTO categories (name_ar, name_en, color, icon) VALUES (?, ?, ?, ?)')
      .run('إكسسوارات', 'Accessories', '#00CC66', 'ShoppingBag');
    db.prepare('INSERT INTO categories (name_ar, name_en, color, icon) VALUES (?, ?, ?, ?)')
      .run('عطور', 'Perfumes', '#1DB954', 'Sparkles');
    console.log('✅ Default categories seeded');
  }

  // 4. Seed Default Settings if empty
  const settingsCount = db.prepare('SELECT * FROM settings').all().length;
  if (settingsCount === 0) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('store_name', 'متجر الأناقة');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('store_address', 'الجزائر العاصمة');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('store_phone', '0555123456');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('currency', 'د.ج');
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('tva_rate', '19');
    console.log('✅ Default settings seeded');
  }

  // 5. Migrate existing records to have user_id (default to default admin)
  const adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  const defaultUserId = adminUser ? adminUser.id : 1;

  const anyProduct = db.prepare('SELECT * FROM products LIMIT 1').get();
  if (anyProduct && anyProduct.user_id === undefined) {
    const allProducts = db.prepare('SELECT * FROM products').all();
    allProducts.forEach(p => {
      db.prepare('UPDATE products SET user_id = ? WHERE id = ?').run(defaultUserId, p.id);
    });
    console.log(`✅ Products migrated: user_id = ${defaultUserId} added to existing records`);
  }

  const anySale = db.prepare('SELECT * FROM sales LIMIT 1').get();
  if (anySale && anySale.user_id === undefined) {
    const allSales = db.prepare('SELECT * FROM sales').all();
    allSales.forEach(s => {
      db.prepare('UPDATE sales SET user_id = ? WHERE id = ?').run(defaultUserId, s.id);
    });
    console.log(`✅ Sales migrated: user_id = ${defaultUserId} added to existing records`);
  }

  // 6. Seed Sample Products if empty
  const productsCount = db.prepare('SELECT * FROM products').all().length;
  if (productsCount === 0) {
    const cats = db.prepare('SELECT * FROM categories').all();
    const clothesId = cats.find(c => c.name_ar === 'ملابس')?.id || 1;
    const accId = cats.find(c => c.name_ar === 'إكسسوارات')?.id || 2;
    const perfId = cats.find(c => c.name_ar === 'عطور')?.id || 3;

    db.prepare('INSERT INTO products (name_ar, name_en, category_id, barcode, sku, purchase_price, sale_price, quantity, min_quantity, image_url, description, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run('فستان سهرة أنيق', 'Elegant Evening Dress', clothesId, '1001', 'CLO-001', 8000, 12000, 15, 5, '', 'فستان سهرة نسائي أسود مطرز أنيق', defaultUserId);

    db.prepare('INSERT INTO products (name_ar, name_en, category_id, barcode, sku, purchase_price, sale_price, quantity, min_quantity, image_url, description, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run('حقيبة يد جلدية فاخرة', 'Luxury Leather Handbag', accId, '2001', 'ACC-001', 4500, 7500, 10, 3, '', 'حقيبة يد نسائية مصنوعة من الجلد الطبيعي', defaultUserId);

    db.prepare('INSERT INTO products (name_ar, name_en, category_id, barcode, sku, purchase_price, sale_price, quantity, min_quantity, image_url, description, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run('عطر الأناقة النسائي', 'Elan Premium Perfume', perfId, '3001', 'PER-001', 5500, 9200, 2, 5, '', 'عطر زجاجي فاخر برائحة الورد والياسمين', defaultUserId);

    console.log('✅ Default sample products seeded');
  }

  console.log('🎉 Database migrations finished successfully!');
}

module.exports = runMigrations;
