const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const dbPath = path.join(__dirname, '..', '..', 'database', 'pos_store.db');
const backupDir = path.join(__dirname, '..', '..', 'backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function createAutoBackup() {
  if (!fs.existsSync(dbPath)) {
    console.log('[Backup] قاعدة البيانات غير موجودة بعد، تخطي النسخ الاحتياطي');
    return null;
  }
  const now = new Date();
  const ts = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + '_' + pad(now.getHours()) + '-' + pad(now.getMinutes()) + '-' + pad(now.getSeconds());
  const filename = 'auto-backup-' + ts + '.db';
  const destPath = path.join(backupDir, filename);
  fs.copyFileSync(dbPath, destPath);
  const deleted = cleanupOldBackups();
  if (deleted > 0) {
    console.log('[Backup] تم حذف ' + deleted + ' نسخة قديمة');
  }
  return filename;
}

function cleanupOldBackups() {
  const files = fs.readdirSync(backupDir)
    .filter(function (f) { return f.startsWith('auto-backup-') && f.endsWith('.db'); })
    .map(function (f) {
      return { name: f, time: fs.statSync(path.join(backupDir, f)).mtimeMs };
    })
    .sort(function (a, b) { return b.time - a.time; });

  if (files.length <= 10) return 0;

  var toDelete = files.slice(10);
  toDelete.forEach(function (f) {
    fs.unlinkSync(path.join(backupDir, f.name));
  });
  return toDelete.length;
}

function getBackupList() {
  var files = [];
  if (!fs.existsSync(backupDir)) return files;

  var names = fs.readdirSync(backupDir);
  for (var i = 0; i < names.length; i++) {
    if (!names[i].endsWith('.db')) continue;
    var stat = fs.statSync(path.join(backupDir, names[i]));
    files.push({
      filename: names[i],
      size: stat.size,
      createdAt: stat.mtime
    });
  }
  files.sort(function (a, b) { return b.createdAt - a.createdAt; });
  return files;
}

function restoreFromBackup(filename) {
  var backupPath = path.join(backupDir, filename);
  if (!fs.existsSync(backupPath)) {
    throw new Error('ملف النسخة الاحتياطية غير موجود: ' + filename);
  }

  fs.copyFileSync(backupPath, dbPath);
  var message = 'تمت استعادة قاعدة البيانات من: ' + filename;
  console.log('[Backup] ' + message);

  var dbModule = require('../database/db');
  if (typeof dbModule.closeDb === 'function') {
    dbModule.closeDb();
    dbModule.getDb().then(function () {
      console.log('[Backup] تم إعادة تحميل قاعدة البيانات بنجاح');
    }).catch(function (err) {
      console.error('[Backup] فشل إعادة تحميل قاعدة البيانات:', err.message);
    });
  }
}

async function checkDatabaseIntegrity() {
  if (!fs.existsSync(dbPath)) {
    return true;
  }

  try {
    var SQL = await initSqlJs();
    var buf = fs.readFileSync(dbPath);
    var testDb = new SQL.Database(buf);
    var result = testDb.exec('PRAGMA integrity_check');
    testDb.close();

    if (result && result[0] && result[0].values && result[0].values[0] && result[0].values[0][0] === 'ok') {
      return true;
    }

    console.error('[Backup] ⚠ قاعدة البيانات تالفة! جاري محاولة الاستعادة من آخر نسخة احتياطية...');

    if (!fs.existsSync(backupDir)) {
      console.error('[Backup] ⚠ لا يوجد مجلد نسخ احتياطية');
      return false;
    }

    var backups = fs.readdirSync(backupDir)
      .filter(function (f) { return f.endsWith('.db'); })
      .sort(function (a, b) {
        return fs.statSync(path.join(backupDir, b)).mtime - fs.statSync(path.join(backupDir, a)).mtime;
      });

    if (backups.length === 0) {
      console.error('[Backup] ⚠ لا توجد نسخة احتياطية متاحة للاستعادة');
      return false;
    }

    var latest = backups[0];
    fs.copyFileSync(path.join(backupDir, latest), dbPath);
    console.log('[Backup] ✅ تمت استعادة قاعدة البيانات من آخر نسخة: ' + latest);

    var dbModule = require('../database/db');
    if (typeof dbModule.closeDb === 'function') {
      dbModule.closeDb();
      await dbModule.getDb();
      console.log('[Backup] ✅ تم إعادة تحميل قاعدة البيانات بعد الاستعادة');
    }

    return false;
  } catch (err) {
    console.error('[Backup] ⚠ خطأ في فحص قاعدة البيانات:', err.message);
    return false;
  }
}

module.exports = {
  createAutoBackup: createAutoBackup,
  cleanupOldBackups: cleanupOldBackups,
  getBackupList: getBackupList,
  restoreFromBackup: restoreFromBackup,
  checkDatabaseIntegrity: checkDatabaseIntegrity
};
