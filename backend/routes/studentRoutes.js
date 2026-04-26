const express = require('express');
const router = express.Router();
const { 
  addTask, toggleTask, deleteTask, 
  addComponent, updateComponent, deleteComponent,
  getInstitutions, joinBatch,
  getProfile, updateProfile,
  getMyBatchMembers
} = require('../controllers/studentController');
const authMiddleware = require('../middleware/authMiddleware');

// Public
router.get('/institutions', getInstitutions);

// Protected
router.use(authMiddleware);
router.post('/tasks', addTask);
router.put('/tasks/:id/toggle', toggleTask);
router.delete('/tasks/:id', deleteTask);
router.post('/components', addComponent);
router.put('/components/:id', updateComponent);
router.delete('/components/:id/enrollment/:enrollmentId', deleteComponent);
router.post('/join-batch', joinBatch);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/batch-members', getMyBatchMembers);

module.exports = router;
