import { Router } from 'express';
import { getEmployeeProfile, computeScore } from '../controllers/employeeProfile.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/:userId/profile', authMiddleware, getEmployeeProfile);
router.post('/:userId/compute-score', authMiddleware, computeScore);

export default router;
