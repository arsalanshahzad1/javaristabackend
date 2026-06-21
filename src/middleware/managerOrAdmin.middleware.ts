import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';

/** Allows users with role 'admin' or 'manager'. Must run after authMiddleware. */
export const managerOrAdminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const role = req.user?.role;
  if (role !== 'admin' && role !== 'manager') {
    errorResponse(res, 'Manager or admin access required', 403);
    return;
  }
  next();
};
