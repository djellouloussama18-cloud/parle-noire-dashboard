const express = require('express');
const { getDb, saveDb } = require('../database/db');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `product-${Date.now()}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

router.get('/', async (req, res) => {
  try {
    console.log('[products.GET] Fetching products...');
    const db = await getDb();
    const stmt = db.prepare(`
      SELECT p.*, c.name_ar as category_name_ar, c.name_en as category_name_en
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.user_id = ?
      ORDER BY p.id DESC
    `);
    stmt.bind(['default']);
    const products = [];
    while (stmt.step()) products.push(stmt.getAsObject());
    stmt.free();
    console.log('[products.GET] Found', products.length, 'products');
    res.json(products);
  } catch (err) {
    console.error('[products.GET] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    console.log('[products.GET/:id] Fetching product', req.params.id);
    const db = await getDb();
    const stmt = db.prepare(`
      SELECT p.*, c.name_ar as category_name_ar, c.name_en as category_name_en
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? AND p.user_id = ?
    `);
    stmt.bind([req.params.id, 'default']);
    let product = null;
    if (stmt.step()) product = stmt.getAsObject();
    stmt.free();
    if (!product) {
      console.log('[products.GET/:id] Product not found');
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error('[products.GET/:id] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (req.body.id !== undefined) {
      console.log('[products.POST] Rejecting POST with id:', req.body.id);
      return res.status(400).json({ success: false, error: 'Use PUT to update an existing product' });
    }
    console.log('[products.POST] Request body:', req.body);
    const {
      name_ar, name_en, category_id, barcode, sku,
      purchase_price, sale_price, quantity, min_quantity, description
    } = req.body;

    let image_url = null;
    if (req.file) {
      image_url = `/uploads/products/${req.file.filename}`;
      console.log('[products.POST] Image uploaded:', image_url);
    }

    const db = await getDb();
    console.log('[products.POST] Inserting product...');
    db.run(
      `INSERT INTO products (
        name_ar, name_en, category_id, barcode, sku,
        purchase_price, sale_price, quantity, min_quantity,
        image_url, description, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name_ar || null, name_en || null, category_id || null, barcode || null, sku || null,
        purchase_price || 0, sale_price || 0, quantity || 0, min_quantity || 0,
        image_url, description || null, 'default'
      ]
    );
    const rowidResult = db.exec("SELECT last_insert_rowid() AS id");
    const newId = Number(rowidResult[0].values[0][0]);
    console.log('[products.POST] Product inserted, ID:', newId);

    const readStmt = db.prepare('SELECT * FROM products WHERE id = ?');
    readStmt.bind([newId]);
    const inserted = readStmt.getAsObject();
    readStmt.free();

    console.log('[products.POST] Sending success response before saveDb');
    res.status(201).json({ success: true, data: inserted, message: 'تمت الإضافة بنجاح' });

    setImmediate(() => {
      try {
        saveDb();
        console.log('[products.POST] Database saved to disk');
      } catch (e) {
        console.error('[products.POST] Save failed (data is in memory):', e.message);
      }
    });
  } catch (err) {
    console.error('[products.POST] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    console.log('[products.PUT] Updating product', req.params.id, 'body:', req.body);
    const {
      name_ar, name_en, category_id, barcode, sku,
      purchase_price, sale_price, quantity, min_quantity, description
    } = req.body;

    const db = await getDb();

    const stmt = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?');
    stmt.bind([req.params.id, 'default']);
    let existing = null;
    if (stmt.step()) existing = stmt.getAsObject();
    stmt.free();
    if (!existing) {
      console.log('[products.PUT] Product not found');
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    let image_url = existing.image_url;
    if (req.file) {
      // Delete old image file when replacing
      if (existing.image_url) {
        const oldPath = path.join(uploadsDir, path.basename(existing.image_url));
        try { fs.unlinkSync(oldPath); } catch (e) { /* file may not exist */ }
      }
      image_url = `/uploads/products/${req.file.filename}`;
      console.log('[products.PUT] Image uploaded:', image_url);
    } else if (req.body.image_url === '' || req.body.image_url === null) {
      // Explicitly removing the image
      if (existing.image_url) {
        const oldPath = path.join(uploadsDir, path.basename(existing.image_url));
        try { fs.unlinkSync(oldPath); } catch (e) { /* file may not exist */ }
      }
      image_url = '';
    }

    const mergedNameAr = name_ar ?? existing.name_ar;
    const mergedNameEn = name_en ?? existing.name_en;
    const mergedCategoryId = category_id ?? existing.category_id;
    const mergedBarcode = barcode ?? existing.barcode;
    const mergedSku = sku ?? existing.sku;
    const mergedPurchasePrice = purchase_price ?? existing.purchase_price;
    const mergedSalePrice = sale_price ?? existing.sale_price;
    const mergedQuantity = quantity ?? existing.quantity;
    const mergedMinQuantity = min_quantity ?? existing.min_quantity;
    const mergedDescription = description ?? existing.description;

    console.log('[products.PUT] Updating product in DB...');
    db.run(
      `UPDATE products SET
        name_ar = ?, name_en = ?, category_id = ?, barcode = ?, sku = ?,
        purchase_price = ?, sale_price = ?, quantity = ?, min_quantity = ?,
        image_url = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?`,
      [
        mergedNameAr, mergedNameEn, mergedCategoryId, mergedBarcode, mergedSku,
        mergedPurchasePrice, mergedSalePrice, mergedQuantity, mergedMinQuantity,
        image_url, mergedDescription, req.params.id, 'default'
      ]
    );

    const responseData = {
      id: Number(req.params.id),
      name_ar: mergedNameAr,
      name_en: mergedNameEn,
      category_id: mergedCategoryId,
      barcode: mergedBarcode,
      sku: mergedSku,
      purchase_price: mergedPurchasePrice,
      sale_price: mergedSalePrice,
      quantity: mergedQuantity,
      min_quantity: mergedMinQuantity,
      image_url: image_url || '',
      description: mergedDescription,
      user_id: 'default'
    };

    console.log('[products.PUT] Sending success response before saveDb');
    res.json({ success: true, data: responseData, message: 'تم التحديث بنجاح' });

    setImmediate(() => {
      try {
        saveDb();
        console.log('[products.PUT] Database saved to disk');
      } catch (e) {
        console.error('[products.PUT] Save failed (data is in memory):', e.message);
      }
    });
  } catch (err) {
    console.error('[products.PUT] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

router.delete('/:id', async (req, res) => {
  try {
    console.log('[products.DELETE] Deleting product', req.params.id);
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?');
    stmt.bind([req.params.id, 'default']);
    let product = null;
    if (stmt.step()) product = stmt.getAsObject();
    stmt.free();
    if (!product) {
      console.log('[products.DELETE] Product not found');
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Delete product image file from disk
    if (product.image_url) {
      const oldPath = path.join(uploadsDir, path.basename(product.image_url));
      try { fs.unlinkSync(oldPath); } catch (e) { /* file may not exist */ }
    }

    db.run('DELETE FROM products WHERE id = ? AND user_id = ?', [req.params.id, 'default']);

    console.log('[products.DELETE] Sending success response before saveDb');
    res.json({ success: true, data: { id: Number(req.params.id) }, message: 'تم الحذف بنجاح' });

    setImmediate(() => {
      try {
        saveDb();
        console.log('[products.DELETE] Database saved to disk');
      } catch (e) {
        console.error('[products.DELETE] Save failed (data is in memory):', e.message);
      }
    });
  } catch (err) {
    console.error('[products.DELETE] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

module.exports = router;
