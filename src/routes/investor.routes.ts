import { Router } from 'express';
import {
  listContent,
  getContentBySlug,
  listEvents,
  createContent,
  updateContent,
  deleteContent,
} from '../controllers/investor.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/requireRole';

const router = Router();

const investorAccess = [authMiddleware, requireRole('investor', 'employee', 'admin')];
const adminOnly = [authMiddleware, requireRole('admin')];

router.get('/content', ...investorAccess, listContent);
router.get('/content/:slug', ...investorAccess, getContentBySlug);
router.get('/events', ...investorAccess, listEvents);

router.post('/content', ...adminOnly, createContent);
router.put('/content/:slug', ...adminOnly, updateContent);
router.delete('/content/:slug', ...adminOnly, deleteContent);

export default router;
