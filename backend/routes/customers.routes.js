const express = require('express');
const router = express.Router();
const customersController = require('../controllers/customers.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/', authMiddleware, customersController.getCustomers);
router.post('/', authMiddleware, customersController.createCustomer);
router.put('/:id', authMiddleware, customersController.updateCustomer);
router.delete('/:id', authMiddleware, customersController.deleteCustomer);

module.exports = router;
