import { Router } from 'express';
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  createSubmission,
  getMySubmissions,
  getSubmission,
  updateSubmission,
  getAllSubmissions,
  approveSubmission,
} from '../controllers/checklist.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { requireRole } from '../middleware/requireRole';

const router = Router();

const employeeOrAdmin = [authMiddleware, requireRole('employee', 'admin')];

// Templates — employee or admin
router.get('/templates', ...employeeOrAdmin, getTemplates);
router.get('/templates/:id', ...employeeOrAdmin, getTemplate);
router.post('/templates', ...employeeOrAdmin, adminMiddleware, createTemplate);
router.put('/templates/:id', ...employeeOrAdmin, adminMiddleware, updateTemplate);

// Submissions — "mine" must be registered before "/:id"
router.get('/submissions/mine', ...employeeOrAdmin, getMySubmissions);
router.get('/submissions', ...employeeOrAdmin, adminMiddleware, getAllSubmissions);
router.post('/submissions', ...employeeOrAdmin, createSubmission);
router.get('/submissions/:id', ...employeeOrAdmin, getSubmission);
router.put('/submissions/:id', ...employeeOrAdmin, updateSubmission);
router.put('/submissions/:id/approve', ...employeeOrAdmin, adminMiddleware, approveSubmission);

export default router;
