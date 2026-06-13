# Parle Noire POS — AGENTS.md

> Instructions for AI agents working on this project.

## Project Structure

```
pos_system/
├── backend/
│   ├── server.js              # Express server entry (port 3001)
│   ├── package.json           # Dependencies: express, sql.js, bcryptjs, jsonwebtoken, multer, uuid
│   ├── database/
│   │   ├── db.js              # sql.js wrapper — getDb(), saveDb(), auto schema init
│   │   └── pos_store.db       # SQLite database file
│   ├── middleware/
│   │   └── auth.js            # JWT auth middleware (Bearer token)
    ├── routes/
    │   ├── auth.routes.js     # POST /login, /register, GET /me, POST /logout
    │   ├── products.routes.js # CRUD /api/products (with image upload via multer)
    │   ├── categories.routes.js # CRUD /api/categories
    │   ├── sales.routes.js    # CRUD /api/sales (with transaction + stock deduction)
    │   ├── customers.routes.js # CRUD /api/customers
    │   ├── settings.routes.js # GET/POST /api/settings, /batch, /upsert, /upload/logo
    │   ├── notes.routes.js    # CRUD /api/notes, PATCH /:id/read, GET /unread-count
    │   ├── reports.routes.js  # GET /summary, /charts, /analysis
    │   ├── backups.routes.js  # GET/POST/DELETE /api/backups + /restore + /:id/download
    │   ├── license.routes.js  # GET /api/license (serial + fingerprint)
    │   └── setup.routes.js    # GET /status, POST /initialize
    └── services/
        ├── backup.service.js  # Auto/hourly DB backup + restore + integrity
        ├── license.service.js # Serial + machine fingerprint
        ├── migration.service.js # User data migration
        └── setup.service.js   # First-run detection
├── frontend/
│   ├── src/                   # React source
│   │   ├── api/               # API client functions (fetch with auth headers)
│   │   ├── pages/             # Page components
│   │   ├── store/             # Zustand stores
│   │   ├── services/          # IndexedDB offline service, sync, queue
│   │   └── utils/             # Validators, formatters
│   ├── dist/                  # Built frontend (served by Express)
│   └── package.json           # Vite + React + Tailwind + Zustand + Recharts
├── uploads/
│   ├── products/              # Product images
│   └── logos/                 # Store logos
├── AGENTS.md                  # This file
├── install.sh                 # Linux/Chromebook install script
├── start.sh                   # Linux/Chromebook start script
├── update.sh                  # Update script (backup DB, pull, rebuild)
├── create-admin.js            # Creates admin user in DB
├── fix-data.js                # Pulls all data from Supabase into SQLite
└── migrate.js                 # Original Supabase→SQLite migration
```

## Database (sql.js / SQLite)

- **File:** `database/pos_store.db`
- **Module:** `backend/database/db.js` exports `{ getDb, saveDb }`
- **Schema** auto-created on first use via `CREATE TABLE IF NOT EXISTS`
- **Tables:** categories, products, customers, sales, sale_items, settings, notes, profiles
- **No NOT NULL constraints** on any column
- **Save:** call `saveDb()` after every write (`db.run()`) to persist to disk

### sql.js Query Patterns

```js
const db = await getDb();

// SELECT multiple rows
const stmt = db.prepare('SELECT * FROM products ORDER BY id DESC');
const rows = [];
while (stmt.step()) rows.push(stmt.getAsObject());
stmt.free();

// SELECT single row
const stmt = db.prepare('SELECT * FROM products WHERE id = ?');
stmt.bind([id]);
let result = null;
if (stmt.step()) result = stmt.getAsObject();
stmt.free();

// INSERT — result.lastID gives the new row id
const result = db.run('INSERT INTO products (name) VALUES (?)', [name]);
saveDb();

// UPDATE / DELETE
db.run('UPDATE products SET name = ? WHERE id = ?', [name, id]);
saveDb();

// Transactions
db.run("BEGIN");
// ... multiple db.run() calls ...
db.run("COMMIT");
saveDb();
```

