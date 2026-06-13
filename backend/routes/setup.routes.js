const express = require('express');
const setupService = require('../services/setup.service');

var router = express.Router();

router.get('/status', async function (req, res) {
  try {
    var isFirstRun = await setupService.isFirstRun();
    res.json({ success: true, isFirstRun: isFirstRun });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/initialize', async function (req, res) {
  try {
    var config = req.body;

    if (!config || !config.storeName) {
      return res.status(400).json({ success: false, error: 'اسم المتجر مطلوب' });
    }

    var result = await setupService.initializeSetup(config);
    res.json({ success: true, message: 'تم الإعداد بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
