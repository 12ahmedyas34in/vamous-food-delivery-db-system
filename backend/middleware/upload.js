// backend/middleware/upload.js
//
// Multer configuration for image uploads.
// Files are held in memory as Buffer objects — no disk writes.
// This is safe on Render (ephemeral filesystem) and works directly
// with Cloudinary's upload_stream API.

const multer = require('multer');
const { errorResponse } = require('../utils/response');

const ALLOWED_MIME_TYPES  = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
    }
  },
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

// Multer errors don't propagate through Express's next(err) automatically.
// This wrapper catches them and returns standardized error responses
// before the upload controller is ever reached.
const handleUploadError = (middleware) => (req, res, next) => {
  middleware(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return errorResponse(res, `Image must be smaller than ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`, 400);
    }
    if (err.message.includes('Only JPEG')) {
      return errorResponse(res, err.message, 400);
    }
    // Unexpected multer error — let global errorHandler log it
    next(err);
  });
};

// Exported as a single middleware — field name must be 'image'
const uploadSingle = handleUploadError(upload.single('image'));

module.exports = { uploadSingle };
