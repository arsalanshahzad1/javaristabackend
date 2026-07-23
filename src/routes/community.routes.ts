import { Router } from 'express';
import {
  getBadgeCatalog,
  getPublicProfile,
  getMyProfile,
  updateMyProfile,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFeed,
  getExplore,
  createShare,
  deleteShare,
  toggleLike,
  checkIn,
  addCoffeeTried,
  getLeaderboard,
  getModerationProfiles,
  warnUser,
  suspendUser,
  unsuspendUser,
} from '../controllers/community.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { optionalAuth } from '../middleware/optionalAuth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/badges', getBadgeCatalog);
router.get('/users/:userId/profile', getPublicProfile);
router.get('/explore', optionalAuth, getExplore);
router.get('/leaderboard', getLeaderboard);

// ─── Auth required ────────────────────────────────────────────────────────────
router.get('/profile/my', authMiddleware, getMyProfile);
router.put('/profile/my', authMiddleware, updateMyProfile);

router.post('/passport/checkin', authMiddleware, checkIn);
router.post('/passport/coffee-tried', authMiddleware, addCoffeeTried);

router.post('/follow/:userId', authMiddleware, followUser);
router.delete('/follow/:userId', authMiddleware, unfollowUser);
router.get('/followers', authMiddleware, getFollowers);
router.get('/following', authMiddleware, getFollowing);
router.get('/feed', authMiddleware, getFeed);
router.post('/shares', authMiddleware, createShare);
router.delete('/shares/:id', authMiddleware, deleteShare);
router.post('/shares/:id/like', authMiddleware, toggleLike);

// ─── Admin moderation ─────────────────────────────────────────────────────────
router.get('/moderation/profiles', authMiddleware, adminMiddleware, getModerationProfiles);
router.post('/moderation/:userId/warn', authMiddleware, adminMiddleware, warnUser);
router.post('/moderation/:userId/suspend', authMiddleware, adminMiddleware, suspendUser);
router.post('/moderation/:userId/unsuspend', authMiddleware, adminMiddleware, unsuspendUser);

export default router;
