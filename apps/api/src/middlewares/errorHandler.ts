import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../lib/errors';
import { config } from '../config';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // 1. Handled Operational Application Errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.constructor.name,
      message: err.message,
    });
    return;
  }

  // 2. Zod Validation Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid request input',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // 3. Prisma Database Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[]) || [];
        res.status(409).json({
          error: 'ConflictError',
          message: `Unique constraint violated on field(s): ${target.join(', ')}`,
          fields: target,
        });
        return;
      }
      case 'P2025': {
        res.status(404).json({
          error: 'NotFoundError',
          message: 'The requested database record was not found',
        });
        return;
      }
      case 'P2003': {
        res.status(400).json({
          error: 'ForeignKeyConstraintError',
          message: 'Foreign key constraint violated: referenced entity does not exist or is protected',
        });
        return;
      }
      default:
        break;
    }
  }

  // 4. Malformed JSON Body Error
  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    res.status(400).json({
      error: 'MalformedJsonError',
      message: 'Request body contains invalid JSON syntax',
    });
    return;
  }

  // 5. Unhandled / Unexpected Errors
  console.error('💥 Unhandled Internal Error:', err);
  res.status(500).json({
    error: 'InternalServerError',
    message: config.NODE_ENV === 'production' ? 'An unexpected server error occurred' : (err as Error)?.message || 'Unknown error',
  });
}
