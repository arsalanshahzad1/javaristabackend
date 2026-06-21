import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      errorResponse(res, 'Access denied', 403);
      return;
    }
    next();
  };
};
