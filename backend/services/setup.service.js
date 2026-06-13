const { getDb, saveDb } = require('../database/db');

async function isFirstRun() {
  const db = await getDb();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM settings');
  stmt.step();
  var row = stmt.getAsObject();
  stmt.free();
  return row.count === 0;
}

async function initializeSetup(config) {
  var db = await getDb();
  var now = new Date().toISOString();

  var entries = [
    { key: 'store_name', value: config.storeName },
    { key: 'store_name_en', value: config.storeNameEn },
    { key: 'currency', value: config.currency },
    { key: 'currency_symbol', value: config.currencySymbol },
    { key: 'tax_rate', value: String(config.taxRate) },
    { key: 'language', value: config.language },
    { key: 'store_address', value: config.address },
    { key: 'store_phone', value: config.phone },
  ];

  db.run("BEGIN");
  try {
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      db.run(
        'INSERT OR REPLACE INTO settings (key, value, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [entry.key, entry.value, 'default', now, now]
      );
    }
    db.run("COMMIT");
    saveDb();
    return { success: true };
  } catch (err) {
    db.run("ROLLBACK");
    throw err;
  }
}

module.exports = { isFirstRun, initializeSetup };
