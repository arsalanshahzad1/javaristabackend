import { Router } from 'express';
import { getDashboardMetrics, getMyProgress, upsertProgress } from '../controllers/metrics.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/requireRole';

const router = Router();

router.use(authMiddleware);

router.get(
  '/dashboard',
  requireRole(
    'area_manager',
    'regional_manager',
    'coo',
    'cfo',
    'ceo',
    'owner',
    'hr_manager',
    'marketing_manager'
  ),
  getDashboardMetrics
);

router.get('/my-progress', getMyProgress);
router.post('/progress', upsertProgress);

export default router;
