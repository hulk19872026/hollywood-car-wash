const express = require('express');
const { upload } = require('../middleware/upload');
const { analyze } = require('../controllers/analyzeController');

const router = express.Router();

router.post('/', upload.array('images', 4), analyze);

module.exports = router;
