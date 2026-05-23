# PARLE NOIRE POS — Architecture Blueprint

> **Generated:** 2026-05-22  
> **Purpose:** Onboard AI agents to the full codebase structure, data flow, and business logic.

---

## 1. Project Overview & Tech Stack

**Product:** Parle Noire POS & Cashier Dashboard — a bilingual (Arabic/English) Point-of-Sale system for a fashion e-commerce brand. Includes sales processing, inventory management, customer tracking, receipt printing, barcode scanning, backup/restore, and a local DB-driven AI analytics assistant.

| Layer | Technology |
|---|---|
| **Build tool** | Vite 5 |
| **Frontend framework** | React 18 |
| **State management** | Zustand 4 (with `persist` middleware for localStorage hydration) |
| **Routing** | React Router DOM 6 |
| **Styling** | Tailwind CSS 3 (dark theme, CSS custom properties for dynamic accent colors) |
| **Backend / DB** | Supabase (Postgres + Auth + Storage + RLS) |
| **Charts** | Recharts 2 |
| **Icons** | Lucide React |
| **Barcode** | JsBarcode, react-barcode, @zxing/library |
| **PDF / Print** | jsPDF, html2canvas |
| **Deployment** | Netlify (SPA with `_redirects` for client-side routing) |
| **PWA** | Service worker + IndexedDB offline queue + offline DB cache |

### Key architectural decisions

