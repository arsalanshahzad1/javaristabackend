import { Router } from 'express';
import {
  listPermissions,
  listEmployeeRoles,
  createEmployeeRole,
  updateEmployeeRole,
  deleteEmployeeRole,
  getMyPermissions,
} from '../controllers/employeeRole.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

// Fixed permission registry — any authenticated user may read (admin UI needs it).
// Must be declared before /:id to avoid shadowing.
router.get('/permissions', authMiddleware, listPermissions);

// Current user's resolved permissions (used by the mobile app on login).
router.get('/my-permissions', authMiddleware, getMyPermissions);

// Admin-only CRUD
router.get('/', authMiddleware, adminMiddleware, listEmployeeRoles);
router.post('/', authMiddleware, adminMiddleware, createEmployeeRole);
router.put('/:id', authMiddleware, adminMiddleware, updateEmployeeRole);
router.delete('/:id', authMiddleware, adminMiddleware, deleteEmployeeRole);

export default router;
