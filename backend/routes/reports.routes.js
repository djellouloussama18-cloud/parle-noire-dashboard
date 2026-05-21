const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/summary', authMiddleware, reportsController.getSummary);
router.get('/charts', authMiddleware, reportsController.getCharts);
router.get('/export', authMiddleware, reportsController.exportPDF);

module.exports = router;
