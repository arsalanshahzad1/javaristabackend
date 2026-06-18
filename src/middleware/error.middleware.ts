import { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';
import { MongoServerError } from 'mongodb';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { errorResponse } from '../utils/response';

export const errorMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof MongooseError.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    errorResponse(res, 'Validation error', 400, errors);
    return;
  }

  if (err instanceof MongooseError.CastError) {
    errorResponse(res, 'Invalid ID format', 400);
    return;
  }

  if (err instanceof MongoServerError && err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
    errorResponse(res, `${field} already exists`, 409);
    return;
  }

  if (err instanceof TokenExpiredError) {
    errorResponse(res, 'Token has expired', 401);
    return;
  }

  if (err instanceof JsonWebTokenError) {
    errorResponse(res, 'Invalid token', 401);
    return;
  }

  const message =
    err instanceof Error ? err.message : 'Internal Server Error';

  if (process.env.NODE_ENV === 'development' && err instanceof Error) {
    console.error(err.stack);
  }

  errorResponse(res, message, 500);
};
