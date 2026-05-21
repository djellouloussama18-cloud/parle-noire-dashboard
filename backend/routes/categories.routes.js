const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categories.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/', authMiddleware, categoriesController.getCategories);
router.post('/', authMiddleware, categoriesController.createCategory);
router.put('/:id', authMiddleware, categoriesController.updateCategory);
router.delete('/:id', authMiddleware, categoriesController.deleteCategory);

module.exports = router;
