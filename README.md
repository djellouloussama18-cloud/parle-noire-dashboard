# نظام نقطة البيع Parle Noire POS — دليل الهندسة البرمجية وشرح الكود

نظام **Parle Noire POS** هو تطبيق ويب متكامل لإدارة المبيعات ونقاط البيع مصمم خصيصاً لعلامة تجارية في مجال الأزياء والموضة. يتميز النظام بواجهة ثنائية اللغة (العربية والإنجليزية)، وإمكانية العمل بدون اتصال بالإنترنت (Offline-First)، وإدارة تفصيلية للمخزون والفواتير، ومساعد ذكاء اصطناعي محلي للتحليلات (Local AI Assistant) دون الحاجة للاتصال بخدمات خارجية، وتقويم مبيعات تفاعلي، وتطبيق سطح مكتب (Electron)، ودعم تطبيقات الويب التقدمية (PWA).

---

## 1. التقنيات المستخدمة في النظام (Tech Stack)

يتكون النظام من جزأين رئيسيين: واجهة أمامية (Frontend) وخلفية برمجية (Backend) مع قاعدة بيانات مدمجة.

### الواجهة الأمامية (Frontend):
*   **Vite 5 & React 18:** لبناء وتطوير الواجهة البرمجية بسرعة وكفاءة عالية.
*   **Zustand 4:** لإدارة الحالة (State Management) مع ميزة الحفظ التلقائي في المتصفح (`persist`).
*   **Tailwind CSS 3:** للتنسيق وتصميم الواجهة بمظهر عصري وداكن (Dark Theme) مع دعم تخصيص الألوان الديناميكية.
*   **React Router DOM 6:** للتنقل بين الصفحات وإدارة المسارات المحمية.
*   **Recharts 2:** لعرض الرسوم البيانية التفاعلية وتقارير الأداء.
*   **JsBarcode & react-barcode:** لتوليد وطباعة الباركود الخاص بالمنتجات.
*   **jsPDF & html2canvas:** لتوليد الفواتير بصيغة PDF وتجهيزها للطباعة الحرارية.
*   **@zxing/library:** لمسح الباركود بالكاميرا (Barcode Scanner).
*   **IndexedDB (offline-first):** لتخزين البيانات محلياً في المتصفح وتشغيل طابور العمليات (Offline Queue) للمزامنة التلقائية عند انقطاع الإنترنت.
*   **Lucide React:** أيقونات الواجهة الحديثة.
*   **خط Tajawal:** خط عربي مدمج في الواجهة (يتم تحميله من `public/fonts/`).
*   **PWA (Progressive Web App):** دعم التثبيت كتطبيق مع `manifest.json` وأيقونات PWA.

### الخلفية البرمجية وقاعدة البيانات (Backend & Database):
*   **Node.js & Express:** لتشغيل الخادم البرمجي محلياً على المنفذ 3001 ومعالجة طلبات الـ API.
*   **sql.js (SQLite WebAssembly):** قاعدة بيانات SQLite تعمل بالكامل في الذاكرة وتقوم بحفظ وتصدير البيانات دورياً كملف ثنائي (`database/pos_store.db`) على القرص الصلب.
*   **JSON Web Tokens (JWT):** للتحقق من هوية المستخدمين وصلاحياتهم بشكل آمن.
*   **Bcrypt.js:** لتشفير وحماية كلمات مرور المستخدمين في قاعدة البيانات.
*   **Multer:** لإدارة ورفع ملفات الصور الخاصة بالمنتجات وشعار المتجر.
*   **CORS:** للسماح بالاتصال بين الواجهة والخادم.

### تطبيق سطح المكتب (Desktop App):
*   **Electron 42:** لتغليف التطبيق كتطبيق سطح مكتب مستقل (`electron/main.js` + `electron/preload.js`).
*   **electron-builder 26:** لبناء نسخ قابلة للتثبيت (Linux AppImage).

### الأدوات المساعدة والبرمجة النصية:
*   **Concurrently:** لتشغيل الواجهة والخلفية معاً في وضع التطوير.
*   **@supabase/supabase-js:** مكتبة Supabase القديمة — لا تزال تُستخدم فقط في `sync.service.js` لسحب البيانات ونصوص `migrate.js` و `fix-data.js` و `sync-from-supabase.js`.

---

## 2. هيكلية المجلدات وشرح الملفات (Directory Structure)

تنقسم ملفات المشروع إلى المجلدات التالية:

