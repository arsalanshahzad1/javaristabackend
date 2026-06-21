import { Router } from 'express';
import {
  getPlaybooks,
  getPlaybook,
  createPlaybook,
  updatePlaybook,
  deletePlaybook,
} from '../controllers/playbook.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { requireRole } from '../middleware/requireRole';

const router = Router();

const employeeOrAdmin = [authMiddleware, requireRole('employee', 'admin')];

router.get('/', ...employeeOrAdmin, getPlaybooks);
router.get('/:slug', ...employeeOrAdmin, getPlaybook);
router.post('/', ...employeeOrAdmin, adminMiddleware, createPlaybook);
router.put('/:slug', ...employeeOrAdmin, adminMiddleware, updatePlaybook);
router.delete('/:slug', ...employeeOrAdmin, adminMiddleware, deletePlaybook);

export default router;
