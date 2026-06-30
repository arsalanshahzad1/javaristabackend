import { Router } from 'express';
import {
  listContent,
  getContentBySlug,
  listEvents,
  createContent,
  updateContent,
  deleteContent,
  getTransparencyDashboard,
} from '../controllers/investor.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/requireRole';

const router = Router();

const investorAccess = [authMiddleware, requireRole('investor', 'owner', 'ceo', 'coo', 'cfo')];
const adminOnly = [authMiddleware, requireRole('owner')];

router.get('/content', ...investorAccess, listContent);
router.get('/content/:slug', ...investorAccess, getContentBySlug);
router.get('/events', ...investorAccess, listEvents);
router.get('/transparency', ...investorAccess, getTransparencyDashboard);

router.post('/content', ...adminOnly, createContent);
router.put('/content/:slug', ...adminOnly, updateContent);
router.delete('/content/:slug', ...adminOnly, deleteContent);

export default router;
