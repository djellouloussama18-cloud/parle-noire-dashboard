# PARLE NOIRE POS — Architecture Blueprint

> **Generated:** 2026-06-10  
> **Purpose:** Onboard AI agents to the full codebase structure, data flow, and business logic.

---

## 1. Project Overview & Tech Stack

**Product:** Parle Noire POS & Cashier Dashboard — a bilingual (Arabic/English) Point-of-Sale system for a fashion e-commerce brand. Includes sales processing, inventory management, customer tracking, receipt printing, barcode scanning, backup/restore, first-run setup wizard, license validation, and a local DB-driven AI analytics assistant.

| Layer | Technology |
|---|---|
| **Build tool** | Vite 5 |
| **Frontend framework** | React 18 |
| **State management** | Zustand 4 (with `persist` middleware for localStorage hydration) |
| **Routing** | React Router DOM 6 |
| **Styling** | Tailwind CSS 3 (dark theme, CSS custom properties for dynamic accent colors) |
| **Backend server** | Node.js + Express (port 3001) |
| **Database** | SQLite via `sql.js` (WebAssembly) — `database/pos_store.db` |
| **Authentication** | JWT (jsonwebtoken) + bcryptjs |
| **Charts** | Recharts 2 |
| **Icons** | Lucide React |
| **Barcode** | JsBarcode, react-barcode |
| **PDF / Print** | jsPDF, html2canvas |
| **File uploads** | Multer |
| **Offline** | IndexedDB (offline cache + offline queue) |
| **Deployment** | Netlify (SPA with `_redirects` for client-side routing) |
| **Legacy backend** | Supabase (Postgres + Auth + Storage + RLS) — still referenced but migration to local SQLite is in progress |

### Key architectural decisions

