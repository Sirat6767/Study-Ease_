const express = require('express');
const router  = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getMessages, sendMessage, getCRInbox, getCRInfo } = require('../controllers/chatController');

router.use(authMiddleware);

// CR inbox — who has talked to the CR?
router.get('/:batchId/inbox', getCRInbox);

// Get CR info for UI header
router.get('/:batchId/cr-info', getCRInfo);

// Get thread between current user and otherId
router.get('/:batchId/:otherId', getMessages);

// Send a message
router.post('/:batchId', sendMessage);

module.exports = router;
