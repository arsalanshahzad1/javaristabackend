import { Router } from 'express';
import {
  getBeans,
  getBean,
  createBean,
  updateBean,
  deleteBean,
} from '../controllers/bean.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createBeanSchema } from '../validators/bean.validator';

const router = Router();

router.use(authMiddleware);

router.get('/', getBeans);
router.get('/:id', getBean);
router.post('/', validate(createBeanSchema), createBean);
router.put('/:id', updateBean);
router.delete('/:id', deleteBean);

export default router;