```text
pos_system/
├── .env                              # مفاتيح Supabase للخلفية (SUPABASE_URL, SUPABASE_SERVICE_KEY)
├── .gitignore                        # يتجاهل node_modules, .env, *.db, frontend/dist
├── AGENTS.md                         # تعليمات مساعد AI للمشروع
├── PROJECT_ARCHITECTURE_SUMMARY.md   # دليل معماري شامل للمساعدين البرمجيين
├── README.md                         # هذا الملف
├── README-USB.txt                    # دليل تشغيل سريع من فلاش USB
├── package.json                      # جذر المشروع (Electron + scripts)
├── package-lock.json
│
├── electron/                         # تطبيق سطح المكتب Electron
│   ├── main.js                       # نواة Electron (تشغيل السيرفر، إنشاء النافذة، حظر التنقل الخارجي)
│   └── preload.js                    # تعريض window.electronAPI للواجهة
│
├── backend/                          # خادم Node.js / Express
│   ├── server.js                     # نقطة الدخول الرئيسية (منفذ 3001) — تحميل جميع المسارات
│   ├── package.json
│   ├── .env                          # (قديم — لم يعد مستخدماً)
│   ├── database/
│   │   ├── db.js                     # مشغل sql.js (getDb/saveDb)
│   │   └── pos_store.db              # ملف SQLite
│   ├── middleware/
│   │   └── (auth.js was removed — يتم التعامل مع التوثيق بشكل مختلف)
│   ├── routes/
│   │   ├── products.routes.js        # CRUD المنتجات مع رفع الصور
│   │   ├── categories.routes.js      # CRUD التصنيفات
│   │   ├── sales.routes.js           # إنشاء الفواتير مع transaction
│   │   ├── customers.routes.js       # CRUD العملاء
│   │   ├── settings.routes.js        # الإعدادات + batch/upsert + رفع الشعار
│   │   ├── expenses.routes.js        # CRUD المصاريف مع التصفية والتقارير
│   │   ├── notes.routes.js           # CRUD الملاحظات + unread-count
│   │   ├── reports.routes.js         # summary/charts/analysis
│   │   ├── backups.routes.js         # النسخ الاحتياطية (إنشاء/استعادة/تحميل/حذف)
│   │   ├── calendar.routes.js        # تقويم المبيعات (month/day)
│   │   ├── license.routes.js         # الترخيص + البصمة الرقمية
│   │   └── setup.routes.js           # التحقق من التشغيل الأول + التهيئة
│   ├── services/
│   │   ├── backup.service.js         # نسخ احتياطي تلقائي كل ساعة
│   │   ├── license.service.js        # إدارة الترخيص
│   │   ├── migration.service.js      # ترحيل البيانات
│   │   └── setup.service.js          # كشف التشغيل الأول
│   ├── scripts/
│   │   ├── sync-from-supabase.js     # مزامنة شاملة من Supabase إلى SQLite
│   │   ├── dedupe-products.js        # إزالة المنتجات المكررة
│   │   ├── .env.sync                 # إعدادات sync-from-supabase
│   │   ├── .env.sync.example         # قالب إعدادات المزامنة
│   │   ├── add-license-column.sql    # إضافة عمود license_key لـ Supabase
│   │   ├── get-products.sql          # استعلام لجلب المنتجات من Supabase
│   │   └── import-data/              # (فارغ — جاهز للاستيراد)
│   ├── check.js                      # (فارغ)
│   ├── check2.js                     # عد المنتجات وعرض أول 3
│   ├── check3.js                     # عد sale_items وعرض أعلى 5 منتجات
│   ├── count.js                      # عد المنتجات في SQLite
│   └── fix.js                        # (فارغ)
│
├── frontend/                         # تطبيق React / Vite
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── public/
│   │   ├── _redirects                # Netlify SPA fallback
│   │   ├── manifest.json             # PWA manifest (display standalone)
│   │   ├── offline.html              # صفحة عدم الاتصال
│   │   ├── icon.png                  # أيقونة التطبيق
│   │   ├── icons/
│   │   │   ├── pwa-192x192.png
│   │   │   └── pwa-512x512.png
│   │   └── fonts/
│   │       ├── tajawal.css           # تعريفات خط Tajawal
│   │       └── tajawal/              # ملفات woff2 للخط (10 أوزان)
│   ├── dist/                         # نسخة الإنتاج (يخدمها Express)
│   └── src/
│       ├── main.jsx                  # نقطة التشغيل
│       ├── App.jsx                   # الموجه + بوابة الإعداد الأول + التهيئة
│       ├── index.css                 # Tailwind + متغيرات CSS
│       ├── api/
│       │   ├── auth.api.js
│       │   ├── products.api.js       # مع دعم offline queue
│       │   ├── sales.api.js
│       │   ├── customers.api.js
│       │   ├── settings.api.js
│       │   ├── expenses.api.js       # المصاريف (API only, no offline)
│       │   ├── notes.api.js
│       │   ├── reports.api.js
│       │   ├── ai.api.js             # محلل محلي (بدون LLM)
│       │   ├── backups.api.js
│       │   ├── calendar.api.js       # تقويم المبيعات (month/day)
│       │   ├── license.api.js
│       │   └── setup.api.js
│       ├── lib/
│       │   └── supabase.js           # عميل Supabase معطل (كل الدوال ترمي خطأ)
│       ├── store/
│       │   ├── useAuthStore.js
│       │   ├── useCartStore.js
│       │   ├── useInventoryStore.js
│       │   ├── useNotesStore.js
│       │   ├── useSalesStore.js      # ملخص المبيعات والرسوم البيانية للوحة التحكم
│       │   ├── useLicenseStore.js    # ترخيص (مستمر)
│       │   └── useSettingsStore.js   # إعدادات (مستمر)
│       ├── components/
│       │   ├── ErrorBoundary.jsx     # مكون احتواء الأخطاء
│       │   ├── ai/
│       │   │   └── AiAssistant.jsx
│       │   ├── calendar/
│       │   │   ├── DayCell.jsx       # خلية اليوم في تقويم المبيعات
│       │   │   └── SaleDetailModal.jsx # تفاصيل الفاتورة عند النقر على يوم
│       │   ├── charts/ (Area, Bar, Donut)
│       │   ├── layout/ (MainLayout, Sidebar, TopBar)
│       │   └── ui/ (Button, Input, Modal, ConfirmModal, Select, DataTable, Badge, KpiCard, Toast, ConnectionStatus)
│       ├── pages/
│       │   ├── SetupWizard.jsx       # معالج الإعداد الأول (4 خطوات)
│       │   ├── Register.jsx
│       │   ├── ForgotPassword.jsx
│       │   ├── Dashboard.jsx
│       │   ├── Sales.jsx
│       │   ├── SalesLog.jsx          # سجل المبيعات
│       │   ├── SalesCalendar.jsx     # تقويم المبيعات (خريطة حرارية)
│       │   ├── Inventory.jsx
│       │   ├── Customers.jsx
│       │   ├── Expenses.jsx          # المصاريف والتكاليف
│       │   ├── Reports.jsx
│       │   ├── Barcode.jsx
│       │   ├── Print.jsx
│       │   ├── Settings.jsx
│       │   └── Notes.jsx
│       ├── services/
│       │   ├── db.service.js         # IndexedDB
│       │   ├── offline-queue.service.js # طابور العمليات
│       │   └── sync.service.js       # مزامنة Supabase ← IndexedDB
│       ├── hooks/ (useBarcode, usePrint, useNotification)
│       └── utils/ (formatCurrency, formatDate, validators)
│
├── supabase/                         # (قديم — لم يعد مستخدماً)
│   └── functions/ai-assistant/
│       └── index.ts                  # كود ميت — تم استبداله بالمحلل المحلي
│
├── database/
│   ├── pos_store.db                  # قاعدة بيانات SQLite
│   └── pos_store_backup_before_migration.db  # نسخة احتياطية قبل الترحيل
│
├── backups/                          # نسخ احتياطية تلقائية (كل ساعة)
├── uploads/ (products/, logos/)
├── release/                          # مخرجات electron-builder
│   ├── builder-debug.yml
│   └── linux-unpacked/
│
├── نصوص برمجية (Root Scripts):
│   ├── install.sh                    # تثبيت على Linux
│   ├── chromebook-install.sh         # تثبيت على Chromebook (مع أيقونة تطبيق)
│   ├── start.sh / start.bat          # تشغيل النظام
│   ├── update.sh                     # تحديث النظام (نسخ احتياطي + سحب + بناء)
│   ├── migrate.js                    # ترحيل Supabase → SQLite
│   ├── fix-data.js                   # سحب جميع البيانات من Supabase
│   ├── fix-all-data.js               # استيراد المبيعات + إضافة المنتجات الناقصة
│   ├── fix-dates.js                  # إصلاح التواريخ بناءً على رقم الفاتورة
│   ├── create-admin.js               # إنشاء مستخدم مدير
│   ├── add-missing-products.js       # إضافة 26 منتجاً مفقوداً
│   ├── force-update-sales.js         # فرض تحديث المبيعات من JSON
│   ├── update-notes.js               # تحديث الملاحظات من JSON
│   ├── update-products.js            # تحديث المنتجات من JSON
│   ├── update-sale-items.js          # تحديث عناصر الفواتير من JSON
│   ├── update-sales.js               # تحديث المبيعات من JSON
│   ├── _check_db.js                  # فحص شامل لقاعدة البيانات
│   ├── test-usb.js                   # اختبار تشغيل من USB
│   └── test-db-write.js              # اختبار الكتابة على SQLite
│
├── ملفات بيانات (JSON):
│   ├── notes_from_supabase.json      # 62 ملاحظة مصدرة من Supabase
│   ├── products_from_supabase.json   # 452 منتج مصدر من Supabase
│   ├── sale_items_from_supabase.json # 398 عنصر فاتورة
│   ├── sales_from_supabase.json      # 321 فاتورة مبيعات
│   └── license.dat                   # ملف الترخيص
│
├── netlify.toml                      # إعدادات نشر Netlify
├── supabase_schema.sql               # مخطط Supabase الكامل (PostgreSQL)
└── reset_data.sql                    # تصفير بيانات Supabase
```

