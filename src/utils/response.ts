import { Response } from 'express';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const successResponse = (
  res: Response,
  message: string,
  data: unknown = null,
  statusCode: number = 200,
  pagination?: Pagination
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(pagination && { pagination }),
  });
};

export const errorResponse = (
  res: Response,
  message: string,
  statusCode: number = 400,
  errors: unknown[] = []
): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};
