import { Router } from 'express';
import {
  getPublicProfile,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFeed,
  getExplore,
  createShare,
  deleteShare,
  toggleLike,
} from '../controllers/community.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public
router.get('/users/:userId/profile', getPublicProfile);
router.get('/explore', getExplore);

// Auth required
router.post('/follow/:userId', authMiddleware, followUser);
router.delete('/follow/:userId', authMiddleware, unfollowUser);
router.get('/followers', authMiddleware, getFollowers);
router.get('/following', authMiddleware, getFollowing);
router.get('/feed', authMiddleware, getFeed);
router.post('/shares', authMiddleware, createShare);
router.delete('/shares/:id', authMiddleware, deleteShare);
router.post('/shares/:id/like', authMiddleware, toggleLike);

export default router;