---

## 3. بنية قاعدة البيانات وجداولها (Database Schema)

تحتوي قاعدة بيانات التطبيق (`pos_store.db`) على **9 جداول رئيسية** تدعم خاصية تعدد الحسابات (Multi-tenant) عبر ربط البيانات برقم حساب المستخدم (`user_id`):

### 1. جدول المصاريف والتكاليف (`expenses`):
يسجل جميع المصاريف التشغيلية والتكاليف اليومية.
*   `id` (رقمي - مفتاح رئيسي تلقائي الزيادة)
*   `title` (نصي - عنوان المصروف)
*   `amount` (حقيقي - المبلغ، يجب أن يكون أكبر من 0)
*   `category` (نصي - تصنيف المصروف: rent, salaries, utilities, inventory, marketing, maintenance, transport, taxes, other)
*   `payment_method` (نصي - طريقة الدفع: cash, card, transfer)
*   `date` (نصي - تاريخ المصروف بصيغة YYYY-MM-DD)
*   `notes` (نصي - ملاحظات إضافية)
*   `is_recurring` (رقمي - 0 لمصروف عادي، 1 لمتكرر)
*   `recurring_type` (نصي - نوع التكرار: monthly, yearly)
*   `user_id` (نصي - لربط المصروف بحساب المستخدم)
*   `created_at`, `updated_at` (نصوص تدل على وقت الإنشاء والتحديث)

