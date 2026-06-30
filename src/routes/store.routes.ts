import { Router } from 'express';
import {
  getAllStores,
  getStoreById,
  createStore,
  updateStore,
  deleteStore,
  addStorePhoto,
  removeStorePhoto,
  migrateUsersToStores,
} from '../controllers/store.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/requireRole';
import { uploadRecipePhoto } from '../config/cloudinary';

const router = Router();

const adminLevel = requireRole('owner', 'ceo');

// Specific routes before parameterized ones
router.post('/migrate-users', authMiddleware, migrateUsersToStores);
router.get('/', authMiddleware, getAllStores);
router.get('/:id', authMiddleware, getStoreById);
router.post('/', authMiddleware, adminLevel, createStore);
router.put('/:id', authMiddleware, adminLevel, updateStore);
router.delete('/:id', authMiddleware, adminLevel, deleteStore);
router.post('/:id/photos', authMiddleware, adminLevel, uploadRecipePhoto.single('photo'), addStorePhoto);
router.delete('/:id/photos', authMiddleware, adminLevel, removeStorePhoto);

export default router;
