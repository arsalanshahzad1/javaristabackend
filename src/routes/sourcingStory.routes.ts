import { Router } from 'express';
import {
  listStories,
  getStory,
  createStory,
  updateStory,
  deleteStory,
  addStoryPhoto,
} from '../controllers/sourcingStory.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/requireRole';
import { uploadRecipePhoto } from '../config/cloudinary';

const router = Router();

const investorAccess = [authMiddleware, requireRole('investor', 'owner', 'ceo', 'coo', 'cfo')];
const adminOnly = [authMiddleware, requireRole('owner')];

router.get('/', ...investorAccess, listStories);
router.get('/:id', ...investorAccess, getStory);
router.post('/', ...adminOnly, createStory);
router.put('/:id', ...adminOnly, updateStory);
router.delete('/:id', ...adminOnly, deleteStory);
router.post('/:id/photos', ...adminOnly, uploadRecipePhoto.single('photo'), addStoryPhoto);

export default router;