### 2. جدول الحسابات الشخصية (`profiles`):
يخزن بيانات المستخدمين المسجلين في النظام.
*   `id` (نصي - مفتاح رئيسي UUID)
*   `email` (نصي - فريد)
*   `password_hash` (نصي - كلمة المرور المشفرة بـ Bcrypt)
*   `username` (نصي)
*   `full_name` (نصي)
*   `phone` (نصي)
*   `role` (نصي - الصلاحية الافتراضية 'user' أو 'admin')
*   `created_at`, `updated_at` (نصوص تدل على وقت الإنشاء والتحديث)

### 3. جدول التصنيفات (`categories`):
يخزن تصنيفات المنتجات (مثل: ملابس، إكسسوارات...).
*   `id` (رقمي - مفتاح رئيسي تلقائي الزيادة)
*   `name_ar` (نصي - الاسم بالعربية)
*   `name_en` (نصي - الاسم بالإنجليزية)
*   `color` (نصي - كود اللون الممثل للتصنيف بالواجهة)
*   `icon` (نصي - اسم الأيقونة المستخدمة)
*   `user_id` (نصي - لربط التصنيف بالمستخدم المنشئ)

### 4. جدول المنتجات (`products`):
يخزن تفاصيل المنتجات المتوفرة للبيع.
*   `id` (رقمي - مفتاح رئيسي تلقائي الزيادة)
*   `name_ar`, `name_en` (نصي - اسم المنتج باللغتين)
*   `category_id` (رقمي - مفتاح أجنبي يربط بجدول التصنيفات)
*   `barcode` (نصي - الرمز الشريطي للمنتج)
*   `sku` (نصي - وحدة حفظ المخزون)
*   `purchase_price` (حقيقي - سعر الشراء)
*   `sale_price` (حقيقي - سعر البيع للجمهور)
*   `quantity` (رقمي - الكمية الحالية بالمخزون)
*   `min_quantity` (رقمي - الحد الأدنى للكمية قبل إطلاق تنبيه بالنقص)
*   `image_url` (نصي - مسار صورة المنتج)
*   `description` (نصي - وصف المنتج)
*   `user_id` (نصي - لربط المنتج بحساب المستخدم)

### 5. جدول العملاء (`customers`):
يخزن بيانات العملاء لتتبع معاملاتهم.
*   `id` (رقمي - مفتاح رئيسي)
*   `name` (نصي)
*   `phone` (نصي)
*   `email` (نصي)
*   `address` (نصي)
*   `total_purchases` (حقيقي - مجموع مشتريات العميل التراكمية)
*   `user_id` (نصي)

### 6. جدول المبيعات (`sales`):
يخزن الفواتير والمعاملات الأساسية للبيع.
*   `id` (رقمي - مفتاح رئيسي)
*   `invoice_number` (نصي - رقم الفاتورة الفريد وتوليده تلقائي بصيغة `INV-YYYYMMDD-RANDOM`)
*   `total_amount` (حقيقي - الإجمالي قبل الخصم والضرائب)
*   `discount_amount` (حقيقي - قيمة الخصم المطبق)
*   `tax_amount` (حقيقي - قيمة الضريبة المضافة)
*   `final_amount` (حقيقي - القيمة النهائية المطلوب دفعها)
*   `payment_method` (نصي - طريقة الدفع: cash, card...)
*   `amount_paid` (حقيقي - المبلغ الذي سدده العميل فعلياً)
*   `change_amount` (حقيقي - المبلغ المتبقي المسترجع للعميل)
*   `notes` (نصي - ملاحظات على الفاتورة)
*   `customer_id` (رقمي - يربط بالعميل)
*   `user_id` (نصي - يربط بالمستخدم الذي قام بالعملية)

