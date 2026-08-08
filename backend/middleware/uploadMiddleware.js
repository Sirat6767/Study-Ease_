const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure destination directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const uploadsBaseDir = path.join(__dirname, '..', 'uploads');

// Dangerous extensions to reject immediately
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.sh', '.bat', '.cmd', '.js', '.vbs', '.ps1',
  '.php', '.py', '.pl', '.rb', '.cgi', '.html', '.htm',
  '.svg', '.dll', '.bin', '.msi', '.jar', '.com'
]);

// Sanitize filename to prevent header injection or filesystem weirdness
const sanitizeFilename = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const nameWithoutExt = path.basename(filename, ext);
  const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
  return `${cleanName}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
};

// Generic file filter enforcing extension safety
const fileFilter = (allowedExtensions) => (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return cb(new Error(`Security block: Files with extension '${ext}' are not permitted.`));
  }

  if (allowedExtensions && allowedExtensions.length > 0) {
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error(`Invalid file type. Allowed extensions: ${allowedExtensions.join(', ')}`));
    }
  }

  cb(null, true);
};

// 1. Course Material Storage & Upload Config (50 MB limit)
const materialStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDir(uploadsBaseDir);
    cb(null, uploadsBaseDir);
  },
  filename: (req, file, cb) => {
    cb(null, sanitizeFilename(file.originalname));
  }
});

const uploadMaterial = multer({
  storage: materialStorage,
  limits: { fileSize: parseInt(process.env.MAX_MATERIAL_FILE_SIZE_BYTES) || 50 * 1024 * 1024 }, // 50MB
  fileFilter: fileFilter(['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.zip', '.rar', '.jpg', '.jpeg', '.png', '.webp'])
});

// 2. Task File Storage & Upload Config (20 MB limit)
const taskDir = path.join(uploadsBaseDir, 'task-files');
const taskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDir(taskDir);
    cb(null, taskDir);
  },
  filename: (req, file, cb) => {
    cb(null, sanitizeFilename(file.originalname));
  }
});

const uploadTaskFile = multer({
  storage: taskStorage,
  limits: { fileSize: parseInt(process.env.MAX_TASK_FILE_SIZE_BYTES) || 20 * 1024 * 1024 }, // 20MB
  fileFilter: fileFilter(['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.zip', '.rar', '.jpg', '.jpeg', '.png', '.webp'])
});

// 3. Avatar Storage & Upload Config (5 MB limit)
const avatarDir = path.join(uploadsBaseDir, 'avatars');
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDir(avatarDir);
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    cb(null, sanitizeFilename(file.originalname));
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: parseInt(process.env.MAX_AVATAR_FILE_SIZE_BYTES) || 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter(['.jpg', '.jpeg', '.png', '.webp'])
});

// Express error handler middleware for Multer errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ ok: false, error: 'File size exceeds maximum allowed limit.' });
    }
    return res.status(400).json({ ok: false, error: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
  next();
};

module.exports = {
  uploadMaterial,
  uploadTaskFile,
  uploadAvatar,
  handleUploadError
};
