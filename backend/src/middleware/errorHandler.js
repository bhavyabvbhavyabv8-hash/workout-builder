import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';

export function notFoundHandler(req, res, next) {
  res.status(404);
  next(new AppError(404, 'not_found', `Route not found: ${req.method} ${req.path}`));
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = 500;
  let code = 'internal_error';
  let message = 'Internal server error.';
  let details;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = 'validation_error';
    message = 'Request data is invalid.';
  } else if (error?.code === 11000) {
    statusCode = 409;
    code = 'conflict';
    message = 'A record with the supplied unique value already exists.';
  } else if (error?.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'invalid_json';
    message = 'Request body contains invalid JSON.';
  } else if (error?.status === 413) {
    statusCode = 413;
    code = 'payload_too_large';
    message = 'Request body is too large.';
  } else if (error?.status === 403 && error?.message === 'Not allowed by CORS') {
    statusCode = 403;
    code = 'forbidden_origin';
    message = 'Request origin is not allowed.';
  }

  if (statusCode >= 500) {
    console.error(error);
  }

  const response = { error: { code, message } };
  if (details) response.error.details = details;
  res.status(statusCode).json(response);
  return undefined;
}
