const express = require('express');
const router = express.Router();
const { bootstrap, register } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', register);
router.get('/bootstrap', authMiddleware, bootstrap);

module.exports = router;
