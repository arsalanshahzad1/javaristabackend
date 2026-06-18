import { Router } from 'express';
import {
  getAllRecipes,
  getFeaturedRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  likeRecipe,
  getSavedRecipes,
} from '../controllers/recipe.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createRecipeSchema } from '../validators/recipe.validator';

const router = Router();

router.get('/', getAllRecipes);
router.get('/featured', getFeaturedRecipes);
router.get('/my/saved', authMiddleware, getSavedRecipes);
router.get('/:id', getRecipe);

router.post('/', authMiddleware, validate(createRecipeSchema), createRecipe);
router.put('/:id', authMiddleware, updateRecipe);
router.delete('/:id', authMiddleware, deleteRecipe);
router.post('/:id/like', authMiddleware, likeRecipe);

export default router;
