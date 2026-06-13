const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'database', 'pos_store.db');
const JSON_PATH = path.join(__dirname, 'notes_from_supabase.json');

async function main() {
  const notes = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  console.log('قراءة ' + notes.length + ' ملاحظة');

  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);

  let updated = 0, inserted = 0, errors = 0;
  db.run('BEGIN');
  for (const n of notes) {
    try {
      const readVal = n.read === true || n.read === 1 ? 1 : 0;
      db.run(
        "UPDATE notes SET type = ?, title = ?, content = ?, priority = ?, read = ? WHERE id = ?",
        [n.type || 'general', n.title || '', n.content || '', n.priority || 'normal', readVal, n.id]
      );
      if (db.getRowsModified() > 0) {
        updated++;
      } else {
        db.run(
          "INSERT INTO notes (id, type, title, content, priority, read, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, 'default', datetime('now'))",
          [n.id, n.type || 'general', n.title || '', n.content || '', n.priority || 'normal', readVal]
        );
        inserted++;
      }
    } catch (e) {
      errors++;
      console.log('❌ خطأ في الملاحظة ID ' + n.id + ': ' + e.message);
    }
  }
  db.run('COMMIT');
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  console.log('\n✅ محدث: ' + updated + ' | جديد: ' + inserted + ' | أخطاء: ' + errors);
}

main().catch(console.error);
