const express = require('express');
const router = express.Router();
const { listRequests, reviewRequest, addCourse, updateCourse, deleteCourse, addExam, updateExam, deleteExam, addNotice, updateNotice, deleteNotice, getBatchData, getBatchMembers } = require('../controllers/crController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/batch-data', getBatchData);
router.get('/batch-members', getBatchMembers);
router.get('/requests', listRequests);
router.post('/requests/review', reviewRequest);
router.delete('/students/:studentId', require('../controllers/crController').removeStudent);

router.post('/courses', addCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);

router.post('/exams', addExam);
router.put('/exams/:id', updateExam);
router.delete('/exams/:id', deleteExam);

router.post('/notices', addNotice);
router.put('/notices/:id', updateNotice);
router.delete('/notices/:id', deleteNotice);

module.exports = router;
