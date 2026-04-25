const express = require('express');
const { upload } = require('../middleware/upload');
const { sendEmail } = require('../controllers/emailController');

const router = express.Router();

// Accepts both multipart/form-data (with optional "images[]" up to 4)
// and application/json (which falls back to the historyId lookup).
router.post('/', upload.array('images', 4), sendEmail);

module.exports = router;
