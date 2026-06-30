import { Router } from 'express';
import {
  getMyProfile,
  getUserProfile,
  getTeamProfiles,
} from '../controllers/performance.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { managerOrAdminMiddleware } from '../middleware/managerOrAdmin.middleware';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.get('/me', authMiddleware, requireRole('owner','ceo','coo','cfo','regional_manager','area_manager','store_manager','assistant_manager','shift_supervisor','barista','trainee','hr_manager','marketing_manager'), getMyProfile);
router.get('/team', authMiddleware, managerOrAdminMiddleware, getTeamProfiles);
router.get('/user/:userId', authMiddleware, managerOrAdminMiddleware, getUserProfile);

export default router;
