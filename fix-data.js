const initSqlJs = require('sql.js');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_PATH = path.join(__dirname, 'database', 'pos_store.db');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixData() {
  console.log('Fetching data from Supabase...');
  
  const { data: categories } = await supabase.from('categories').select('id, name_ar, name_en, color, icon, created_at, updated_at');
  const { data: products } = await supabase.from('products').select('id, name_ar, name_en, category_id, barcode, sku, purchase_price, sale_price, quantity, min_quantity, image_url, description, created_at, updated_at');
  const { data: customers } = await supabase.from('customers').select('id, name, phone, email, address, total_purchases, created_at, updated_at');
  const { data: sales } = await supabase.from('sales').select('id, invoice_number, total_amount, discount_amount, tax_amount, final_amount, payment_method, amount_paid, change_amount, notes, customer_id, created_at, updated_at');
  const { data: sale_items } = await supabase.from('sale_items').select('id, sale_id, product_id, product_name, quantity, unit_price, total_price, created_at');
  const { data: settings } = await supabase.from('settings').select('id, key, value, created_at, updated_at');
  const { data: notes } = await supabase.from('notes').select('id, type, title, content, priority, product_id, reminder_date, read, created_at, updated_at');

  console.log(`Got: ${categories?.length} categories, ${products?.length} products`);

  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);

  // Clear existing data
  db.run('DELETE FROM sale_items');
  db.run('DELETE FROM sales');
  db.run('DELETE FROM notes');
  db.run('DELETE FROM products');
  db.run('DELETE FROM categories');
  db.run('DELETE FROM customers');
  db.run('DELETE FROM settings WHERE key != "admin_created"');

  // Insert categories
  console.log('Inserting categories...');
  for (const r of (categories || [])) {
    try {
      db.run(
        'INSERT OR REPLACE INTO categories (id, name_ar, name_en, color, icon, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
        [r.id, r.name_ar||'', r.name_en||'', r.color||'', r.icon||'', r.created_at||'', r.updated_at||'']
      );
    } catch(e) { console.log('Category error:', e.message); }
  }

  // Insert products
  console.log('Inserting products...');
  for (const r of (products || [])) {
    try {
      db.run(
        'INSERT OR REPLACE INTO products (id, name_ar, name_en, category_id, barcode, sku, purchase_price, sale_price, quantity, min_quantity, image_url, description, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [r.id, r.name_ar||'', r.name_en||'', r.category_id||null, r.barcode||'', r.sku||'', r.purchase_price||0, r.sale_price||0, r.quantity||0, r.min_quantity||5, r.image_url||'', r.description||'', r.created_at||'', r.updated_at||'']
      );
    } catch(e) { console.log('Product error:', e.message); }
  }

  // Insert customers
  console.log('Inserting customers...');
  for (const r of (customers || [])) {
    try {
      db.run(
        'INSERT OR REPLACE INTO customers (id, name, phone, email, address, total_purchases, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
        [r.id, r.name||'', r.phone||'', r.email||'', r.address||'', r.total_purchases||0, r.created_at||'', r.updated_at||'']
      );
    } catch(e) { console.log('Customer error:', e.message); }
  }

  // Insert sales
  console.log('Inserting sales...');
  for (const r of (sales || [])) {
    try {
      db.run(
        'INSERT OR REPLACE INTO sales (id, invoice_number, total_amount, discount_amount, tax_amount, final_amount, payment_method, amount_paid, change_amount, notes, customer_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [r.id, r.invoice_number||'', r.total_amount||0, r.discount_amount||0, r.tax_amount||0, r.final_amount||0, r.payment_method||'cash', r.amount_paid||0, r.change_amount||0, r.notes||'', r.customer_id||null, r.created_at||'', r.updated_at||'']
      );
    } catch(e) { console.log('Sale error:', e.message); }
  }

  // Insert sale_items
  for (const r of (sale_items || [])) {
    try {
      db.run(
        'INSERT OR REPLACE INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, total_price, created_at) VALUES (?,?,?,?,?,?,?,?)',
        [r.id, r.sale_id||null, r.product_id||null, r.product_name||'', r.quantity||0, r.unit_price||0, r.total_price||0, r.created_at||'']
      );
    } catch(e) { console.log('SaleItem error:', e.message); }
  }

  // Insert settings
  for (const r of (settings || [])) {
    try {
      db.run(
        'INSERT OR REPLACE INTO settings (id, key, value, created_at, updated_at) VALUES (?,?,?,?,?)',
        [r.id, r.key||'', r.value||'', r.created_at||'', r.updated_at||'']
      );
    } catch(e) { console.log('Setting error:', e.message); }
  }

  // Insert notes
  for (const r of (notes || [])) {
    try {
      db.run(
        'INSERT OR REPLACE INTO notes (id, type, title, content, priority, product_id, reminder_date, read, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [r.id, r.type||'', r.title||'', r.content||'', r.priority||'', r.product_id||null, r.reminder_date||'', r.read?1:0, r.created_at||'', r.updated_at||'']
      );
    } catch(e) { console.log('Note error:', e.message); }
  }

  // Save to file
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  
  console.log('');
  console.log('✅ Data fixed successfully!');
  console.log(`   categories : ${categories?.length || 0}`);
  console.log(`   products   : ${products?.length || 0}`);
  console.log(`   customers  : ${customers?.length || 0}`);
  console.log(`   sales      : ${sales?.length || 0}`);
  console.log(`   settings   : ${settings?.length || 0}`);
}

fixData().catch(console.error);
