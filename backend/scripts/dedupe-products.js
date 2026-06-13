// One-shot script: remove duplicate products by (user_id, barcode)
// Keeps the row with the highest id (most recent), deletes the rest.
// Run: node backend/scripts/dedupe-products.js

const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, '..', '..', 'database', 'pos_store.db');

  if (!fs.existsSync(dbPath)) {
    console.error('Database not found at', dbPath);
    process.exit(1);
  }

  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  // Find duplicates by (user_id, barcode)
  const dupes = db.exec(`
    SELECT user_id, barcode, COUNT(*) as cnt
    FROM products
    WHERE barcode IS NOT NULL AND barcode != ''
    GROUP BY user_id, barcode
    HAVING cnt > 1
  `);

  if (dupes.length === 0 || dupes[0].values.length === 0) {
    console.log('No duplicate products found.');
    db.close();
    return;
  }

  console.log(`Found ${dupes[0].values.length} duplicate groups.`);

  let totalRemoved = 0;

  for (const [userId, barcode, count] of dupes[0].values) {
    const rows = db.exec(`
      SELECT id, name_ar, name_en, barcode FROM products
      WHERE user_id = '${userId}' AND barcode = '${barcode}'
      ORDER BY id ASC
    `);

    if (rows.length === 0 || rows[0].values.length <= 1) continue;

    // Keep the LAST row (highest id), remove all before it
    const ids = rows[0].values.map(r => r[0]);
    const keepId = ids[ids.length - 1];
    const removeIds = ids.slice(0, -1);

    console.log(`\nGroup: user_id=${userId}, barcode=${barcode} (${ids.length} rows)`);
    console.log(`  Keeping id: ${keepId}`);

    for (const removeId of removeIds) {
      const rowInfo = rows[0].values.find(r => r[0] === removeId);
      console.log(`  Removing id: ${removeId} (${rowInfo ? rowInfo[1] || rowInfo[2] || 'unnamed' : 'unknown'})`);
      db.run(`DELETE FROM products WHERE id = ?`, [removeId]);
      totalRemoved++;
    }
  }

  // Save changes
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  db.close();

  console.log(`\nDone. Removed ${totalRemoved} duplicate product(s).`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
