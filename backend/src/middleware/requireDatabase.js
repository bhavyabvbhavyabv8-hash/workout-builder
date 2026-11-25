import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';

export default function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return next(new AppError(503, 'database_unavailable', 'Database is not connected.'));
  }

  return next();
}
