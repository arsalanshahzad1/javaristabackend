import { Router } from 'express';
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  createSubmission,
  submitChecklist,
  getMySubmissions,
  getSubmission,
  updateSubmission,
  getAllSubmissions,
  approveSubmission,
} from '../controllers/checklist.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { requireRole } from '../middleware/requireRole';
import { managerOrAdminMiddleware } from '../middleware/managerOrAdmin.middleware';

const router = Router();

const employeeOrAdmin = [authMiddleware, requireRole('owner','ceo','coo','cfo','regional_manager','area_manager','store_manager','assistant_manager','shift_supervisor','barista','trainee','hr_manager','marketing_manager')];
const anyStaff = [authMiddleware];

// Templates — employee or admin
router.get('/templates', ...employeeOrAdmin, getTemplates);
router.get('/templates/:id', ...employeeOrAdmin, getTemplate);
router.post('/templates', ...employeeOrAdmin, adminMiddleware, createTemplate);
router.put('/templates/:id', ...employeeOrAdmin, adminMiddleware, updateTemplate);

// Submissions — literal segments must be registered before param segments.
router.get('/submissions/mine', ...employeeOrAdmin, getMySubmissions);
// Admin/manager list with optional storeId, checklistId, status, from, to filters.
router.get('/submissions', ...anyStaff, managerOrAdminMiddleware, getAllSubmissions);
router.post('/submissions', ...employeeOrAdmin, createSubmission);
router.get('/submissions/:id', ...anyStaff, getSubmission);
router.put('/submissions/:id', ...employeeOrAdmin, updateSubmission);
router.put('/submissions/:id/approve', ...anyStaff, managerOrAdminMiddleware, approveSubmission);

// GPS-aware photo submission endpoint: POST /api/checklists/:checklistId/submit
// Registered after /submissions/* so "submissions" as a checklistId never shadows those routes.
router.post('/:checklistId/submit', ...anyStaff, submitChecklist);

export default router;
