const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');

// Serve avatars publicly (they don't contain sensitive data)
router.use('/avatars', express.static(path.join(__dirname, '..', 'uploads', 'avatars')));

// Secure route for all other uploads (task-files, course materials, etc)
router.get('/*', authMiddleware, (req, res) => {
  const uploadsDir = path.normalize(path.join(__dirname, '..', 'uploads'));
  const filePath = path.join(__dirname, '..', 'uploads', req.path);
  const normalizedPath = path.normalize(filePath);

  // Prevent directory traversal attacks before filesystem access
  if (!normalizedPath.startsWith(uploadsDir)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!fs.existsSync(normalizedPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // File exists, is bounded within uploads, and user is authenticated
  res.download(normalizedPath, err => {
    if (err) {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error serving file' });
      }
    }
  });
});

module.exports = router;