### 7. جدول تفاصيل الفاتورة (`sale_items`):
يخزن المنتجات المباعة داخل كل فاتورة.
*   `id` (رقمي - مفتاح رئيسي)
*   `sale_id` (رقمي - يربط بجدول المبيعات الرئيسي)
*   `product_id` (رقمي - يربط بالمنتج المباع)
*   `product_name` (نصي - اسم المنتج وقت البيع لضمان ثباته عند تعديل المنتج الأصلي)
*   `quantity` (رقمي - الكمية المباعة)
*   `unit_price` (حقيقي - سعر الوحدة وقت البيع)
*   `total_price` (حقيقي - إجمالي السعر للمنتج)

### 8. جدول الإعدادات (`settings`):
يخزن إعدادات المتجر العامة بصيغة مفتاح وقيمة (Key-Value).
*   `id` (رقمي - مفتاح رئيسي)
*   `key` (نصي - اسم الإعداد)
*   `value` (نصي - قيمة الإعداد)
*   `user_id` (نصي)

### 9. جدول الملاحظات والتنبيهات (`notes`):
يخزن المهام، والتذكيرات، وتنبيهات نفاد المخزون.
*   `id` (رقمي - مفتاح رئيسي)
*   `type` (نصي - نوع الملاحظة: task, alert, reminder)
*   `title` (نصي - العنوان)
*   `content` (نصي - المحتوى والتفاصيل)
*   `priority` (نصي - الأولوية: low, medium, high)
*   `product_id` (رقمي - يربط بمنتج إذا كان التنبيه متعلقاً بنفاد كميته)
*   `reminder_date` (نصي - تاريخ التذكير)
*   `read` (رقمي - 0 للغير مقروءة و1 للمقروءة)
*   `created_by` (نصي - يربط بالمستخدم المنشئ)

---

## 4. تفاصيل عمل الكود وآليات التشغيل (Code Logic & Workflows)

### 1. إدارة قاعدة البيانات والاتصال المباشر (SQLite in Node.js):
في ملف [db.js](backend/database/db.js)، يتم استخدام مكتبة `sql.js` (SQLite عبر WebAssembly).
*   عند تشغيل الخادم البرمجي، يتم قراءة ملف قاعدة البيانات `pos_store.db` كـ Buffer وتمريره للمكتبة لتشغيل قاعدة البيانات في الذاكرة السريعة (RAM).
*   يتم إنشاء الجداول المذكورة تلقائياً عند أول تشغيل إذا لم تكن موجودة (`CREATE TABLE IF NOT EXISTS`).
*   لضمان استمرار وحفظ البيانات (Persistence)، يجب استدعاء الدالة `saveDb()` بعد كل عملية كتابة (إضافة، تعديل، حذف). تقوم هذه الدالة بتصدير قاعدة البيانات من الذاكرة وحفظها كملف ثنائي على القرص الصلب:

### 2. معالجة عمليات البيع وتحديث المخزون (Sales Transaction Flow):
في ملف [sales.routes.js](backend/routes/sales.routes.js)، تتم عملية البيع داخل **معاملة برمجية آمنة (Transaction)** لضمان تكامل البيانات:
1.  يتم إرسال الطلب الذي يحتوي على بيانات الفاتورة وسلة المنتجات (`items`).
2.  يتم بدء المعاملة البرمجية عبر كتابة `BEGIN` في قاعدة البيانات.
3.  يتم إدراج بيانات الفاتورة الرئيسية في جدول `sales` والحصول على رقم المعرف الخاص بها (`saleId`).
4.  يتم المرور على جميع المنتجات المباعة وإضافتها لجدول `sale_items`.
5.  بالتزامن مع الإدراج، يتم خصم الكميات المباعة مباشرة من جدول المنتجات (`products`).
6.  إذا نجحت كل العمليات يتم تنفيذ أمر `COMMIT` واستدعاء `saveDb()` لحفظ البيانات نهائياً.
7.  في حال حدوث أي خطأ في أي خطوة، يتم إطلاق استثناء والرجوع عن كل التغييرات السابقة عبر أمر `ROLLBACK`.

### 3. نظام التشغيل دون اتصال بالإنترنت (Offline-First Architecture):
يعتمد التطبيق على آلية متكاملة للعمل بكفاءة دون اتصال بالإنترنت باستخدام IndexedDB وطابور للعمليات المعلقة مع مزامنة تلقائية عند استعادة الاتصال:
*   **القراءة اللامتصلة:** عند طلب المنتجات أو التصنيفات، تفحص الواجهة الأمامية حالة الشبكة (`navigator.onLine`). إذا لم يكن هناك إنترنت، يتم استرجاع البيانات المخزنة محلياً في المتصفح عبر دالة `offlineDB.getAll('products')` في ملف [db.service.js](frontend/src/services/db.service.js).
*   **الكتابة عبر API مباشرة:** عند الاتصال بالإنترنت، تستخدم دوال API (`products.api.js`، `customers.api.js`، إلخ) دالة `fetch()` للتواصل مع خادم Express مباشرة، وتقوم بحفظ النسخة في IndexedDB بعد كل عملية.
*   **طابور العمليات (Offline Queue):** عند قيام المستخدم بعمليات تعديل أثناء انقطاع الإنترنت، يتم توليد معرفات مؤقتة وحفظ البيانات محلياً، ثم تسجيل الحدث في طابور العمليات (`ParleNoireQueue`) عبر `addToQueue`. عند تحول المتصفح للحالة المتصلة، يقوم ملف [offline-queue.service.js](frontend/src/services/offline-queue.service.js) بإفراغ الطابور بالتسلسل.
*   **المزامنة الكاملة (Full Sync):** بعد إفراغ طابور العمليات، يتم استدعاء `syncAllData()` في ملف [sync.service.js](frontend/src/services/sync.service.js) لمزامنة جميع جداول IndexedDB مع الخادم، مع تخطي المتاجر التي تحتوي على عمليات معلقة.

