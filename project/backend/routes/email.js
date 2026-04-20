const express = require('express');
const { upload } = require('../middleware/upload');
const { sendEmail } = require('../controllers/emailController');

const router = express.Router();

// Accepts both multipart/form-data (with optional "image") and application/json
router.post('/', upload.single('image'), sendEmail);

module.exports = router;
