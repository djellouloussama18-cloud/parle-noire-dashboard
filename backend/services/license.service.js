const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const os = require('os');

var MASTER_KEY = 'pn-pos-2026-master-key-do-not-share';
var LICENSE_FILE = path.join(__dirname, '..', '..', 'license.dat');
var SERIAL_CACHE = null;

var SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function pad(n) {
  return String(n).padStart(2, '0');
}

function encrypt(text) {
  var key = crypto.createHash('sha256').update(MASTER_KEY).digest();
  var iv = crypto.randomBytes(16);
  var cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  var encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData) {
  var parts = encryptedData.split(':');
  if (parts.length !== 2) throw new Error('Invalid encrypted data format');
  var key = crypto.createHash('sha256').update(MASTER_KEY).digest();
  var iv = Buffer.from(parts[0], 'hex');
  var encrypted = parts[1];
  var decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  var decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function generateSerial() {
  var result = 'PN-';
  for (var g = 0; g < 3; g++) {
    if (g > 0) result += '-';
    for (var i = 0; i < 4; i++) {
      result += SAFE_CHARS.charAt(Math.floor(Math.random() * SAFE_CHARS.length));
    }
  }
  return result;
}

function getSerial() {
  if (SERIAL_CACHE) return SERIAL_CACHE;

  if (fs.existsSync(LICENSE_FILE)) {
    try {
      var data = fs.readFileSync(LICENSE_FILE, 'utf8').trim();
      var serial = decrypt(data);
      if (validateSerial(serial)) {
        SERIAL_CACHE = serial;
        return serial;
      }
    } catch (e) {
      console.error('[License] فشل قراءة ملف الترخيص:', e.message);
    }
  }

  var serial = generateSerial();
  try {
    saveSerial(serial);
    SERIAL_CACHE = serial;
  } catch (e) {
    console.error('[License] فشل حفظ ملف الترخيص:', e.message);
  }
  return serial;
}

function saveSerial(serial) {
  var encrypted = encrypt(serial);
  fs.writeFileSync(LICENSE_FILE, encrypted, 'utf8');
  SERIAL_CACHE = serial;
}

function validateSerial(serial) {
  if (!serial || typeof serial !== 'string') return false;
  var pattern = /^PN-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
  if (!pattern.test(serial)) return false;
  if (!fs.existsSync(LICENSE_FILE)) return false;
  try {
    var data = fs.readFileSync(LICENSE_FILE, 'utf8').trim();
    var decrypted = decrypt(data);
    return decrypted === serial;
  } catch (e) {
    return false;
  }
}

function getMachineFingerprint() {
  var raw = os.hostname() + '-' + os.cpus()[0].model + '-' + os.totalmem();
  var hash = crypto.createHash('sha256').update(raw).digest('hex');
  return hash.substring(0, 16);
}

module.exports = {
  generateSerial: generateSerial,
  getSerial: getSerial,
  saveSerial: saveSerial,
  validateSerial: validateSerial,
  getMachineFingerprint: getMachineFingerprint
};
