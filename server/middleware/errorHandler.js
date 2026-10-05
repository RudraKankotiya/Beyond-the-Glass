import { deleteRequestFiles } from '../utils/files.js';

// Runs when no route matched the request
export const notFound = (req, res, next) => {
  const error = new Error(`Not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Global error handler - Express recognises it by its 4 arguments.
// Every error thrown in a route/controller ends up here, so responses stay consistent.
// (Express 5 also forwards errors from async handlers automatically.)
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Server error';

  // The request failed, so any files multer saved for it are no longer needed
  deleteRequestFiles(req);

  // Upload problems reported by multer (file too large, unexpected field, ...)
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'File is too large (max 25MB)';
    if (err.code === 'LIMIT_UNEXPECTED_FILE') message = `Unexpected file field: ${err.field}`;
  }

  // Invalid MongoDB ObjectId, e.g. /api/artifacts/not-an-id
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Mongoose schema validation failed
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  // Unique index violation, e.g. an email that is already registered
  if (err.code === 11000) {
    statusCode = 409;
    message = `Duplicate value for: ${Object.keys(err.keyValue).join(', ')}`;
  }

  // Unexpected bugs: log them, and don't leak internal details to users in production
  if (statusCode >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') message = 'Server error';
  }

  res.status(statusCode).json({
    message,
    // Only expose the stack trace while developing
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
