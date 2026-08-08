const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const {
  getOverview, deleteNotice, deleteMaterial, removeStudent, getUserInfo, updateRole,
  addFaculty, updateFaculty, deleteFaculty,
  addDepartment, updateDepartment, deleteDepartment,
  addBatch, updateBatch, deleteBatch, reviewRequest
} = require('../controllers/moderatorController');

router.use(authMiddleware);
router.use(requireRole(['university_moderator', 'admin']));

router.get('/overview',             getOverview);
router.get('/users/:userId',        getUserInfo);
router.delete('/notices/:id',       deleteNotice);
router.delete('/materials/:id',     deleteMaterial);
router.delete('/students/:userId',  removeStudent);
router.post('/role-update',         updateRole);
router.post('/requests/review',     reviewRequest);

// Faculty management
router.post('/faculties',           addFaculty);
router.put('/faculties/:id',        updateFaculty);
router.delete('/faculties/:id',     deleteFaculty);

// Dept management
router.post('/departments',         addDepartment);
router.put('/departments/:id',      updateDepartment);
router.delete('/departments/:id',   deleteDepartment);

// Batch management
router.post('/batches',             addBatch);
router.put('/batches/:id',          updateBatch);
router.delete('/batches/:id',       deleteBatch);

module.exports = router;
