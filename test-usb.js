const path = require('path');
const fs = require('fs');

const ROOT = __dirname;

const dirs = {
  database: path.join(ROOT, 'database'),
  uploads: path.join(ROOT, 'uploads'),
  'uploads/products': path.join(ROOT, 'uploads', 'products'),
  'uploads/logos': path.join(ROOT, 'uploads', 'logos'),
  backups: path.join(ROOT, 'backups'),
  frontend: path.join(ROOT, 'frontend', 'dist'),
};

console.log('========================================');
console.log('  Parle Noire POS - USB Portability Test');
console.log('========================================\n');

console.log(`Project root: ${ROOT}\n`);

let allOk = true;

for (const [label, dirPath] of Object.entries(dirs)) {
  const exists = fs.existsSync(dirPath);
  const status = exists ? '✓ موجود' : '✗ غير موجود';
  console.log(`  ${label.padEnd(20)} ${dirPath}`);
  console.log(`  ${''.padEnd(20)} → ${status}`);

  if (!exists) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`  ${''.padEnd(20)} → [تم الإنشاء]`);
    } catch (err) {
      console.log(`  ${''.padEnd(20)} → [خطأ: ${err.message}]`);
      allOk = false;
    }
  }
}

console.log('');

const dbFile = path.join(ROOT, 'database', 'pos_store.db');
const dbExists = fs.existsSync(dbFile);
console.log(`  قاعدة البيانات       ${dbFile}`);
console.log(`                       → ${dbExists ? '✓ موجودة' : '⚠ غير موجودة (ستُنشأ تلقائياً عند أول تشغيل)'}`);

console.log('');
console.log('========================================');
if (allOk) {
  console.log('  ✅ النتيجة: النظام جاهز للعمل من USB');
  console.log('     جميع المجلدات الأساسية موجودة.');
} else {
  console.log('  ⚠ النتيجة: توجد مشكلة في إنشاء بعض المجلدات');
}
console.log('========================================');
