const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/', authMiddleware, salesController.getSales);
router.post('/', authMiddleware, salesController.createSale);

module.exports = router;
