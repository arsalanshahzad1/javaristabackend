import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';
import User from '../models/User';
import type { IEmployeeRole } from '../models/EmployeeRole';
import type { UserRole } from '../models/User';
import type { EmployeePermissionKey } from '../constants/employeePermissions';

// These roles bypass employee-permission checks entirely — they have full operational access.
const CORPORATE_BYPASS_ROLES: readonly UserRole[] = [
  'owner',
  'ceo',
  'coo',
  'cfo',
  'regional_manager',
  'area_manager',
  'hr_manager',
  'marketing_manager',
];

// The five roles whose access to employee-facing features is governed by EmployeeRole permissions.
const EMPLOYEE_TIER_ROLES: readonly UserRole[] = [
  'store_manager',
  'assistant_manager',
  'shift_supervisor',
  'barista',
  'trainee',
];

/**
 * Middleware that checks employee-level permissions.
 *
 * - Corporate/system roles (see CORPORATE_BYPASS_ROLES) pass unconditionally.
 * - Employee-tier roles must have an active EmployeeRole assigned with at least
 *   one of the supplied permission keys.
 * - investor and any other unlisted role receives 403 — they should use their
 *   own dedicated route guards.
 */
export const requireEmployeePermission = (...permissionKeys: EmployeePermissionKey[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const role = req.user?.role as UserRole | undefined;

    if (!role) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    if ((CORPORATE_BYPASS_ROLES as readonly string[]).includes(role)) {
      next();
      return;
    }

    if (!(EMPLOYEE_TIER_ROLES as readonly string[]).includes(role)) {
      errorResponse(res, 'Access denied', 403);
      return;
    }

    try {
      const userDoc = await User.findById(req.user!.userId)
        .select('employeeRoleId')
        .populate<{ employeeRoleId: IEmployeeRole | null }>({
          path: 'employeeRoleId',
          match: { isActive: true },
          select: 'permissions',
        })
        .lean();

      if (!userDoc?.employeeRoleId) {
        errorResponse(
          res,
          'No active employee role assigned. Contact your manager to be assigned a role.',
          403
        );
        return;
      }

      const resolvedRole = userDoc.employeeRoleId as IEmployeeRole;
      const granted = permissionKeys.some((key) =>
        (resolvedRole.permissions as string[]).includes(key)
      );

      if (!granted) {
        errorResponse(res, 'Your employee role does not include the required permission.', 403);
        return;
      }

      next();
    } catch {
      errorResponse(res, 'Permission check failed', 500);
    }
  };
};
