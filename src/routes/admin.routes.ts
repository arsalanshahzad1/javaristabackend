import { Router } from 'express';
import {
  getStats,
  getAllUsers,
  updateUser,
  deleteUser,
  getAllRecipes,
  publishRecipe,
  deleteRecipe,
  getAllBrewLogs,
} from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/recipes', getAllRecipes);
router.put('/recipes/:id/publish', publishRecipe);
router.delete('/recipes/:id', deleteRecipe);
router.get('/brew-logs', getAllBrewLogs);

export default router;
