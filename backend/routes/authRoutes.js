const express = require('express');
const router = express.Router();
const { bootstrap, register } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const rateLimit = require('express-rate-limit');

// ── TASK 1: Configurable Authentication Rate Limiter ────────────────────────
const authLimiter = rateLimit({
  windowMs: (parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000, // 15 mins default
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 15, // 15 requests max per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Too many authentication attempts. Please try again later.'
  }
});

router.post('/register', authLimiter, register);
router.get('/bootstrap', authMiddleware, bootstrap);

module.exports = router;
