import { Router } from 'express';
import {
  getBrewLogs,
  getBrewStats,
  getBrewLog,
  createBrewLog,
  updateBrewLog,
  deleteBrewLog,
} from '../controllers/brewLog.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createBrewLogSchema } from '../validators/brewLog.validator';

const router = Router();

router.use(authMiddleware);

router.get('/', getBrewLogs);
router.get('/stats', getBrewStats);
router.get('/:id', getBrewLog);
router.post('/', validate(createBrewLogSchema), createBrewLog);
router.put('/:id', updateBrewLog);
router.delete('/:id', deleteBrewLog);

export default router;
