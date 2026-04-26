const express = require('express');
const router = express.Router();
const { overview, updateRole, addUniversity, updateUniversity, deleteUniversity, getUserInfo, addDepartment, updateDepartment, deleteDepartment, addBatch, updateBatch, deleteBatch } = require('../controllers/adminController');

const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/overview', overview);
router.post('/role-update', updateRole);
router.post('/universities', addUniversity);
router.put('/universities/:id', updateUniversity);
router.delete('/universities/:id', deleteUniversity);
router.get('/users/:id', getUserInfo);

router.post('/departments', addDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

router.post('/batches', addBatch);
router.put('/batches/:id', updateBatch);
router.delete('/batches/:id', deleteBatch);

module.exports = router;
