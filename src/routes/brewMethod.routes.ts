import { Router } from 'express';
import {
  getAllBrewMethods,
  getBrewMethod,
  createBrewMethod,
  updateBrewMethod,
  deleteBrewMethod,
} from '../controllers/brewMethod.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

router.get('/', getAllBrewMethods);
router.get('/:id', getBrewMethod);

router.post('/', authMiddleware, adminMiddleware, createBrewMethod);
router.put('/:id', authMiddleware, adminMiddleware, updateBrewMethod);
router.delete('/:id', authMiddleware, adminMiddleware, deleteBrewMethod);

export default router;
