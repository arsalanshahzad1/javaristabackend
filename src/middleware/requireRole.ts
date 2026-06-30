import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';
import type { UserRole } from '../models/User';

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role as UserRole)) {
      errorResponse(res, 'Access denied', 403);
      return;
    }
    next();
  };
};
