const express = require('express');
const router = express.Router();
const { 
  addTask, toggleTask, deleteTask, archiveTask,
  addComponent, updateComponent, deleteComponent,
  getInstitutions, joinBatch,
  getProfile, updateProfile,
  getMyBatchMembers,
  uploadTaskFile, getTaskFiles, deleteTaskFile,
  uploadAvatar
} = require('../controllers/studentController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate, schemas } = require('../middleware/validate');

const { uploadTaskFile: uploadTaskMiddleware, uploadAvatar: uploadAvatarMiddleware, handleUploadError } = require('../middleware/uploadMiddleware');

// Public hierarchy endpoints
router.get('/institutions', getInstitutions);
router.get('/hierarchy', getInstitutions);

// Protected
router.use(authMiddleware);
router.post('/tasks', validate(schemas.task), addTask);
router.put('/tasks/:id/toggle', toggleTask);
router.delete('/tasks/:id', deleteTask);
router.put('/tasks/:id/archive', archiveTask);
router.post('/tasks/:id/files', uploadTaskMiddleware.single('file'), handleUploadError, uploadTaskFile);
router.get('/tasks/:id/files', getTaskFiles);
router.delete('/tasks/:id/files/:fileId', deleteTaskFile);
router.post('/tasks/:id/upload', uploadTaskMiddleware.single('file'), handleUploadError, uploadTaskFile);

router.post('/components', addComponent);
router.put('/components/:id', updateComponent);
router.delete('/components/:id/enrollment/:enrollmentId', deleteComponent);
router.post('/join-batch', joinBatch);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/batch-members', getMyBatchMembers);

// Avatar upload
router.post('/upload-avatar', uploadAvatarMiddleware.single('avatar'), handleUploadError, uploadAvatar);

module.exports = router;
