const express = require('express');
const router = express.Router();
const { listRequests, reviewRequest, addCourse, updateCourse, deleteCourse, addExam, updateExam, deleteExam, addNotice, updateNotice, deleteNotice, getBatchData, getBatchMembers } = require('../controllers/crController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const { validate, schemas } = require('../middleware/validate');

router.use(authMiddleware);
router.use(requireRole('cr'));
router.get('/batch-data', getBatchData);
router.get('/batch-members', getBatchMembers);
router.get('/requests', listRequests);
router.post('/requests/review', reviewRequest);
router.delete('/students/:studentId', require('../controllers/crController').removeStudent);

router.post('/courses', validate(schemas.course), addCourse);
router.put('/courses/:id', validate(schemas.course), updateCourse);
router.delete('/courses/:id', deleteCourse);

const { uploadMaterial, handleUploadError } = require('../middleware/uploadMiddleware');

router.post('/courses/:courseId/materials', uploadMaterial.single('file'), handleUploadError, require('../controllers/crController').addCourseMaterial);
router.delete('/materials/:id', require('../controllers/crController').deleteCourseMaterial);

router.post('/exams', validate(schemas.exam), addExam);
router.put('/exams/:id', validate(schemas.exam), updateExam);
router.delete('/exams/:id', deleteExam);

router.post('/notices', validate(schemas.notice), addNotice);
router.put('/notices/:id', validate(schemas.notice), updateNotice);
router.delete('/notices/:id', deleteNotice);

module.exports = router;
