import { Router } from 'express';
import {
  getStats,
  getAllUsers,
  updateUser,
  updateUserRole,
  deleteUser,
  getAllRecipes,
  publishRecipe,
  deleteRecipe,
  getAllBrewLogs,
  getCommunityShares,
  deleteCommunityShare,
  getCommunityUsers,
} from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);
router.put('/users/:userId/role', updateUserRole);
router.delete('/users/:id', deleteUser);
router.get('/recipes', getAllRecipes);
router.put('/recipes/:id/publish', publishRecipe);
router.delete('/recipes/:id', deleteRecipe);
router.get('/brew-logs', getAllBrewLogs);

router.get('/community/shares', getCommunityShares);
router.delete('/community/shares/:id', deleteCommunityShare);
router.get('/community/users', getCommunityUsers);

export default router;
