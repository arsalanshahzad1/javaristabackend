import { Router } from 'express';
import { getEmployeeProfile, getScore, computeScore } from '../controllers/employeeProfile.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/:userId/profile', authMiddleware, getEmployeeProfile);
router.get('/:userId/score', authMiddleware, getScore);
router.post('/:userId/compute-score', authMiddleware, computeScore);

export default router;
