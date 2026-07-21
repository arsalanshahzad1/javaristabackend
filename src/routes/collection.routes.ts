import { Router } from 'express';
import {
  getMyCollections,
  createCollection,
  getCollection,
  renameCollection,
  deleteCollection,
  addRecipeToCollection,
  removeRecipeFromCollection,
} from '../controllers/collection.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/my', authMiddleware, getMyCollections);
router.post('/', authMiddleware, createCollection);
router.get('/:id', authMiddleware, getCollection);
router.put('/:id', authMiddleware, renameCollection);
router.delete('/:id', authMiddleware, deleteCollection);
router.post('/:id/recipes', authMiddleware, addRecipeToCollection);
router.delete('/:id/recipes/:recipeId', authMiddleware, removeRecipeFromCollection);

export default router;