- **Node.js + Express as primary backend** — all API operations flow through the Express server (port 3001); Supabase client is only used for the sync service (`sync.service.js`) to pull data into the local SQLite DB.
- **SQLite via sql.js** — the database runs in memory and is persisted to disk (`database/pos_store.db`) after every write via `saveDb()`.
- **JWT authentication** — login/register handled by Express; tokens stored in localStorage, verified by JWT middleware.
- **Offline-first:** IndexedDB stores (`ParleNoireDB` for data cache, `ParleNoireQueue` for offline action queue) enable basic operation without connectivity; `offline-queue.service.js` auto-flushes on `online` event.
- **First-run Setup Wizard** — on initial startup, the app checks `GET /api/setup/status` and redirects to `/setup` for a 4-step wizard (store name, currency/tax, language/theme, complete).
- **License system** — machine fingerprint + serial validation via `license.service.js`; `useLicenseStore` persists license info.
- **Zustand `persist` middleware** stores snapshots of critical state (`settings`, `accentColor`, `language`, etc.) in `localStorage` for instant hydration on reload.
- **Local AI assistant instead of external LLM:** The chatbot (`ai.api.js`) is a pure analytics router that queries the local SQLite database directly (today's sales, low stock, category breakdown, etc.) — no Edge Function, no API key, no external AI dependency.
- **Auto-backup service** — hourly automatic backups of the SQLite database file; manual backup create/restore/list/download via API.
- **Realtime subscriptions** — Supabase Realtime channels for settings and products (legacy, being phased out).
- **Tournament management** — basic tournament engine (feed, create, detail, bracket generator) included.

---

## 2. Project Directory Structure

```
pos_system/
├── backend/                         # *** Express Server (port 3001) ***
│   ├── server.js                    # Main entry point
│   ├── package.json                 # Dependencies: express, sql.js, bcryptjs, jsonwebtoken, multer
│   │
│   ├── database/
│   │   ├── db.js                    # sql.js wrapper — getDb(), saveDb(), auto schema init
│   │   └── pos_store.db             # SQLite database file
│   │
│   ├── middleware/
│   │   └── auth.js                  # JWT auth middleware (Bearer token)
│   │
│   ├── routes/                      # Express API routes
│   │   ├── auth.routes.js           # POST /login, /register, GET /me, POST /logout
│   │   ├── products.routes.js       # CRUD /api/products (with image upload via multer)
│   │   ├── categories.routes.js     # CRUD /api/categories
│   │   ├── sales.routes.js          # CRUD /api/sales (with transaction + stock deduction)
│   │   ├── customers.routes.js      # CRUD /api/customers
│   │   ├── settings.routes.js       # GET/POST /api/settings, /batch, /upsert, /upload/logo
│   │   ├── notes.routes.js          # CRUD /api/notes, PATCH /:id/read, GET /unread-count
│   │   ├── reports.routes.js        # GET /summary, /charts, /analysis
│   │   ├── backups.routes.js        # List/create/restore/download/delete backups
│   │   ├── license.routes.js        # License info (serial + machine fingerprint)
│   │   └── setup.routes.js          # GET /status, POST /initialize (first-run setup)
│   │
│   └── services/
│       ├── backup.service.js        # DB backup/restore/integrity
│       ├── license.service.js       # Serial/machine fingerprint
│       ├── migration.service.js     # User data migration
│       └── setup.service.js         # First-run detection
│
├── frontend/                        # *** React / Vite App ***
│   ├── .env                         # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   │
│   ├── public/
│   │   ├── _redirects               # Netlify SPA fallback
│   │   └── icons/                   # PWA icons
│   │
│   ├── dist/                        # Vite production build (served by Express)
│   │
│   ├── src/
│   │   ├── main.jsx                 # Entry point: React root + offline sync init
│   │   ├── App.jsx                  # Router, Setup Wizard gate, theme/lang application
│   │   ├── index.css                # Tailwind directives + CSS custom properties for theming
│   │   │
│   │   ├── api/                     # API client functions (fetch with auth headers)
│   │   │   ├── auth.api.js          #   login, logout, getMe, changePassword
│   │   │   ├── products.api.js      #   CRUD products + categories (fetch vs Express)
│   │   │   ├── sales.api.js         #   CRUD sales + paginated listing
│   │   │   ├── customers.api.js     #   CRUD customers
│   │   │   ├── reports.api.js       #   summary, charts, analysis
│   │   │   ├── settings.api.js      #   uploadLogo, updateSetting (upsert)
│   │   │   ├── notes.api.js         #   CRUD notes + unread count
│   │   │   ├── backups.api.js       #   Backup list/create/restore
│   │   │   ├── license.api.js       #   License info fetch
│   │   │   ├── setup.api.js         #   Setup status + initialize
│   │   │   └── ai.api.js            #   LOCAL analytics router (no LLM)
│   │   │
│   │   ├── lib/
│   │   │   └── supabase.js          # createClient (legacy — used only by sync.service)
│   │   │
│   │   ├── store/                   # Zustand stores
│   │   │   ├── useAuthStore.js      #   user, token, login, logout, changePassword
│   │   │   ├── useCartStore.js      #   items[], discount, tax, checkout logic
│   │   │   ├── useInventoryStore.js #   products[], categories[], CRUD actions
│   │   │   ├── useNotesStore.js     #   notes[], unreadCount, CRUD
│   │   │   ├── useLicenseStore.js   #   serial, fingerprint, activatedAt (persisted)
│   │   │   └── useSettingsStore.js  #   Flat fields + legacy settings object, persist
│   │   │
│   │   ├── components/
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── ai/
│   │   │   │   └── AiAssistant.jsx      # Chat panel with shortcuts, analysis tab
│   │   │   ├── charts/
│   │   │   │   ├── AreaChart.jsx
│   │   │   │   ├── BarChart.jsx
│   │   │   │   └── DonutChart.jsx
│   │   │   ├── layout/
│   │   │   │   ├── MainLayout.jsx       # Sidebar + TopBar + <Outlet/>
│   │   │   │   ├── Sidebar.jsx          # Nav menu with badges/alerts + logo header
│   │   │   │   └── TopBar.jsx           # Search bar + quick actions + connection status
│   │   │   └── ui/
│   │   │       ├── Button.jsx
│   │   │       ├── Input.jsx
│   │   │       ├── Modal.jsx
│   │   │       ├── ConfirmModal.jsx
│   │   │       ├── DataTable.jsx
│   │   │       ├── KpiCard.jsx
│   │   │       ├── Badge.jsx
│   │   │       ├── Toast.jsx
│   │   │       └── ConnectionStatus.jsx # Online/offline/syncing indicator
│   │   │
│   │   ├── pages/                   # Route-level page components
│   │   │   ├── SetupWizard.jsx      # First-run 4-step setup (store, currency, lang, theme)
│   │   │   ├── Register.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── Dashboard.jsx        #   KPI cards, charts, AI assistant
│   │   │   ├── Sales.jsx            #   POS cart + checkout flow
│   │   │   ├── SalesLog.jsx         #   Sales history log
│   │   │   ├── Inventory.jsx        #   Product table + CRUD modals
│   │   │   ├── Customers.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── Barcode.jsx
│   │   │   ├── Print.jsx
│   │   │   ├── Notes.jsx
│   │   │   └── Settings.jsx         #   Store info, logo upload, receipt config, security, themes, backup, about
│   │   │
│   │   ├── services/
│   │   │   ├── db.service.js            # IndexedDB wrapper (offline cache)
│   │   │   ├── offline-queue.service.js # Action queue, flush on reconnect
│   │   │   └── sync.service.js          # Supabase → IndexedDB full data sync
│   │   │
│   │   ├── hooks/
│   │   │   ├── useBarcode.js
│   │   │   ├── useNotification.js
│   │   │   └── usePrint.js
│   │   │
│   │   └── utils/
│   │       ├── formatCurrency.js
│   │       ├── formatDate.js
│   │       └── validators.js
│   │
├── supabase/                        # (Legacy — no longer used)
│   └── functions/ai-assistant/
│       └── index.ts                 # Dead code — replaced by local analytics router
│
├── uploads/
│   ├── products/                    # Product images (via multer)
│   └── logos/                       # Store logos (via multer)
│
├── backups/                         # Auto-generated & manual SQLite backups
│
├── AGENTS.md                        # AI agent instructions
├── install.sh                       # Linux/Chromebook install script
├── start.bat / start.sh             # Start scripts
├── update.sh                        # Update script (backup DB, pull, rebuild)
├── create-admin.js                  # Create admin user in DB
├── fix-data.js                      # Pull all data from Supabase into SQLite
├── migrate.js                       # Original Supabase→SQLite migration
├── license.dat                      # License file
├── netlify.toml                     # Netlify deployment config
└── supabase_schema.sql              # Full PostgreSQL schema (legacy reference)
```

---

## 3. Database Schema (SQLite)

There are **8 tables** auto-created on first use via `CREATE TABLE IF NOT EXISTS`. All tables support multi-tenancy via `user_id`.

| # | Table | Key Columns | Relationships |
|---|---|---|---|
| 1 | `profiles` | `id (TEXT PK)`, `email (UNIQUE)`, `password_hash`, `username`, `full_name`, `phone`, `role`, `created_at`, `updated_at` | — |
| 2 | `categories` | `id (INTEGER PK)`, `name_ar`, `name_en`, `color`, `icon`, `user_id` | Referenced by `products.category_id` |
| 3 | `products` | `id (INTEGER PK)`, `name_ar`, `name_en`, `category_id`, `barcode`, `sku`, `purchase_price`, `sale_price`, `quantity`, `min_quantity`, `image_url`, `description`, `user_id` | → `categories.id` |
| 4 | `customers` | `id (INTEGER PK)`, `name`, `phone`, `email`, `address`, `total_purchases`, `user_id` | Referenced by `sales.customer_id` |
| 5 | `sales` | `id (INTEGER PK)`, `invoice_number (UNIQUE)`, `total_amount`, `discount_amount`, `tax_amount`, `final_amount`, `payment_method`, `amount_paid`, `change_amount`, `notes`, `customer_id`, `user_id` | → `customers.id` |
| 6 | `sale_items` | `id (INTEGER PK)`, `sale_id`, `product_id`, `product_name`, `quantity`, `unit_price`, `total_price` | → `sales.id`, `products.id` |
| 7 | `settings` | `id (INTEGER PK)`, `key (TEXT)`, `value (TEXT)`, `user_id` | Key-value store |
| 8 | `notes` | `id (INTEGER PK)`, `type`, `title`, `content`, `priority`, `product_id`, `reminder_date`, `read`, `created_by` | → `products.id` |

---

## 4. API Layer Architecture

Each file in `src/api/` exports plain async functions. They do NOT use classes or instances. Every function:
1. Calls `fetch()` against the Express backend (or falls back to IndexedDB/offline queue when offline)
2. Throws `new Error(message)` on failure
3. Returns the JSON response data on success

### Key design patterns

**Offline-first API pattern** (`products.api.js`):
```js
if (!navigator.onLine) {
  const data = { ...productData, id };
  await addToQueue({ type: 'updateProduct', payload: data });
  await offlineDB.put('products', data);
  return data;
}
// Online: fetch against Express API
const response = await fetch(`/api/products/${id}`, { method: 'PUT', ... });
```

**Settings upsert pattern** (`settings.api.js`):
```js
// Always upsert, never update — so new keys are auto-created
fetch('/api/settings/upsert', {
  method: 'POST',
  body: JSON.stringify({ key, value: String(value) })
});
```

**Local AI analytics router** (`ai.api.js`):
- No external API calls, no Edge Function invocation
- Intent detection via regex against Arabic/English keywords
- Switches between: `getTodaySales`, `getLowStock`, `getBestPromoTime`, `getTotalStockStatus`, `getCategoryInventory`, `searchProducts`, `getFullAnalysis`
- Each function queries IndexedDB (offline) or calls Express reports API

---

## 5. State Management Flow (Zustand)

### Stores overview

| Store | Key State | Persisted? | Notes |
|---|---|---|---|
| `useAuthStore` | `user`, `token` | Manual (`localStorage`) | No Zustand persist; manual get/set |
| `useCartStore` | `items[]`, `discountAmount`, `paymentMethod` | ❌ | Ephemeral — cleared on checkout |
| `useInventoryStore` | `products[]`, `categories[]` | ❌ | Fetched fresh from Express API on mount |
| `useNotesStore` | `notes[]`, `unreadCount` | ❌ | Re-fetched on interval |
| `useLicenseStore` | `serial`, `fingerprint`, `activatedAt` | ✅ (`parle-nior-license`) | Fetched from `/api/license` |
| `useSettingsStore` | `storeName`, `logoUrl`, `settings{}`, `accentColor`, `language`, `themeMode`, `fontSize` | ✅ (`parle-nior-settings`) | Most complex store — see below |

### `useSettingsStore` internals

**Dual representation:**
- **Flat fields** (`storeName`, `storePhone`, `logoUrl`, `currency`, `tvaRate`) — used by modern components
- **Legacy `settings` object** (`{ store_name, store_phone, store_logo, receipt_header, ... }`) — used by Sidebar, Sales, and other older components

**Bridge:** `_syncSettings()` copies flat fields → `settings` object. `_buildSettings()` constructs a complete `settings` object from flat state.

**Load flow:**
1. App mounts → `loadSettings(true)` is called
2. Fetches ALL key-value pairs from `GET /api/settings`
3. Maps to flat fields (e.g. `store_name` → `storeName`, `tva_rate` → `tvaRate`)
4. Calls `_buildSettings()` to construct the full `settings` object
5. Sets everything in a single `set()` call

**Save flow:**
1. `updateSettings(newSettings)` iterates entries, calls `POST /api/settings/batch` or `upsert`
2. Merges `_buildSettings()` (fresh baseline) with `newSettings`
3. Sets `settings` directly — no dependency on potentially stale previous state

### Logo cache-busting (3-layer defense)

| Layer | Mechanism | Files |
|---|---|---|
| **DB storage** | Clean URL (no `?t=`) stored via `upsert` | `settings.api.js` |
| **Render-time** | `src={`${url}?t=${Date.now()}`}` on every `<img>` | `Settings.jsx`, `Sidebar.jsx` |
| **DOM event override** | `CustomEvent('store-logo-updated')` → local `useState` bypasses Zustand | `Settings.jsx`, `Sidebar.jsx` |

---

## 6. Component & Routing Map

### Routes (`App.jsx`)

| Path | Component | Notes |
|---|---|---|
| `/setup` | `SetupWizard` | First-run only; redirects to `/` after completion |
| `/register` | `Register` | Public |
| `/forgot-password` | `ForgotPassword` | Public |
| `/` | `Dashboard` | Protected via MainLayout |
| `/sales` | `Sales` | Protected |
| `/sales-log` | `SalesLog` | Protected |
| `/inventory` | `Inventory` | Protected |
| `/customers` | `Customers` | Protected |
| `/reports` | `Reports` | Protected |
| `/barcode` | `Barcode` | Protected |
| `/print` | `Print` | Protected |
| `/settings` | `Settings` | Protected |
| `/notes` | `Notes` | Protected |
| `*` | Redirect → `/` or `/setup` | — |

### Layout hierarchy

```
<ErrorBoundary>
  <Router>
    <Routes>
      {isFirstRun ? (
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="*" element={<Navigate to="/setup" />} />
      ) : (
        <>
          <Route path="/register" ... />
          <Route path="/forgot-password" ... />
          <MainLayout>
            <Outlet />    ← Dashboard / Sales / Inventory / etc.
          </MainLayout>
        </>
      )}
    </Routes>
  </Router>
</ErrorBoundary>
```

---

## 7. Offline Architecture

Two IndexedDB databases:

| Database | Stores | Purpose |
|---|---|---|
| `ParleNoireDB` | `products`, `categories`, `customers`, `settings`, `sales`, `notes` | Read cache for offline browsing |
| `ParleNoireQueue` | `actions` | Write queue for mutations made offline |

**Offline queue flow:**
1. User performs mutation while offline → saved to IndexedDB + queued in `ParleNoireQueue`
2. On `online` event → `setupOnlineSync()` flushes queue in FIFO order
3. After successful flush → syncs all stores from server via `syncAllData()`
4. Products/categories CRUD with pending queue items → skips full sync to preserve local changes

---

## 8. Setup Wizard Flow

1. App mounts → calls `GET /api/setup/status`
2. If `isFirstRun === true` → redirects to `/setup`
3. User completes 4 steps: Welcome → Store Name → Currency & Tax → Language & Theme
4. On finish → `POST /api/setup/initialize` saves settings
5. App redirects to `/` (Dashboard)

---

## 9. Known Technical Debt & Gotchas

| Issue | Status | Details |
|---|---|---|
| Supabase dependency in sync.service | **Legacy** | Still uses Supabase client for sync; being phased out |
| `backend/` directory now active | **Resolved** | Fully functional Express server replaced Supabase-only architecture |
| Login page removed | **Resolved** | No `/login` route; app assumes authenticated users |
| `supabase/functions/ai-assistant/` | **Dead code** | Replaced by local analytics router |
| Race condition in legacy `fetchSettings` + `loadSettings` | **Fixed** | Combined into single `loadSettings(true)` call in `App.jsx` |
| Dual localStorage keys | **Fixed** | `pos_settings` (legacy) vs `parle-nior-settings` (persist) |
| Receipt fields not synced | **Fixed** | `_buildSettings()` covers all 15+ fields |
| Logo CDN cache | **Mitigated** | 3-layer defense: clean URL, `?t=Date.now()`, CustomEvent |
| Translation extension conflicts | **Fixed** | `translate=no` on buttons and `html` root |
| Offline queue product/category CRUD | **Fixed** | Properly preserves pending local changes during sync |

---

## 10. Environment Variables

Required in `frontend/.env` (legacy — for sync.service only):

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

`.env` is listed in `.gitignore`.

---

## 11. Deployment

**Platform:** Netlify  
**Build settings** (from `netlify.toml`):
```
base    = "frontend"
command = "npm install && npm run build"
publish = "dist"
```

**SPA fallback:** `_redirects` file at `frontend/public/_redirects`:
```
/*    /index.html    200
```

**Local deployment:** Express server (port 3001) serves both the API and the built frontend (`frontend/dist`).

---

## 12. Default Login Credentials

- **Email:** admin@pos.local
- **Password:** admin123

---

## 13. Recent Architecture Changes (Last 10 Commits)

| Change | Commit | Impact |
|---|---|---|
| fetchProducts/fetchCategories → direct fetch | `d6bd9d8` | Bypasses offline API layer, queries Express directly |
| Single-fetch + Realtime architecture | `fba4eda` | Eliminates redundant Supabase queries |
| Save online CRUD to offlineDB | `bc1f92a` | Stats remain correct when going offline |
| Offline queue sync for products/categories | `cb735f8` | Preserves pending local changes + auto-refresh after sync |
| Offline-First Complete | `69fe703` | Full offline capability milestone |
| Translation extension DOM conflicts | `8b0d1d9` | `translate=no` on buttons and html root |
| Settings persistence flow | `c633f17` | Two-step set in loadSettings, post-upsert merge |
| Tournament management engine | `08c2ce5` | Feed, create, detail, bracket generator |
| Login page removed | Multiple | `Login.jsx` deleted, `ProtectedRoute` removed |
| Service Worker removed | Multiple | `sw.js` removed from both dist and public |
