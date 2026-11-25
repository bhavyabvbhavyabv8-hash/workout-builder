export function notFoundHandler(req, res, next) {
  res.status(404);
  next(new Error(`Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error, req, res, next) {
  const statusCode = res.statusCode >= 400 ? res.statusCode : 500;

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    error: {
      message: error.message || 'Internal server error'
    }
  });
}
