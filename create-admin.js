const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database', 'pos_store.db');

async function createAdmin() {
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);

  // Add email and password_hash columns if not exist
  try { db.run(`ALTER TABLE profiles ADD COLUMN email TEXT`); } catch(e) {}
  try { db.run(`ALTER TABLE profiles ADD COLUMN password_hash TEXT`); } catch(e) {}

  const password_hash = bcrypt.hashSync('admin123', 10);
  const id = uuidv4();
  const now = new Date().toISOString();

  // Delete old admin and insert fresh one
  db.run(`DELETE FROM profiles WHERE email = 'admin@pos.local'`);
  db.run(
    `INSERT INTO profiles (id, email, password_hash, username, role, created_at, updated_at)
     VALUES (?, 'admin@pos.local', ?, 'Admin', 'admin', ?, ?)`,
    [id, password_hash, now, now]
  );

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  console.log('✅ Admin user created successfully');
  console.log('   Email: admin@pos.local');
  console.log('   Password: admin123');
}

createAdmin().catch(console.error);
