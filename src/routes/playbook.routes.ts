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
import { requireRole } from '../middleware/requireRole';
import { uploadPlaybookMedia } from '../config/cloudinary';

const router = Router();

const employeeOrAdmin = [authMiddleware, requireRole('owner','ceo','coo','cfo','regional_manager','area_manager','store_manager','assistant_manager','shift_supervisor','barista','trainee','hr_manager','marketing_manager')];
const adminOnly = [authMiddleware, adminMiddleware];

// Reading list — must be before /:slug to avoid slug match
router.get('/my-reading-list', authMiddleware, getMyReadingList);

router.get('/', ...employeeOrAdmin, getPlaybooks);
router.get('/:slug', ...employeeOrAdmin, getPlaybook);
router.post('/', ...employeeOrAdmin, adminMiddleware, createPlaybook);
router.put('/:slug', ...employeeOrAdmin, adminMiddleware, updatePlaybook);
router.delete('/:slug', ...employeeOrAdmin, adminMiddleware, deletePlaybook);

// Workflow
router.put('/:id/submit-review', ...employeeOrAdmin, submitForReview);
router.put('/:id/approve', ...adminOnly, approvePlaybook);
router.put('/:id/publish', ...adminOnly, publishPlaybook);
router.put('/:id/archive', ...adminOnly, archivePlaybook);
router.put('/:id/new-version', ...adminOnly, newVersion);
router.get('/:id/changelog', ...employeeOrAdmin, getChangelog);

// Attachments
router.post('/:id/attachments', ...adminOnly, uploadPlaybookMedia.single('file'), addAttachment);
router.delete('/:id/attachments/:attachmentId', ...adminOnly, deleteAttachment);
router.post('/:id/video', ...adminOnly, addVideoUrl);

// Compliance tracking
router.post('/:id/read', authMiddleware, markAsRead);
router.post('/:id/acknowledge', authMiddleware, acknowledgePlaybook);
router.get('/:id/compliance', ...adminOnly, getCompliance);

export default router;
