import { Router } from 'express';
import {
  uploadRecipePhoto as handleRecipePhoto,
  uploadPlaybookMedia as handlePlaybookMedia,
  uploadChecklistPhoto as handleChecklistPhoto,
  uploadCertificationBadge as handleBadge,
  uploadAvatar as handleAvatar,
  deleteUpload,
} from '../controllers/upload.controller';
import {
  uploadRecipePhoto,
  uploadPlaybookMedia,
  uploadChecklistPhoto,
  uploadCertificationBadge,
  uploadAvatar,
} from '../config/upload';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

router.post(
  '/recipe-photo',
  authMiddleware,
  uploadRecipePhoto.single('photo'),
  handleRecipePhoto,
);

router.post(
  '/playbook-media',
  authMiddleware,
  uploadPlaybookMedia.single('file'),
  handlePlaybookMedia,
);

router.post(
  '/checklist-photo',
  authMiddleware,
  uploadChecklistPhoto.single('photo'),
  handleChecklistPhoto,
);

router.post(
  '/badge',
  authMiddleware,
  adminMiddleware,
  uploadCertificationBadge.single('badge'),
  handleBadge,
);

router.post(
  '/avatar',
  authMiddleware,
  uploadAvatar.single('avatar'),
  handleAvatar,
);

// Wildcard to support public_ids that contain slashes (e.g. javarista/recipes/abc)
router.delete('/*path', authMiddleware, adminMiddleware, deleteUpload);

export default router;
