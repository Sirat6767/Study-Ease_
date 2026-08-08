const express = require('express');
const router = express.Router();
const { getInstitutions } = require('../controllers/studentController');
const { getFacultiesByUniversity, getDepartmentsByFaculty, getBatchesByDepartment } = require('../controllers/adminController');

router.get('/hierarchy', getInstitutions);
router.get('/universities/:id/faculties', getFacultiesByUniversity);
router.get('/faculties/:id/departments', getDepartmentsByFaculty);
router.get('/departments/:id/batches', getBatchesByDepartment);

module.exports = router;
