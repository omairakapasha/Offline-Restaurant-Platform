import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Global error handling middleware
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.statusCode} - ${err.message}`);
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: 'Invalid request data',
      details: err.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  // Body-parser / http-errors carry a numeric status (e.g. malformed JSON → 400).
  // Honor it instead of masking these client errors as 500s.
  const httpStatus = (err as { status?: number; statusCode?: number }).status
    ?? (err as { status?: number; statusCode?: number }).statusCode;
  if (typeof httpStatus === 'number' && httpStatus >= 400 && httpStatus < 500) {
    const isParse = (err as { type?: string }).type === 'entity.parse.failed';
    return res.status(httpStatus).json({ error: isParse ? 'Invalid JSON body' : (err.message || 'Bad request') });
  }

  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

/**
 * Async route wrapper to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => unknown
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
