import { Router } from 'express';
import {
  getShots,
  getLatestShot,
  logShot,
  deleteShot,
} from '../controllers/espresso.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getShots);
router.get('/latest', getLatestShot);
router.post('/', logShot);
router.delete('/:id', deleteShot);

export default router;
