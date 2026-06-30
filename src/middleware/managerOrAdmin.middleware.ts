import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';

const MANAGER_OR_ABOVE: string[] = [
  'owner',
  'ceo',
  'coo',
  'cfo',
  'regional_manager',
  'area_manager',
  'store_manager',
  'assistant_manager',
  'hr_manager',
  'marketing_manager',
];

/** Allows store_manager and above. Must run after authMiddleware. */
export const managerOrAdminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const role = req.user?.role;
  if (!role || !MANAGER_OR_ABOVE.includes(role)) {
    errorResponse(res, 'Manager or admin access required', 403);
    return;
  }
  next();
};
