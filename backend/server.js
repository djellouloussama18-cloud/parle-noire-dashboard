require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const runMigrations = require('./database/migrations');
const errorHandler = require('./middleware/errorHandler');
const { generateAllSystemNotes } = require('./services/noteGenerator.service');

const authRoutes = require('./routes/auth.routes');
const productsRoutes = require('./routes/products.routes');
const categoriesRoutes = require('./routes/categories.routes');
const salesRoutes = require('./routes/sales.routes');
const reportsRoutes = require('./routes/reports.routes');
const backupRoutes = require('./routes/backup.routes');
const aiRoutes = require('./routes/ai.routes');
const settingsRoutes = require('./routes/settings.routes');
const customersRoutes = require('./routes/customers.routes');
const notesRoutes = require('./routes/notes.routes');

// 1. Run migrations to initialize DB structures
runMigrations();

// 2. Generate system notes on startup
generateAllSystemNotes();

const app = express();
const PORT = process.env.PORT || 3001;

// 2. Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 3. Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 4. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/notes', notesRoutes);

// Test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

// 5. Global Error Handling
app.use(errorHandler);

// 6. Listen
app.listen(PORT, () => {
  console.log(`🚀 POS backend server running on http://localhost:${PORT}`);
});
