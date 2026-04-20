const express = require('express');
const { list, get } = require('../controllers/historyController');
const { resend } = require('../controllers/emailController');

const router = express.Router();

router.get('/', list);
router.get('/:id', get);
router.post('/:id/resend', resend);

module.exports = router;
