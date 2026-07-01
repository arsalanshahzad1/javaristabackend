import { Request, Response } from 'express';
import EmployeeRole from '../models/EmployeeRole';
import User from '../models/User';
import { EMPLOYEE_PERMISSIONS, PERMISSION_GROUPS } from '../constants/employeePermissions';
import { successResponse, errorResponse } from '../utils/response';
import type { EmployeePermissionKey } from '../constants/employeePermissions';

// GET /api/employee-roles/permissions
export const listPermissions = (_req: Request, res: Response): void => {
  successResponse(res, 'Permissions retrieved', {
    permissions: EMPLOYEE_PERMISSIONS,
    groups: PERMISSION_GROUPS,
  });
};

// GET /api/employee-roles?storeId=xxx&includeInactive=true
export const listEmployeeRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeId, includeInactive } = req.query;

    const filter: Record<string, unknown> = {};
    if (storeId) filter.storeId = storeId as string;
    if (includeInactive !== 'true') filter.isActive = true;

    const roles = await EmployeeRole.find(filter)
      .populate('createdBy', 'name email')
      .sort({ name: 1 })
      .lean();

    // Annotate each role with the count of users assigned to it
    const roleIds = roles.map((r) => r._id);
    const userCounts = await User.aggregate([
      { $match: { employeeRoleId: { $in: roleIds } } },
      { $group: { _id: '$employeeRoleId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(userCounts.map((u) => [String(u._id), u.count]));

    const enriched = roles.map((r) => ({
      ...r,
      permissionCount: r.permissions.length,
      assignedUserCount: countMap.get(String(r._id)) ?? 0,
    }));

    successResponse(res, 'Employee roles retrieved', enriched);
  } catch (err) {
    errorResponse(res, 'Failed to retrieve employee roles', 500);
  }
};

// POST /api/employee-roles
export const createEmployeeRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, permissions, storeId } = req.body as {
      name: string;
      description?: string;
      permissions: EmployeePermissionKey[];
      storeId?: string;
    };

    const role = await EmployeeRole.create({
      name,
      description,
      permissions: permissions ?? [],
      storeId: storeId ?? undefined,
      createdBy: req.user!.userId,
    });

    successResponse(res, 'Employee role created', role, 201);
  } catch (err: unknown) {
    const mongoErr = err as { code?: number };
    if (mongoErr.code === 11000) {
      errorResponse(res, 'An employee role with that name already exists for this store.', 409);
      return;
    }
    errorResponse(res, 'Failed to create employee role', 500);
  }
};

// PUT /api/employee-roles/:id
export const updateEmployeeRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, permissions, isActive } = req.body as {
      name?: string;
      description?: string;
      permissions?: EmployeePermissionKey[];
      isActive?: boolean;
    };

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (permissions !== undefined) update.permissions = permissions;
    if (isActive !== undefined) update.isActive = isActive;

    const role = await EmployeeRole.findByIdAndUpdate(id, update, { new: true, runValidators: true });

    if (!role) {
      errorResponse(res, 'Employee role not found', 404);
      return;
    }

    successResponse(res, 'Employee role updated', role);
  } catch (err: unknown) {
    const mongoErr = err as { code?: number };
    if (mongoErr.code === 11000) {
      errorResponse(res, 'An employee role with that name already exists for this store.', 409);
      return;
    }
    errorResponse(res, 'Failed to update employee role', 500);
  }
};

// DELETE /api/employee-roles/:id  (soft delete — sets isActive = false)
export const deleteEmployeeRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const assignedCount = await User.countDocuments({ employeeRoleId: id });
    if (assignedCount > 0) {
      errorResponse(
        res,
        `Cannot deactivate: ${assignedCount} user(s) are still assigned to this role. Reassign them first.`,
        409
      );
      return;
    }

    const role = await EmployeeRole.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!role) {
      errorResponse(res, 'Employee role not found', 404);
      return;
    }

    successResponse(res, 'Employee role deactivated', role);
  } catch (err) {
    errorResponse(res, 'Failed to deactivate employee role', 500);
  }
};

// GET /api/employee-roles/my-permissions  (for the mobile app)
export const getMyPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.userId)
      .select('employeeRoleId role')
      .populate('employeeRoleId', 'permissions name isActive')
      .lean();

    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    const roleDoc = user.employeeRoleId as
      | { permissions: string[]; name: string; isActive: boolean }
      | null;

    if (!roleDoc || !roleDoc.isActive) {
      successResponse(res, 'Permissions retrieved', { permissions: [], employeeRoleName: null });
      return;
    }

    successResponse(res, 'Permissions retrieved', {
      permissions: roleDoc.permissions,
      employeeRoleName: roleDoc.name,
    });
  } catch (err) {
    errorResponse(res, 'Failed to retrieve permissions', 500);
  }
};
