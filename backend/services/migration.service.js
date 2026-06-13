const { getDb, saveDb } = require('../database/db');

async function migrateUserData() {
  const db = await getDb();
  const tables = ['sales', 'products', 'categories', 'customers', 'settings', 'notes'];
  const results = {};

  for (const table of tables) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN user_id TEXT`);
    } catch (e) {
      // column may already exist
    }
  }

  for (const table of tables) {
    try {
      db.exec(`
        UPDATE ${table}
        SET user_id = 'default'
        WHERE user_id IS NULL OR user_id != 'default' OR user_id = ''
      `);
      const updated = db.getRowsModified();
      const countResult = db.exec(`SELECT COUNT(*) as count FROM ${table} WHERE user_id = 'default'`);
      const count = countResult.length > 0 ? countResult[0].values[0][0] : 0;
      results[table] = { updated, count };
    } catch (err) {
      console.error(`[Migration] خطأ في تحديث ${table}: ${err.message}`);
      results[table] = { updated: 0, count: 0 };
    }
  }

  db.exec(`
    UPDATE sales
    SET created_at = datetime('now')
    WHERE created_at IS NULL
  `);
  const fixedCreatedAt = db.getRowsModified();
  if (fixedCreatedAt > 0) {
    console.log(`[Migration] تم تصحيح created_at لـ ${fixedCreatedAt} فاتورة`);
  }

  saveDb();
  return results;
}

module.exports = { migrateUserData };