### 4. المساعد التحليلي الذكي المحلي (Local AI Assistant):
في ملف [AiAssistant.jsx](frontend/src/components/ai/AiAssistant.jsx)، يعمل المساعد في ملف [ai.api.js](frontend/src/api/ai.api.js) كمحرك ذكي محلي (Local Parser & Router) يستخدم تعابير نمطية (Regular Expressions) لتحديد نية المستخدم (Intent Detection) مثل مبيعات اليوم، المخزون المنخفض، أفضل وقت للترويج، والتقارير الشاملة. عند تحديد النية، يقوم بالاستعلام من IndexedDB أو من روابط التقارير على الخادم.

### 5. إدارة الإعدادات وحل مشكلة تحديث الشعار (Zustand & Logo Cache-busting):
يستخدم متجر الحالة `useSettingsStore` أسلوب التمثيل الثنائي للإعدادات: حقول مسطحة (مثل `storeName`, `themeMode`) وكائن إعدادات متكامل للتوافق مع الواجهات القديمة. تمت معالجة مشكلة تخزين الشعار المؤقت باستخدام دفاع ثلاثي:
1. يُحفظ مسار الشعار نظيفاً في قاعدة البيانات.
2. عند العرض، يتم تذييل المسار بختم زمني: `src={`${logoUrl}?t=${Date.now()}`}`.
3. عند نجاح الرفع، يتم إطلاق حدث `CustomEvent('store-logo-updated')` تستمع له المكونات الحساسة.

### 6. معالج الإعداد الأول (Setup Wizard):
يكشف ملف [setup.service.js](backend/services/setup.service.js) أن قاعدة البيانات فارغة ويعيد `isFirstRun: true` من `GET /api/setup/status`. يقوم المكون [App.jsx](frontend/src/App.jsx) بتوجيه المستخدم إلى صفحة `/setup` التي تعرض معالجاً من 4 خطوات: ترحيب، اسم المتجر، العملة والضرائب، اللغة والمظهر.

### 7. نظام الترخيص (License System):
يستخدم النظام آلية ترخيص تعتمد على بصمة الجهاز (Machine Fingerprint) والرقم التسلسلي (Serial). ملف [license.service.js](backend/services/license.service.js) يقوم بتوليد بصمة رقمية فريدة بناءً على مواصفات الجهاز. مخزن [useLicenseStore.js](frontend/src/store/useLicenseStore.js) يحفظ معلومات الترخيص بشكل مستمر.

### 8. نظام النسخ الاحتياطي التلقائي (Auto Backup):
يقوم النظام بإنشاء نسخ احتياطية لقاعدة البيانات SQLite بشكل تلقائي كل ساعة. ملف [backup.service.js](backend/services/backup.service.js) يقوم بنسخ ملف `pos_store.db` إلى مجلد `backups/` مع طابع زمني. نقاط النهاية في [backups.routes.js](backend/routes/backups.routes.js):
*   `GET /api/backups` - عرض قائمة النسخ الاحتياطية
*   `POST /api/backups` - إنشاء نسخة احتياطية جديدة
*   `GET /api/backups/:id/download` - تحميل نسخة احتياطية
*   `POST /api/backups/restore` - استعادة نسخة احتياطية (مع أخذ نسخة احتياطية تلقائية أولاً)
*   `DELETE /api/backups/:filename` - حذف نسخة احتياطية

### 9. تقويم المبيعات (Sales Calendar):
في ملف [calendar.routes.js](backend/routes/calendar.routes.js)، يوفر النظام تقويماً تفاعلياً يعرض المبيعات كخريطة حرارية:
*   `GET /api/calendar/month?year=&month=` - يعرض إحصائيات اليوم (عدد الفواتير، الإيرادات) للشهر المحدد.
*   `GET /api/calendar/day?year=&month=&day=` - يعرض تفاصيل المبيعات في اليوم المحدد مع عناصر الفاتورة.
*   في الواجهة الأمامية، تستخدم صفحة [SalesCalendar.jsx](frontend/src/pages/SalesCalendar.jsx) مكونات [DayCell.jsx](frontend/src/components/calendar/DayCell.jsx) (خلايا ملونة حسب الإيرادات) و [SaleDetailModal.jsx](frontend/src/components/calendar/SaleDetailModal.jsx) (تفاصيل الفاتورة عند النقر).