## Common Commands

```bash
# Start server
cd backend && node server.js

# Build frontend
cd frontend && npm run build

# Create admin user (after server setup)
cd backend && node ../create-admin.js

# Fix/reload data from Supabase
node fix-data.js
```

## API Endpoints (all return JSON)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/login` | POST | No | Login, returns JWT token |
| `/api/auth/register` | POST | No | Register new user |
| `/api/auth/me` | GET | Yes | Get current user |
| `/api/auth/logout` | POST | Yes | Logout |
| `/api/products` | GET/POST | Yes | List / Create products |
| `/api/products/:id` | GET/PUT/DELETE | Yes | Single product CRUD |
| `/api/categories` | GET/POST | Yes | List / Create categories |
| `/api/categories/:id` | GET/PUT/DELETE | Yes | Single category CRUD |
| `/api/sales` | GET/POST | Yes | List / Create sales |
| `/api/sales/:id` | GET | Yes | Single sale with items |
| `/api/customers` | GET/POST | Yes | List / Create customers |
| `/api/customers/:id` | GET/PUT/DELETE | Yes | Single customer CRUD |
| `/api/settings` | GET | Yes | Get all settings (key→value map) |
| `/api/settings/all` | GET | Yes | Get all settings rows |
| `/api/settings/upsert` | POST | Yes | Upsert a setting |
| `/api/settings/batch` | POST | Yes | Batch upsert settings |
| `/api/settings/upload/logo` | POST | Yes | Upload store logo |
| `/api/notes` | GET/POST | Yes | List / Create notes |
| `/api/notes/:id` | GET/PUT/DELETE | Yes | Single note CRUD |
| `/api/notes/:id/read` | PATCH | Yes | Mark note as read |
| `/api/notes/unread-count` | GET | Yes | Count unread notes |
| `/api/reports/summary` | GET | Yes | Dashboard summary stats |
| `/api/reports/charts` | GET | Yes | Chart data |
| `/api/reports/analysis` | GET | Yes | Deep analysis data |
| `/api/backups` | GET | Yes | List database backups |
| `/api/backups` | POST | Yes | Create a new database backup |
| `/api/backups/:id/download` | GET | Yes | Download a backup file |
| `/api/backups/restore` | POST | Yes | Restore database from backup |
| `/api/backups/:filename` | DELETE | Yes | Delete a backup file |
| `/api/license` | GET | No | Get license info (serial + fingerprint) |
| `/api/setup/status` | GET | No | Check if first run |
| `/api/setup/initialize` | POST | No | Initialize store setup |

## Login Credentials

- **Email:** admin@pos.local
- **Password:** admin123

## Code Conventions

- Backend: CommonJS (`require`/`module.exports`)
- Frontend: ES Modules (`import`/`export`)
- All route handlers use `async/await` with `try/catch`
- All DB writes require `saveDb()` after `db.run()`
- Null-safe property access: `(obj.field || '')`
- Offline API pattern: check `navigator.onLine` → fallback to `offlineDB` + `addToQueue`
- All API client functions save successful responses to offlineDB after online fetch
- New stores using `zustand/middleware/persist` should declare a unique storage key name

## Notable Files

- `frontend/src/services/offline-queue.service.js` — `addToQueue()`, `setupOnlineSync()`, Queue flushing logic
- `frontend/src/services/sync.service.js` — `syncAllData()`, full Supabase→IndexedDB sync with pending-item skip
- `frontend/src/services/db.service.js` — `offlineDB` wrapper (getAll, put, remove, clear, bulkPut)
- `backend/services/backup.service.js` — `createAutoBackup()`, `restoreFromBackup()`, `getBackupList()`
- `backend/services/setup.service.js` — `isFirstRun()`, `initializeSetup()`
