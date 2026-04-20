const express = require('express');
const { upload } = require('../middleware/upload');
const { analyze } = require('../controllers/analyzeController');

const router = express.Router();

router.post('/', upload.single('image'), analyze);

module.exports = router;
