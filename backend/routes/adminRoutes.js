const express = require('express');
const router = express.Router();
const {
  overview, updateRole, addUniversity, updateUniversity, deleteUniversity, getUserInfo,
  addFaculty, updateFaculty, deleteFaculty,
  addDepartment, updateDepartment, deleteDepartment,
  addBatch, updateBatch, deleteBatch,
  getFacultiesByUniversity, getDepartmentsByFaculty, getBatchesByDepartment
} = require('../controllers/adminController');

const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/overview', overview);
router.post('/role-update', updateRole);

router.post('/universities', addUniversity);
router.put('/universities/:id', updateUniversity);
router.delete('/universities/:id', deleteUniversity);

router.post('/faculties', addFaculty);
router.put('/faculties/:id', updateFaculty);
router.delete('/faculties/:id', deleteFaculty);

router.post('/departments', addDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

router.post('/batches', addBatch);
router.put('/batches/:id', updateBatch);
router.delete('/batches/:id', deleteBatch);

router.get('/users/:id', getUserInfo);

// RESTful nested routes
router.get('/universities/:id/faculties', getFacultiesByUniversity);
router.get('/faculties/:id/departments', getDepartmentsByFaculty);
router.get('/departments/:id/batches', getBatchesByDepartment);

module.exports = router;
