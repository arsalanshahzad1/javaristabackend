import { Router } from 'express';
import {
  getMyReadingList,
  getPlaybooks,
  getPlaybook,
  createPlaybook,
  updatePlaybook,
  deletePlaybook,
  submitForReview,
  approvePlaybook,
  publishPlaybook,
  archivePlaybook,
  newVersion,
  getChangelog,
  addAttachment,
  deleteAttachment,
  addVideoUrl,
  markAsRead,
  acknowledgePlaybook,
  getCompliance,
} from '../controllers/playbook.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { requireEmployeePermission } from '../middleware/requireEmployeePermission';
import { uploadPlaybookMedia } from '../config/cloudinary';

const router = Router();

// Corporate roles bypass; employee-tier users need playbook.view
const canViewPlaybooks = [authMiddleware, requireEmployeePermission('playbook.view')];
const adminOnly = [authMiddleware, adminMiddleware];

// Reading list — auth only (unchanged)
router.get('/my-reading-list', authMiddleware, getMyReadingList);

// List / detail
router.get('/', ...canViewPlaybooks, getPlaybooks);
router.get('/:slug', ...canViewPlaybooks, getPlaybook);

// Admin write (unchanged)
router.post('/', ...canViewPlaybooks, adminMiddleware, createPlaybook);
router.put('/:slug', ...canViewPlaybooks, adminMiddleware, updatePlaybook);
router.delete('/:slug', ...canViewPlaybooks, adminMiddleware, deletePlaybook);

// Workflow — submitting for review requires playbook.view at minimum
router.put('/:id/submit-review', ...canViewPlaybooks, submitForReview);
router.put('/:id/approve', ...adminOnly, approvePlaybook);
router.put('/:id/publish', ...adminOnly, publishPlaybook);
router.put('/:id/archive', ...adminOnly, archivePlaybook);
router.put('/:id/new-version', ...adminOnly, newVersion);
router.get('/:id/changelog', ...canViewPlaybooks, getChangelog);

// Attachments — admin only (unchanged)
router.post('/:id/attachments', ...adminOnly, uploadPlaybookMedia.single('file'), addAttachment);
router.delete('/:id/attachments/:attachmentId', ...adminOnly, deleteAttachment);
router.post('/:id/video', ...adminOnly, addVideoUrl);

// Compliance tracking — auth only (unchanged)
router.post('/:id/read', authMiddleware, markAsRead);
router.post('/:id/acknowledge', authMiddleware, acknowledgePlaybook);
router.get('/:id/compliance', ...adminOnly, getCompliance);

export default router;
