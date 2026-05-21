const fs = require('fs');
const path = require('path');

class Statement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.trim();
  }

  bindParams(params) {
    return params.flat();
  }

  run(...params) {
    const bound = this.bindParams(params);
    return this.db.executeQuery(this.sql, bound, 'run');
  }

  get(...params) {
    const bound = this.bindParams(params);
    return this.db.executeQuery(this.sql, bound, 'get');
  }

  all(...params) {
    const bound = this.bindParams(params);
    return this.db.executeQuery(this.sql, bound, 'all');
  }
}

class LocalDatabase {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.data = {
      users: [],
      categories: [],
      products: [],
      sales: [],
      sale_items: [],
      settings: [],
      backups: [],
      notes: []
    };
    this.init();
  }

  init() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(this.dbPath)) {
      try {
        const content = fs.readFileSync(this.dbPath, 'utf8');
        if (content.trim()) {
          this.data = JSON.parse(content);
        }
      } catch (err) {
        console.error('Database parsing error, starting fresh:', err);
      }
    } else {
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  prepare(sql) {
    return new Statement(this, sql);
  }

  transaction(fn) {
    const self = this;
    return (...args) => {
      const backup = JSON.stringify(self.data);
      try {
        const result = fn(...args);
        self.save();
        return result;
      } catch (err) {
        self.data = JSON.parse(backup);
        throw err;
      }
    };
  }

  executeQuery(sql, params, mode) {
    const normalizedSql = sql.replace(/\s+/g, ' ').trim().toUpperCase();

    // 1. CREATE TABLE
    if (normalizedSql.startsWith('CREATE TABLE')) {
      const tableNameMatch = sql.match(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)/i) || sql.match(/CREATE\s+TABLE\s+(\w+)/i);
      if (tableNameMatch) {
        const table = tableNameMatch[1].toLowerCase();
        if (!this.data[table]) {
          this.data[table] = [];
        }
      }
      return { changes: 0, lastInsertRowid: 0 };
    }

    // 2. INSERT INTO
    if (normalizedSql.startsWith('INSERT INTO')) {
      const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      if (insertMatch) {
        const table = insertMatch[1].toLowerCase();
        const cols = insertMatch[2].split(',').map(s => s.trim());
        
        if (!this.data[table]) {
          this.data[table] = [];
        }

        const newRow = {};
        const maxId = this.data[table].reduce((max, item) => (item.id > max ? item.id : max), 0);
        newRow.id = maxId + 1;

        cols.forEach((col, idx) => {
          newRow[col] = params[idx] !== undefined ? params[idx] : null;
        });

        if (cols.indexOf('created_at') === -1) newRow.created_at = new Date().toISOString();
        if (cols.indexOf('updated_at') === -1) newRow.updated_at = new Date().toISOString();

        this.data[table].push(newRow);
        this.save();

        return { changes: 1, lastInsertRowid: newRow.id };
      }
    }

    // 3. SELECT
    if (normalizedSql.startsWith('SELECT')) {
      const fromMatch = sql.match(/FROM\s+(\w+)/i);
      if (!fromMatch) return mode === 'all' ? [] : undefined;
      const table = fromMatch[1].toLowerCase();
      let list = [...(this.data[table] || [])];

      // Handle simple WHERE parsing
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER\s+BY|LIMIT|$)/i);
      if (whereMatch) {
        const whereClause = whereMatch[1].trim();
        list = list.filter(row => {
          const cleanedClause = whereClause.replace(/\s+/g, ' ').toLowerCase();
          
          if (cleanedClause === 'id = ?') {
            return row.id == params[0];
          }
          if (cleanedClause === 'username = ?' || cleanedClause === 'email = ?') {
            return row.username === params[0] || row.email === params[0];
          }
          if (cleanedClause === 'username = ? or email = ?') {
            return row.username === params[0] || row.email === params[1];
          }
          if (cleanedClause === 'barcode = ?') {
            return row.barcode === params[0];
          }
          if (cleanedClause === 'sku = ?') {
            return row.sku === params[0];
          }
          if (cleanedClause === 'barcode = ? or sku = ?') {
            return row.barcode === params[0] || row.sku === params[1];
          }
          if (cleanedClause === 'key = ?') {
            return row.key === params[0];
          }
          if (cleanedClause === 'category_id = ?') {
            return row.category_id == params[0];
          }
          if (cleanedClause === 'category_id = ? and user_id = ?') {
            return row.category_id == params[0] && row.user_id == params[1];
          }
          if (cleanedClause === 'sale_id = ?') {
            return row.sale_id == params[0];
          }
          if (cleanedClause === 'type = ?') {
            return row.type === params[0];
          }
          if (cleanedClause === 'product_id = ?') {
            return row.product_id == params[0];
          }
          if (cleanedClause === 'read = ?') {
            return row.read === (params[0] === 1 || params[0] === true);
          }
          if (cleanedClause === 'user_id = ?') {
            return row.user_id == params[0];
          }
          if (cleanedClause === 'created_at >= ? and user_id = ?') {
            return new Date(row.created_at) >= new Date(params[0]) && row.user_id == params[1];
          }
          if (cleanedClause.startsWith('created_at >= ?')) {
            return new Date(row.created_at) >= new Date(params[0]);
          }
          return true;
        });
      }

      // Handle sorting
      const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)\s*(ASC|DESC)?/i);
      if (orderMatch) {
        const col = orderMatch[1];
        const desc = (orderMatch[2] || '').toUpperCase() === 'DESC';
        list.sort((a, b) => {
          if (a[col] < b[col]) return desc ? 1 : -1;
          if (a[col] > b[col]) return desc ? -1 : 1;
          return 0;
        });
      }

      // Handle limits
      const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) {
        const limit = parseInt(limitMatch[1], 10);
        list = list.slice(0, limit);
      }

      if (mode === 'all') {
        return list;
      } else {
        return list[0];
      }
    }

    // 4. UPDATE
    if (normalizedSql.startsWith('UPDATE')) {
      const updateMatch = sql.match(/UPDATE\s+(\w+)/i);
      if (updateMatch) {
        const table = updateMatch[1].toLowerCase();
        const list = this.data[table] || [];

        // Use 's' (dotall) flag so the regex matches across newlines
        const setPartMatch = sql.match(/SET\s+(.+?)\s+WHERE/is);
        const wherePartMatch = sql.match(/WHERE\s+([\s\S]+?)(?:\s*$)/i);

        if (setPartMatch && wherePartMatch) {
          const setFields = setPartMatch[1]
            .split(',')
            .map(s => s.trim().split('=')[0].trim())
            .filter(Boolean);

          const whereClause = wherePartMatch[1].trim();

          let count = 0;
          list.forEach(row => {
            let isMatch = false;
            const cleanedWhere = whereClause.replace(/\s+/g, ' ').toLowerCase();

            if (cleanedWhere === 'id = ?') {
              isMatch = row.id == params[setFields.length];
            } else if (cleanedWhere === 'key = ?') {
              isMatch = row.key === params[setFields.length];
            } else if (cleanedWhere === 'user_id = ?') {
              isMatch = row.user_id == params[setFields.length];
            }

            if (isMatch) {
              setFields.forEach((field, idx) => {
                row[field] = params[idx];
              });
              row.updated_at = new Date().toISOString();
              count++;
            }
          });

          if (count > 0) {
            this.save();
          }
          return { changes: count };
        }
      }
    }

    // 5. DELETE FROM
    if (normalizedSql.startsWith('DELETE FROM')) {
      const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(.+)$/i);
      if (deleteMatch) {
        const table = deleteMatch[1].toLowerCase();
        const whereClause = deleteMatch[2].trim();
        const initialLen = (this.data[table] || []).length;

        if (this.data[table]) {
          this.data[table] = this.data[table].filter(row => {
            const cleanedWhere = whereClause.replace(/\s+/g, ' ').toLowerCase();
            if (cleanedWhere === 'id = ?') {
              // Protect master seed user from deletion
              if (table === 'users' && row.email === 'djellouloussama18@gmail.com') {
                return true;
              }
              return row.id != params[0];
            }
            if (cleanedWhere === 'category_id = ?') {
              return row.category_id != params[0];
            }
            if (cleanedWhere === 'product_id = ?') {
              return row.product_id != params[0];
            }
            if (cleanedWhere === 'type = ?') {
              return row.type !== params[0];
            }
            return true;
          });
        }

        const changes = initialLen - this.data[table].length;
        if (changes > 0) {
          this.save();
        }
        return { changes };
      }
    }

    return { changes: 0, lastInsertRowid: 0 };
  }
}

// Instantiate and export database
const dbPath = process.env.DB_PATH || path.join(__dirname, 'pos_store.db');
const db = new LocalDatabase(dbPath);

module.exports = db;
