import { Router } from 'express';
import { listRecipes, getRecipe, createRecipe, updateRecipe } from '../controllers/store-ops.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { requireRole } from '../middleware/requireRole';

const router = Router();

const employeeOrAdmin = [authMiddleware, requireRole('employee', 'admin')];
const adminOnly = [authMiddleware, adminMiddleware];

router.get('/recipes', ...employeeOrAdmin, listRecipes);
router.get('/recipes/:slug', ...employeeOrAdmin, getRecipe);
router.post('/recipes', ...adminOnly, createRecipe);
router.put('/recipes/:slug', ...adminOnly, updateRecipe);

export default router;
