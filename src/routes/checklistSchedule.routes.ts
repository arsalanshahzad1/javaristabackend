import { Router } from 'express';
import {
  getMySchedules,
  getComplianceSummary,
  generateSchedules,
  approveSchedule,
  markScheduleMissed,
} from '../controllers/checklistSchedule.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

// Authenticated — any role
router.get('/my', authMiddleware, getMySchedules);

// Admin only
router.get('/compliance', authMiddleware, adminMiddleware, getComplianceSummary);
router.post('/generate', authMiddleware, adminMiddleware, generateSchedules);
router.put('/:id/approve', authMiddleware, adminMiddleware, approveSchedule);
router.put('/:id/miss', authMiddleware, adminMiddleware, markScheduleMissed);

export default router;
