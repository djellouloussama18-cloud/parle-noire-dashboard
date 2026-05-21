const fs = require('fs');
const path = require('path');
const db = require('../database/db');

const saveBase64Image = (base64Str) => {
  if (!base64Str || !base64Str.startsWith('data:image/')) {
    return base64Str;
  }

  try {
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const matches = base64Str.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64Str;
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');

    const filename = `product-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}.${ext}`;
    const filepath = path.join(uploadsDir, filename);

    fs.writeFileSync(filepath, buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Error saving base64 image:', err);
    return base64Str;
  }
};

const deleteProductImage = (imageUrl) => {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) {
    return;
  }
  try {
    const filename = imageUrl.replace('/uploads/', '');
    const filepath = path.join(__dirname, '../uploads', filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (err) {
    console.error('Error deleting image file:', err);
  }
};

exports.getProducts = (req, res, next) => {
  try {
    const list = db.prepare('SELECT * FROM products WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
    return res.json(list);
  } catch (err) {
    next(err);
  }
};

exports.createProduct = (req, res, next) => {
  try {
    const {
      name_ar,
      name_en,
      category_id,
      barcode,
      sku,
      purchase_price,
      sale_price,
      quantity,
      min_quantity,
      image_url,
      description
    } = req.body;

    if (!name_ar || !sale_price) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'اسم المنتج والرمز وسعر البيع مطلوبون' });
    }

    // Generate automatic barcode if not supplied
    let finalBarcode = barcode;
    if (!finalBarcode) {
      finalBarcode = '622' + Date.now().toString().slice(-10);
    }

    // Generate automatic SKU if not supplied
    let finalSku = sku;
    if (!finalSku) {
      finalSku = 'SKU-' + Math.floor(100000 + Math.random() * 900000).toString();
    }

    const info = db.prepare(`
      INSERT INTO products (
        name_ar, name_en, category_id, barcode, sku,
        purchase_price, sale_price, quantity, min_quantity,
        image_url, description, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name_ar,
      name_en || null,
      category_id ? parseInt(category_id, 10) : null,
      finalBarcode,
      finalSku,
      purchase_price ? parseFloat(purchase_price) : 0,
      parseFloat(sale_price),
      quantity ? parseInt(quantity, 10) : 0,
      min_quantity ? parseInt(min_quantity, 10) : 5,
      image_url ? saveBase64Image(image_url) : '',
      description || '',
      req.user.id
    );

    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
    return res.status(201).json(newProduct);
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name_ar,
      name_en,
      category_id,
      barcode,
      sku,
      purchase_price,
      sale_price,
      quantity,
      min_quantity,
      image_url,
      description
    } = req.body;

    if (!name_ar || !sale_price) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'اسم المنتج وسعر البيع مطلوبون' });
    }

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'المنتج غير موجود' });
    }
    if (existing.user_id && existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'ليس لديك صلاحية لتعديل هذا المنتج' });
    }

    let finalImageUrl = existing.image_url;
    if (image_url !== undefined) {
      if (image_url !== existing.image_url) {
        if (existing.image_url && existing.image_url.startsWith('/uploads/')) {
          deleteProductImage(existing.image_url);
        }
        finalImageUrl = saveBase64Image(image_url);
      }
    }

    db.prepare(`
      UPDATE products SET
        name_ar = ?, name_en = ?, category_id = ?, barcode = ?, sku = ?,
        purchase_price = ?, sale_price = ?, quantity = ?, min_quantity = ?,
        image_url = ?, description = ?
      WHERE id = ?
    `).run(
      name_ar,
      name_en || null,
      category_id ? parseInt(category_id, 10) : null,
      barcode || existing.barcode,
      sku || existing.sku,
      purchase_price ? parseFloat(purchase_price) : 0,
      parseFloat(sale_price),
      quantity !== undefined ? parseInt(quantity, 10) : existing.quantity,
      min_quantity !== undefined ? parseInt(min_quantity, 10) : existing.min_quantity,
      finalImageUrl,
      description !== undefined ? description : existing.description,
      id
    );

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'المنتج غير موجود' });
    }
    if (existing.user_id && existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'ليس لديك صلاحية لحذف هذا المنتج' });
    }

    if (existing.image_url && existing.image_url.startsWith('/uploads/')) {
      deleteProductImage(existing.image_url);
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return res.json({ message: 'تم حذف المنتج بنجاح' });
  } catch (err) {
    next(err);
  }
};
