const express = require('express');
const router = express.Router();
const productsController = require('../controllers/products.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/', authMiddleware, productsController.getProducts);
router.post('/', authMiddleware, productsController.createProduct);
router.put('/:id', authMiddleware, productsController.updateProduct);
router.delete('/:id', authMiddleware, productsController.deleteProduct);

module.exports = router;
