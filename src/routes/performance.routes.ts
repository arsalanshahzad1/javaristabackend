import { Router } from 'express';
import {
  getMyProfile,
  getUserProfile,
  getTeamProfiles,
} from '../controllers/performance.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { managerOrAdminMiddleware } from '../middleware/managerOrAdmin.middleware';
import { requireEmployeePermission } from '../middleware/requireEmployeePermission';

const router = Router();

// Own profile — corporate roles bypass; employee-tier needs performance.view_own
router.get('/me', authMiddleware, requireEmployeePermission('performance.view_own'), getMyProfile);

// Team / individual — manager-or-above only (managerOrAdminMiddleware unchanged)
router.get('/team', authMiddleware, managerOrAdminMiddleware, getTeamProfiles);
router.get('/user/:userId', authMiddleware, managerOrAdminMiddleware, getUserProfile);

export default router;
