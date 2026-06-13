const express = require('express');
const licenseService = require('../services/license.service');

var router = express.Router();

router.get('/', function (req, res) {
  try {
    var serial = licenseService.getSerial();
    var fingerprint = licenseService.getMachineFingerprint();
    res.json({
      success: true,
      serial: serial,
      fingerprint: fingerprint,
      activatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
