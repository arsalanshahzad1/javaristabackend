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
import { requireEmployeePermission } from '../middleware/requireEmployeePermission';
import { managerOrAdminMiddleware } from '../middleware/managerOrAdmin.middleware';

const router = Router();

// Corporate roles bypass automatically; employee-tier users need checklist.view.
const canViewChecklists = [authMiddleware, requireEmployeePermission('checklist.view')];
// Completing/updating a submission requires checklist.complete.
const canCompleteChecklist = [authMiddleware, requireEmployeePermission('checklist.complete')];

// Templates — view permission required
router.get('/templates', ...canViewChecklists, getTemplates);
router.get('/templates/:id', ...canViewChecklists, getTemplate);
router.post('/templates', ...canViewChecklists, adminMiddleware, createTemplate);
router.put('/templates/:id', ...canViewChecklists, adminMiddleware, updateTemplate);

// Submissions — literal segments must be registered before param segments.
router.get('/submissions/mine', ...canViewChecklists, getMySubmissions);
// Manager list (all submissions) — managerOrAdminMiddleware unchanged (corporate only)
router.get('/submissions', authMiddleware, managerOrAdminMiddleware, getAllSubmissions);
router.post('/submissions', ...canCompleteChecklist, createSubmission);
// Single submission view — auth only (managers need it too and they bypass role checks)
router.get('/submissions/:id', authMiddleware, getSubmission);
router.put('/submissions/:id', ...canCompleteChecklist, updateSubmission);
// Approve — managers only, unchanged
router.put('/submissions/:id/approve', authMiddleware, managerOrAdminMiddleware, approveSubmission);

// GPS-aware photo submission — auth only (no role restriction, same as before)
// ⚠️ FLAGGED: This endpoint (:checklistId/submit) was already auth-only with no role guard.
// It is kept auth-only here. If you want it gated by checklist.complete, let me know.
router.post('/:checklistId/submit', authMiddleware, submitChecklist);

export default router;