### 10. تطبيق سطح المكتب (Electron Desktop App):
يتم تغليف النظام كتطبيق سطح مكتب باستخدام Electron. ملف [electron/main.js](electron/main.js):
*   يقوم بتشغيل خادم Express كعملية فرعية (`child_process.spawn`).
*   ينشئ نافذة تطبيق (`BrowserWindow`) بحجم 1400×900 مع خلفية داكنة.
*   يقوم بإخفاء قائمة التطبيق (`Menu.setApplicationMenu(null)`) ليعمل كتطبيق متجر (Kiosk-like).
*   يمنع التنقل إلى أي رابط خارج `localhost:3001` لضمان العمل دون اتصال.
*   ملف [electron/preload.js](electron/preload.js) يعرّض `window.electronAPI` مع معلومات النظام.

لتشغيل التطبيق كتطبيق سطح مكتب:
```bash
npm run electron:dev          # تطوير
npm run electron:build:linux  # بناء نسخة Linux AppImage
```

### 11. محرك البطولات (Tournament Management):
يتضمن النظام محركاً أساسياً للبطولات (إضافة جدول البطولة، إنشاء، تفاصيل، مولد جدول المباريات).

---

## 5. طريقة تثبيت وتشغيل النظام (Setup & Running)

لتشغيل هذا النظام على جهازك المحلي، يرجى اتباع الخطوات التالية:

### الخطوة 1: تثبيت المكتبات البرمجية
```bash
# تثبيت جميع المكتبات (الجذر + الخلفية + الواجهة)
npm run install:all
```

### الخطوة 2: بناء الواجهة الأمامية (Build)
```bash
npm run build
```

