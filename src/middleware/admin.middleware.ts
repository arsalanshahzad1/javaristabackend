import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';

export const adminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin') {
    errorResponse(res, 'Admin access required', 403);
    return;
  }
  next();
};