- **Supabase as the sole backend** — no Node.js server; all data operations flow through the Supabase JS client directly from the browser.
- **Zustand `persist` middleware** stores a snapshot of critical state (`settings`, `accentColor`, `language`, etc.) in `localStorage` under key `parle-nior-settings` for instant hydration on reload.
- **Dual localStorage bug (fixed):** A legacy `pos_settings` key was being read by `loadLocalPreferences()` inside `fetchSettings()`, overwriting the correctly persisted Zustand state with stale data. Fix: removed `loadLocalPreferences` calls and consolidated all settings loading into `loadSettings(true)` which always fetches fresh from Supabase.
- **Local AI assistant instead of external LLM:** The chatbot (`ai.api.js`) is a pure analytics router that queries Supabase tables directly (today's sales, low stock, category breakdown, etc.) — no Edge Function, no API key, no external AI dependency.
- **Offline-first:** IndexedDB stores (`ParleNoireDB` for data cache, `ParleNoireQueue` for offline action queue) enable basic operation without connectivity; `offline-queue.service.js` auto-flushes on `online` event.

---

## 2. Project Directory Structure

```
pos_system/
├── .gitignore
├── netlify.toml                     # SPA redirects, build commands
├── package.json                     # Root (empty workspace wrapper)
├── supabase_schema.sql              # Full DDL for all 8 tables
│
├── backend/                         # (empty — no custom server)
│
├── frontend/
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
│   ├── src/
│   │   ├── main.jsx                 # Entry point: React root + SW register + offline sync init
│   │   ├── App.jsx                  # Router, ProtectedRoute guard, theme application
│   │   ├── index.css                # Tailwind directives + CSS custom properties for theming
│   │   │
│   │   ├── api/                     # Supabase query wrappers (one file per domain)
│   │   │   ├── auth.api.js          #   login, logout, getMe, changePassword, sendOTP
│   │   │   ├── sales.api.js         #   CRUD sales + paginated listing
│   │   │   ├── products.api.js      #   CRUD products + categories
│   │   │   ├── customers.api.js     #   (embedded in pages/Customers.jsx directly)
│   │   │   ├── reports.api.js       #   summary, charts, backup/download
│   │   │   ├── settings.api.js      #   uploadLogoApi, updateSettingApi (upsert)
│   │   │   ├── notes.api.js         #   CRUD notes + unread count
│   │   │   └── ai.api.js            #   LOCAL analytics router (no LLM)
│   │   │
│   │   ├── lib/
│   │   │   └── supabase.js          # createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
│   │   │
│   │   ├── store/                   # Zustand stores
│   │   │   ├── useAuthStore.js      #   user, token, login, logout, changePassword, session timeout
│   │   │   ├── useCartStore.js      #   items[], discount, tax, checkout logic
│   │   │   ├── useInventoryStore.js #   products[], categories[], CRUD actions
│   │   │   ├── useNotesStore.js     #   notes[], unreadCount, CRUD
│   │   │   └── useSettingsStore.js  #   Flat fields + legacy `settings` object, persist, _syncSettings
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
│   │   │   │   └── TopBar.jsx           # Search bar + quick actions
│   │   │   └── ui/
│   │   │       ├── Button.jsx
│   │   │       ├── Input.jsx
│   │   │       ├── Modal.jsx
│   │   │       ├── ConfirmModal.jsx
│   │   │       ├── DataTable.jsx
│   │   │       ├── KpiCard.jsx
│   │   │       ├── Badge.jsx
│   │   │       └── Toast.jsx
│   │   │
│   │   ├── pages/                   # Route-level page components
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── Dashboard.jsx        #   KPI cards, charts, AI assistant
│   │   │   ├── Sales.jsx            #   POS cart + checkout flow
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
│   │   │   └── offline-queue.service.js # Action queue, flush on reconnect
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
│   └── dist/                        # Vite production build (deployed to Netlify)
│
└── supabase/
    └── functions/
        └── ai-assistant/
            └── index.ts             #    Legacy Deno Edge Function (no longer in use)
```

---

## 3. Database Schema (Supabase / PostgreSQL)

There are **8 tables** defined in `supabase_schema.sql`. RLS is enabled on all tables with a single permissive policy: `authenticated` role has full access.

| # | Table | Key Columns | Relationships |
|---|---|---|---|
| 1 | `profiles` | `id (UUID, PK → auth.users)`, `username`, `role` | Linked to Supabase Auth |
| 2 | `categories` | `id (bigint)`, `name_ar`, `name_en`, `color`, `icon` | Referenced by `products.category_id` |
| 3 | `products` | `id (bigint)`, `name_ar`, `name_en`, `category_id`, `barcode`, `sku`, `purchase_price`, `sale_price`, `quantity`, `min_quantity`, `image_url` | → `categories.id` |
| 4 | `customers` | `id (bigint)`, `name`, `phone`, `email`, `total_purchases` | Referenced by `sales.customer_id` |
| 5 | `sales` | `id (bigint)`, `invoice_number (unique)`, `total_amount`, `discount_amount`, `tax_amount`, `final_amount`, `payment_method`, `amount_paid`, `change_amount`, `customer_id`, `user_id` | → `customers.id`, `auth.users.id` |
| 6 | `sale_items` | `id (bigint)`, `sale_id`, `product_id`, `product_name`, `quantity`, `unit_price`, `total_price` | → `sales.id` (CASCADE), `products.id` |
| 7 | `settings` | `id (bigint)`, `key (text, unique)`, `value (text)` | Key-value store |
| 8 | `notes` | `id (bigint)`, `type`, `title`, `content`, `priority`, `product_id`, `reminder_date`, `read`, `created_by` | → `products.id`, `auth.users.id` |

---

## 4. API Layer Architecture

Each file in `src/api/` exports plain async functions. They do NOT use classes or instances. Every function:
1. Calls `supabase.from('table')...` 
2. Throws `new Error(message)` on failure
3. Returns the Supabase `data` payload on success

### Key design patterns

**Settings upsert pattern** (`settings.api.js`):
```js
// Always upsert, never update — so new keys are auto-created
await supabase.from('settings').upsert(
  { key, value: String(value) },
  { onConflict: 'key' }
);
```

**Local AI analytics router** (`ai.api.js`):
- No external API calls, no Edge Function invocation
- Intent detection via regex against Arabic/English keywords
- Switches between: `getTodaySales`, `getLowStock`, `getBestPromoTime`, `getTotalStockStatus`, `getCategoryInventory`, `searchProducts`, `getFullAnalysis`
- Each function runs raw Supabase queries and returns formatted Arabic/English text

---

## 5. State Management Flow (Zustand)

### Stores overview

| Store | Key State | Persisted? | Notes |
|---|---|---|---|
| `useAuthStore` | `user`, `token` | Manual (`localStorage`) | No Zustand persist; manual get/set |
| `useCartStore` | `items[]`, `discountAmount`, `paymentMethod` | ❌ | Ephemeral — cleared on checkout |
| `useInventoryStore` | `products[]`, `categories[]` | ❌ | Fetched fresh from Supabase on mount |
| `useNotesStore` | `notes[]`, `unreadCount` | ❌ | Re-fetched on interval |
| `useSettingsStore` | `storeName`, `logoUrl`, `settings{}`, `accentColor`, `language`, `themeMode`, `fontSize` | ✅ (`parle-nior-settings`) | Most complex store — see below |

### `useSettingsStore` internals

This is the most architecturally significant store. It uses `zustand/middleware/persist` with a `partialize` function that selects which fields survive page reload.

**Dual representation:**
- **Flat fields** (`storeName`, `storePhone`, `logoUrl`, `currency`, `tvaRate`) — used by modern components
- **Legacy `settings` object** (`{ store_name, store_phone, store_logo, receipt_header, ... }`) — used by Sidebar, Sales, and other older components

**Bridge:** `_syncSettings()` copies flat fields → `settings` object. `_buildSettings()` constructs a complete `settings` object from flat state (including receipt fields like `receipt_header`, `receipt_footer`, `receipt_show_sku`, etc.).

**Load flow (fixed):**
1. App mounts → `loadSettings(true)` is called
2. Fetches ALL key-value pairs from `supabase.from('settings').select('key, value')`
3. Maps to flat fields (e.g. `store_name` → `storeName`, `tva_rate` → `tvaRate`)
4. Calls `_buildSettings()` to construct the full `settings` object
5. Sets everything in a single `set()` call

**Save flow:**
1. `updateSettings(newSettings)` iterates entries, calls `supabase.from('settings').upsert()` for each
2. Merges `_buildSettings()` (fresh baseline) with `newSettings`
3. Sets `settings` directly — no dependency on potentially stale previous state

### Logo cache-busting (3-layer defense)

| Layer | Mechanism | Files |
|---|---|---|
| **DB storage** | Clean URL (no `?t=`) stored via `upsert` | `settings.api.js` |
| **Render-time** | `src={`${url}?t=${Date.now()}`}` on every `<img>` | `Settings.jsx`, `Sidebar.jsx` |
| **DOM event override** | `CustomEvent('store-logo-updated')` → local `useState` bypasses Zustand | `Settings.jsx:53-57`, `Sidebar.jsx:31-36` |

---

## 6. Component & Routing Map

### Routes (`App.jsx`)

| Path | Component | Auth |
|---|---|---|
| `/login` | `Login` | Public |
| `/register` | `Register` | Public |
| `/forgot-password` | `ForgotPassword` | Public |
| `/` | `Dashboard` | Protected |
| `/sales` | `Sales` | Protected |
| `/inventory` | `Inventory` | Protected |
| `/customers` | `Customers` | Protected |
| `/reports` | `Reports` | Protected |
| `/barcode` | `Barcode` | Protected |
| `/print` | `Print` | Protected |
| `/settings` | `Settings` | Protected |
| `/notes` | `Notes` | Protected |
| `*` | Redirect → `/` | — |

### Layout hierarchy

```
<ErrorBoundary>
  <Router>
    <Routes>
      <ProtectedRoute>
        <MainLayout>           ← Sidebar (left/right) + TopBar + content
          <Outlet />           ← Page component
        </MainLayout>
      </ProtectedRoute>
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

---

## 8. Known Technical Debt & Gotchas

| Issue | Status | Details |
|---|---|---|
| Dual localStorage keys | **Fixed** | `pos_settings` (legacy) vs `parle-nior-settings` (persist). Removed `loadLocalPreferences` calls. |
| `isLoaded` guard skipping fetches | **Fixed** | Persisted `isLoaded` caused `loadSettings` to short-circuit on 2nd page load. Removed guard; added `force` param. |
| Receipt fields not synced | **Fixed** | `_syncSettings` only synced 6 fields. Added `_buildSettings()` that covers all 15+ fields. |
| `settings.api.js` using `.update()` | **Fixed** | Changed to `.upsert()` so new keys are auto-created. |
| Logo CDN cache | **Mitigated** | 3-layer defense: clean URL in DB, `?t=Date.now()` at render, CustomEvent override. Supabase CDN TTL may still serve stale bytes for up to its cache duration. |
| `backend/` directory empty | Unchanged | No custom server needed — Supabase is the backend. |
| `supabase/functions/ai-assistant/` | **Dead code** | Replaced by local analytics router. Keep file for reference but it's not called anywhere. |
| Race condition in legacy `fetchSettings` + `loadSettings` | **Fixed** | Combined into single `loadSettings(true)` call in `App.jsx`. |

---

## 9. Environment Variables

Required in `frontend/.env`:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

`.env` is listed in `.gitignore`.

---

## 10. Deployment

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
