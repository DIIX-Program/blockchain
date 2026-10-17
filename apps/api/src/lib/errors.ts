/**
 * Base class for operational, application-level errors.
 *
 * The global error handler (`middlewares/errorHandler.ts`) checks
 * `instanceof AppError` to decide whether to map the error to a known
 * HTTP status code (operational) vs. return a 500 (unexpected).
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    // Maintain proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 400 Bad Request — invalid client input that passed the transport layer. */
export class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

/** 401 Unauthorized — missing/invalid credentials or token. */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

/** 403 Forbidden — authenticated but insufficient privileges. */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

/** 404 Not Found — referenced resource does not exist. */
export class NotFoundError extends AppError {
  constructor(message = 'Not Found') {
    super(message, 404);
  }
}

/** 409 Conflict — duplicate/violates a uniqueness constraint. */
export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}
