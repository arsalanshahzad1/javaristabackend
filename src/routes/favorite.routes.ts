import { Router } from 'express';
import { toggleFavorite, getMyFavorites, getFavoriteStatus } from '../controllers/favorite.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/my', authMiddleware, getMyFavorites);
router.get('/status', authMiddleware, getFavoriteStatus);
router.post('/toggle', authMiddleware, toggleFavorite);

export default router;