### الخطوة 3: تشغيل خادم النظام (Start Server)
```bash
npm start
# أو
cd backend && node server.js
```
سيبدأ السيرفر بالعمل على الرابط التالي: [http://localhost:3001](http://localhost:3001)

### الخطوة 4: تطوير (Development)
لتشغيل الواجهة والخلفية معاً في وضع التطوير (مع hot-reload):
```bash
npm run dev
```

### حساب المدير الافتراضي (Default Account)
*   **البريد الإلكتروني:** `admin@pos.local`
*   **كلمة المرور:** `admin123`

لإنشاء مستخدم مدير جديد يدوياً:
```bash
node create-admin.js
```

### التثبيت على Chromebook / Linux:
```bash
# سكريبت التثبيت المتكامل (يثبت Node.js + ينشئ أيقونة تطبيق)
./chromebook-install.sh

# أو السكريبت الأساسي
./install.sh
```

### التشغيل من فلاش USB:
1. انسخ مجلد `pos_system` بالكامل إلى فلاش USB.
2. شغّل `start.bat` (Windows) أو `start.sh` (Linux).
3. راجع [README-USB.txt](README-USB.txt) للحصول على تعليمات سريعة.

---

## 6. نصوص برمجية مساعدة (Scripts Reference)

### نصوص صيانة قاعدة البيانات:
| السكريبت | الوظيفة |
|---|---|
| `migrate.js` | ترحيل شامل من Supabase → SQLite (جميع الجداول) |
| `fix-data.js` | سحب جميع البيانات من Supabase إلى SQLite |
| `fix-all-data.js` | استيراد المبيعات من JSON + إضافة المنتجات الناقصة |
| `fix-dates.js` | إصلاح التواريخ من رقم الفاتورة `INV-YYYYMMDD-XXXX` |
| `add-missing-products.js` | إضافة 26 منتجاً مفقوداً (IDs 235-262) |
| `create-admin.js` | إنشاء مستخدم مدير مباشرة في قاعدة البيانات |

### نصوص التحديث من Supabase (ملفات JSON):
| السكريبت | المصدر | الهدف |
|---|---|---|
| `update-products.js` | `products_from_supabase.json` | جدول `products` |
| `update-sales.js` | `sales_from_supabase.json` | جدول `sales` |
| `update-sale-items.js` | `sale_items_from_supabase.json` | جدول `sale_items` |
| `update-notes.js` | `notes_from_supabase.json` | جدول `notes` |
| `force-update-sales.js` | `sales_from_supabase.json` | `INSERT OR REPLACE` على `sales` |

### نصوص الفحص والاختبار:
| السكريبت | الوظيفة |
|---|---|
| `_check_db.js` | فحص شامل: عرض الجداول، عدد السجلات، الإعدادات |
| `test-db-write.js` | اختبار دورة الكتابة/القراءة على SQLite |
| `test-usb.js` | التحقق من صلاحية المسار للتشغيل من USB |
| `backend/count.js` | عد المنتجات في SQLite |
| `backend/check2.js` | عرض أول 3 منتجات |
| `backend/check3.js` | عرض أعلى 5 منتجات مبيعاً |

### نصوص الخلفية (Backend Scripts):
| السكريبت | الوظيفة |
|---|---|
| `backend/scripts/sync-from-supabase.js` | مزامنة شاملة من Supabase (مع dry-run و backup) |
| `backend/scripts/dedupe-products.js` | إزالة المنتجات المكررة حسب `(user_id, barcode)` |

---

## 7. ملفات الإعدادات والبيئة (Configuration & Environment)

### ملف `.env` (الجذر):
```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
يُستخدم في نصوص `migrate.js`, `fix-data.js`, `sync-from-supabase.js`.

### ملف `backend/scripts/.env.sync`:
```env
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
SYNC_LICENSE_CODE=XXXXX
SYNC_DRY_RUN=true
```
إعدادات خاصة بسكريبت `sync-from-supabase.js`.

### ملف `.gitignore`:
```
node_modules
.env
*.db
frontend/dist
```

### ملف `netlify.toml`:
```toml
[build]
  base = "frontend"
  command = "npm install && npm run build"
  publish = "dist"
```

---

## 8. المسارات والتوجيه (Routing)

### واجهة برمجة التطبيقات (API Endpoints):

| المسار | الطريقة | المصادقة | الوصف |
|---|---|---|---|
| `/api/products` | GET/POST | - | قائمة / إنشاء منتجات |
| `/api/products/:id` | GET/PUT/DELETE | - | منتج فردي |
| `/api/categories` | GET/POST | - | قائمة / إنشاء تصنيفات |
| `/api/categories/:id` | GET/PUT/DELETE | - | تصنيف فردي |
| `/api/sales` | GET/POST | - | قائمة / إنشاء مبيعات |
| `/api/sales/:id` | GET | - | فاتورة مع العناصر |
| `/api/customers` | GET/POST | - | قائمة / إنشاء عملاء |
| `/api/customers/:id` | GET/PUT/DELETE | - | عميل فردي |
| `/api/settings` | GET | - | كل الإعدادات (key→value) |
| `/api/settings/all` | GET | - | كل الإعدادات (rows) |
| `/api/settings/upsert` | POST | - | إضافة/تحديث إعداد |
| `/api/settings/batch` | POST | - | إضافة/تحديث مجموعة إعدادات |
| `/api/settings/upload/logo` | POST | - | رفع شعار المتجر |
| `/api/expenses` | GET/POST | - | قائمة / إنشاء مصاريف |
| `/api/expenses/:id` | GET/PUT/DELETE | - | مصروف فردي |
| `/api/notes` | GET/POST | - | قائمة / إنشاء ملاحظات |
| `/api/notes/:id` | GET/PUT/DELETE | - | ملاحظة فردية |
| `/api/notes/:id/read` | PATCH | - | تعليم كمقروء |
| `/api/notes/unread-count` | GET | - | عدد الملاحظات غير المقروءة |
| `/api/reports/summary` | GET | - | ملخص لوحة التحكم |
| `/api/reports/charts` | GET | - | بيانات الرسوم البيانية |
| `/api/reports/analysis` | GET | - | تحليل متقدم |
| `/api/calendar/month` | GET | - | تقويم شهري (خريطة حرارية) |
| `/api/calendar/day` | GET | - | تفاصيل اليوم |
| `/api/backups` | GET/POST | - | قائمة / إنشاء نسخة احتياطية |
| `/api/backups/:id/download` | GET | - | تحميل نسخة احتياطية |
| `/api/backups/restore` | POST | - | استعادة نسخة احتياطية |
| `/api/backups/:filename` | DELETE | - | حذف نسخة احتياطية |
| `/api/license` | GET | - | معلومات الترخيص |
| `/api/setup/status` | GET | - | التحقق من التشغيل الأول |
| `/api/setup/initialize` | POST | - | تهيئة المتجر |

### مسارات الواجهة (Frontend Routes):

| المسار | المكون | الوصف |
|---|---|---|
| `/setup` | `SetupWizard` | معالج الإعداد الأول |
| `/register` | `Register` | تسجيل مستخدم جديد |
| `/forgot-password` | `ForgotPassword` | استعادة كلمة المرور |
| `/` | `Dashboard` | لوحة التحكم الرئيسية |
| `/sales` | `Sales` | نقطة البيع |
| `/sales-log` | `SalesLog` | سجل المبيعات |
| `/calendar` | `SalesCalendar` | تقويم المبيعات |
| `/inventory` | `Inventory` | إدارة المخزون |
| `/customers` | `Customers` | العملاء |
| `/reports` | `Reports` | التقارير |
| `/expenses` | `Expenses` | المصاريف |
| `/barcode` | `Barcode` | الباركود |
| `/print` | `Print` | الطباعة |
| `/settings` | `Settings` | الإعدادات |
| `/notes` | `Notes` | الملاحظات |

---

*تم إعداد هذا الدليل التوثيقي لتوضيح كافة الجوانب البرمجية والهندسية لنظام Parle Noire POS لضمان سهولة الإضافة والتعديل على الكود البرمجي مستقبلاً.*
