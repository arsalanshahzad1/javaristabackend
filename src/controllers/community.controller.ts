import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Follow from '../models/follow.model';
import BrewShare from '../models/brew-share.model';
import Certification from '../models/certification.model';
import BrewLog from '../models/BrewLog';
import CommunityProfile from '../models/CommunityProfile';
import { successResponse, errorResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';
import {
  getOrCreateProfile,
  awardPoints,
  checkAndAwardBadges,
  POINTS,
} from '../services/community.service';
import { BADGE_DEFINITIONS, LEVEL_THRESHOLDS } from '../constants/badges';
import { createNotification } from '../services/notification.service';

const toOid = (id: string) => new mongoose.Types.ObjectId(id);

// ─── Badge catalog ────────────────────────────────────────────────────────────

export const getBadgeCatalog = asyncHandler(async (_req: Request, res: Response) => {
  const badges = Object.entries(BADGE_DEFINITIONS).map(([badgeId, def]) => ({
    badgeId,
    ...def,
  }));
  successResponse(res, 'Badge catalog fetched', badges);
});

// ─── Public Profiles ─────────────────────────────────────────────────────────

export const getPublicProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params['userId'] as string;

  if (!mongoose.isValidObjectId(userId)) {
    errorResponse(res, 'Invalid user ID', 400);
    return;
  }

  const user = await User.findById(userId).select(
    'name bio avatar followersCount followingCount'
  );
  if (!user) {
    errorResponse(res, 'User not found', 404);
    return;
  }

  const [recentShares, certifications, communityProfile] = await Promise.all([
    BrewShare.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('brewLog', 'rating tasteNotes comments completedAt brewMethod')
      .lean(),
    Certification.find({ user: userId, status: 'active' })
      .select('type issuedAt certificateNumber')
      .sort({ issuedAt: -1 })
      .lean(),
    CommunityProfile.findOne({ userId }).lean(),
  ]);

  const profileData = communityProfile
    ? {
        level: communityProfile.level,
        levelPoints: communityProfile.levelPoints,
        badges: communityProfile.badges,
        totalBrews: communityProfile.totalBrews,
        totalLikesReceived: communityProfile.totalLikesReceived,
        storesVisited: communityProfile.storesVisited,
        coffeesTriedNames: communityProfile.coffeesTriedNames,
        brewMethodsLearned: communityProfile.brewMethodsLearned,
      }
    : null;

  successResponse(res, 'Profile fetched', {
    user,
    recentShares,
    certifications,
    communityProfile: profileData,
  });
});

// ─── Own Community Profile ────────────────────────────────────────────────────

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const profile = await getOrCreateProfile(userId);
  successResponse(res, 'Profile fetched', profile);
});

export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { favoriteBrewMethod, favoriteOrigin, favoriteTastingNotes } = req.body as {
    favoriteBrewMethod?: string;
    favoriteOrigin?: string;
    favoriteTastingNotes?: string[];
  };

  const profile = await getOrCreateProfile(userId);

  if (favoriteBrewMethod !== undefined) profile.favoriteBrewMethod = favoriteBrewMethod;
  if (favoriteOrigin !== undefined) profile.favoriteOrigin = favoriteOrigin;
  if (Array.isArray(favoriteTastingNotes)) profile.favoriteTastingNotes = favoriteTastingNotes;

  await profile.save();
  successResponse(res, 'Profile updated', profile);
});

// ─── Passport ────────────────────────────────────────────────────────────────

export const checkIn = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { storeId, storeName } = req.body as { storeId: string; storeName: string };

  if (!storeId || !storeName) {
    errorResponse(res, 'storeId and storeName are required', 400);
    return;
  }

  const profile = await getOrCreateProfile(userId);
  const existing = profile.storesVisited.find((s) => s.storeId === storeId);

  let isFirstVisit = false;
  if (existing) {
    existing.checkInCount += 1;
    existing.visitedAt = new Date();
  } else {
    profile.storesVisited.push({
      storeId,
      storeName,
      visitedAt: new Date(),
      checkInCount: 1,
    });
    isFirstVisit = true;
  }

  await profile.save();

  if (isFirstVisit) {
    awardPoints(userId, POINTS.store_visited, 'store_visit').catch(() => {});
  }
  checkAndAwardBadges(userId).catch(() => {});

  successResponse(res, 'Check-in recorded', {
    storesVisited: profile.storesVisited,
  });
});

export const addCoffeeTried = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { coffeeId, coffeeName } = req.body as { coffeeId: string; coffeeName: string };

  if (!coffeeId || !coffeeName) {
    errorResponse(res, 'coffeeId and coffeeName are required', 400);
    return;
  }

  const profile = await getOrCreateProfile(userId);

  if (!profile.coffeesTriedIds.includes(coffeeId)) {
    profile.coffeesTriedIds.push(coffeeId);
    profile.coffeesTriedNames.push(coffeeName);
    await profile.save();
  }

  successResponse(res, 'Coffee added', {
    coffeesTriedNames: profile.coffeesTriedNames,
  });
});

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export const getLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const profiles = await CommunityProfile.find()
    .sort({ levelPoints: -1 })
    .limit(20)
    .lean();

  const userIds = profiles.map((p) => p.userId);
  const users = await User.find({ _id: { $in: userIds } })
    .select('name avatar')
    .lean();

  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const leaderboard = profiles.map((p) => {
    const user = userMap.get(String(p.userId));
    return {
      userId: String(p.userId),
      name: user?.name ?? 'Unknown',
      avatar: user?.avatar,
      level: p.level,
      levelPoints: p.levelPoints,
      totalBrews: p.totalBrews,
      badgesCount: p.badges.length,
    };
  });

  successResponse(res, 'Leaderboard fetched', leaderboard);
});

// ─── Follow / Unfollow ────────────────────────────────────────────────────────

export const followUser = asyncHandler(async (req: Request, res: Response) => {
  const currentUserId = req.user!.userId;
  const targetId = req.params['userId'] as string;

  if (!mongoose.isValidObjectId(targetId)) {
    errorResponse(res, 'Invalid user ID', 400);
    return;
  }

  if (currentUserId === targetId) {
    errorResponse(res, 'You cannot follow yourself', 400);
    return;
  }

  const target = await User.findById(targetId);
  if (!target) {
    errorResponse(res, 'User not found', 404);
    return;
  }

  const existing = await Follow.findOne({ follower: currentUserId, following: targetId });
  if (existing) {
    errorResponse(res, 'Already following this user', 409);
    return;
  }

  await Follow.create({ follower: toOid(currentUserId), following: toOid(targetId) });

  await Promise.all([
    User.findByIdAndUpdate(currentUserId, { $inc: { followingCount: 1 } }),
    User.findByIdAndUpdate(targetId, { $inc: { followersCount: 1 } }),
  ]);

  // Award points to the followed user for gaining a follower
  awardPoints(targetId, POINTS.follower_gained, 'follower').catch(() => {});
  checkAndAwardBadges(targetId).catch(() => {});

  successResponse(res, 'User followed', null, 201);
});

export const unfollowUser = asyncHandler(async (req: Request, res: Response) => {
  const currentUserId = req.user!.userId;
  const targetId = req.params['userId'] as string;

  if (!mongoose.isValidObjectId(targetId)) {
    errorResponse(res, 'Invalid user ID', 400);
    return;
  }

  const follow = await Follow.findOneAndDelete({
    follower: currentUserId,
    following: targetId,
  });

  if (!follow) {
    errorResponse(res, 'You are not following this user', 404);
    return;
  }

  await Promise.all([
    User.findByIdAndUpdate(currentUserId, { $inc: { followingCount: -1 } }),
    User.findByIdAndUpdate(targetId, { $inc: { followersCount: -1 } }),
  ]);

  successResponse(res, 'User unfollowed');
});

export const getFollowers = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, parseInt(req.query['limit'] as string) || 20);
  const skip = (page - 1) * limit;

  const [follows, total] = await Promise.all([
    Follow.find({ following: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('follower', 'name bio avatar followersCount followingCount')
      .lean(),
    Follow.countDocuments({ following: userId }),
  ]);

  const followers = follows.map((f) => f.follower);

  successResponse(res, 'Followers fetched', followers, 200, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

export const getFollowing = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, parseInt(req.query['limit'] as string) || 20);
  const skip = (page - 1) * limit;

  const [follows, total] = await Promise.all([
    Follow.find({ follower: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('following', 'name bio avatar followersCount followingCount')
      .lean(),
    Follow.countDocuments({ follower: userId }),
  ]);

  const following = follows.map((f) => f.following);

  successResponse(res, 'Following fetched', following, 200, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

// ─── Feed & Explore ───────────────────────────────────────────────────────────

export const getFeed = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, parseInt(req.query['limit'] as string) || 20);
  const skip = (page - 1) * limit;

  const followingDocs = await Follow.find({ follower: userId }).select('following').lean();
  const followingIds = followingDocs.map((f) => f.following);

  if (followingIds.length === 0) {
    successResponse(res, 'Feed fetched', [], 200, { page, limit, total: 0, pages: 0 });
    return;
  }

  const [shares, total] = await Promise.all([
    BrewShare.find({ user: { $in: followingIds } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name avatar bio')
      .populate('brewLog', 'rating tasteNotes comments completedAt brewMethod')
      .lean(),
    BrewShare.countDocuments({ user: { $in: followingIds } }),
  ]);

  const mapped = shares.map((share) => ({
    ...share,
    isLikedByMe: (share.likes as mongoose.Types.ObjectId[]).some(
      (id) => id.toString() === userId,
    ),
    likesCount: share.likesCount,
  }));

  successResponse(res, 'Feed fetched', mapped, 200, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

export const getExplore = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId ?? null;
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, parseInt(req.query['limit'] as string) || 20);
  const skip = (page - 1) * limit;

  const [shares, total] = await Promise.all([
    BrewShare.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name avatar bio')
      .populate('brewLog', 'rating tasteNotes comments completedAt brewMethod')
      .lean(),
    BrewShare.countDocuments(),
  ]);

  const mapped = shares.map((share) => ({
    ...share,
    isLikedByMe: userId
      ? (share.likes as mongoose.Types.ObjectId[]).some(
          (id) => id.toString() === userId,
        )
      : false,
    likesCount: share.likesCount,
  }));

  successResponse(res, 'Explore fetched', mapped, 200, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

// ─── Shares ───────────────────────────────────────────────────────────────────

export const createShare = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { brewLogId, caption } = req.body as { brewLogId: string; caption?: string };

  if (!brewLogId || !mongoose.isValidObjectId(brewLogId)) {
    errorResponse(res, 'Valid brewLogId is required', 400);
    return;
  }

  // Check suspension
  const communityProfile = await CommunityProfile.findOne({ userId }).lean();
  if (communityProfile?.isSuspended) {
    const until = communityProfile.suspendedUntil;
    if (!until || until > new Date()) {
      const untilMsg = until ? ` until ${until.toDateString()}` : '';
      errorResponse(res, `Your account is suspended${untilMsg}. You cannot post brew shares.`, 403);
      return;
    }
    // Suspension expired — clear it
    await CommunityProfile.updateOne(
      { userId },
      { $set: { isSuspended: false, suspendedUntil: undefined, suspendedReason: undefined } }
    );
  }

  const brewLog = await BrewLog.findOne({ _id: brewLogId, user: userId });
  if (!brewLog) {
    errorResponse(res, 'Brew log not found or does not belong to you', 404);
    return;
  }

  const share = await BrewShare.create({
    user: toOid(userId),
    brewLog: toOid(brewLogId),
    caption,
  });

  const populated = await share.populate([
    { path: 'user', select: 'name avatar bio' },
    { path: 'brewLog', select: 'rating tasteNotes comments completedAt brewMethod' },
  ]);

  // Fire-and-forget: award points + badges, update totalBrews
  Promise.all([
    awardPoints(userId, POINTS.brew_logged, 'brew'),
    CommunityProfile.updateOne({ userId }, { $inc: { totalBrews: 1 } }, { upsert: false }),
  ])
    .then(() => checkAndAwardBadges(userId))
    .catch(() => {});

  successResponse(res, 'Brew shared', populated, 201);
});

export const deleteShare = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = req.params['id'] as string;

  if (!mongoose.isValidObjectId(id)) {
    errorResponse(res, 'Invalid share ID', 400);
    return;
  }

  const share = await BrewShare.findById(id);
  if (!share) {
    errorResponse(res, 'Share not found', 404);
    return;
  }

  if (share.user.toString() !== userId) {
    errorResponse(res, 'Not authorised to delete this share', 403);
    return;
  }

  await share.deleteOne();

  successResponse(res, 'Share deleted');
});

export const toggleLike = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = req.params['id'] as string;

  if (!mongoose.isValidObjectId(id)) {
    errorResponse(res, 'Invalid share ID', 400);
    return;
  }

  const share = await BrewShare.findById(id);
  if (!share) {
    errorResponse(res, 'Share not found', 404);
    return;
  }

  const userOid = toOid(userId);
  const alreadyLiked = share.likes.some((l) => l.equals(userOid));

  if (alreadyLiked) {
    share.likes = share.likes.filter((l) => !l.equals(userOid));
    share.likesCount = Math.max(0, share.likesCount - 1);
    await share.save();
    // Decrement likesGiven for liker, decrement likesReceived for owner
    Promise.all([
      CommunityProfile.updateOne({ userId }, { $inc: { totalLikesGiven: -1 } }),
      CommunityProfile.updateOne(
        { userId: share.user.toString() },
        { $inc: { totalLikesReceived: -1 } }
      ),
    ]).catch(() => {});
  } else {
    share.likes.push(userOid);
    share.likesCount += 1;
    await share.save();
    // Award points + badges to share owner (fire-and-forget)
    const ownerId = share.user.toString();
    Promise.all([
      CommunityProfile.updateOne({ userId }, { $inc: { totalLikesGiven: 1 } }),
      CommunityProfile.updateOne(
        { userId: ownerId },
        { $inc: { totalLikesReceived: 1 } }
      ),
      awardPoints(ownerId, POINTS.brew_liked_received, 'like_received'),
    ])
      .then(() => checkAndAwardBadges(ownerId))
      .catch(() => {});
  }

  successResponse(res, alreadyLiked ? 'Like removed' : 'Like added', {
    liked: !alreadyLiked,
    likesCount: share.likesCount,
  });
});

// ─── Admin Moderation ─────────────────────────────────────────────────────────

export const getModerationProfiles = asyncHandler(async (req: Request, res: Response) => {
  const profiles = await CommunityProfile.find({
    $or: [{ warningCount: { $gt: 0 } }, { isSuspended: true }],
  })
    .sort({ warningCount: -1, isSuspended: -1 })
    .lean();

  const userIds = profiles.map((p) => p.userId);
  const users = await User.find({ _id: { $in: userIds } })
    .select('name email avatar')
    .lean();

  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const result = profiles.map((p) => ({
    ...p,
    user: userMap.get(String(p.userId)),
  }));

  successResponse(res, 'Moderation profiles fetched', result);
});

export const warnUser = asyncHandler(async (req: Request, res: Response) => {
  const targetId = req.params['userId'] as string;
  const adminId = req.user!.userId;
  const { reason } = req.body as { reason: string };

  if (!mongoose.isValidObjectId(targetId)) {
    errorResponse(res, 'Invalid user ID', 400);
    return;
  }
  if (!reason) {
    errorResponse(res, 'reason is required', 400);
    return;
  }

  const profile = await getOrCreateProfile(targetId);
  profile.warningCount += 1;
  profile.moderatorNotes.push({
    note: `Warning: ${reason}`,
    addedBy: toOid(adminId),
    addedAt: new Date(),
  });
  await profile.save();

  createNotification({
    userId: targetId,
    type: 'general',
    title: 'Community Warning',
    body: `You have received a warning: ${reason}`,
  }).catch(() => {});

  successResponse(res, 'Warning issued', { warningCount: profile.warningCount });
});

export const suspendUser = asyncHandler(async (req: Request, res: Response) => {
  const targetId = req.params['userId'] as string;
  const adminId = req.user!.userId;
  const { reason, days } = req.body as { reason: string; days: number };

  if (!mongoose.isValidObjectId(targetId)) {
    errorResponse(res, 'Invalid user ID', 400);
    return;
  }
  if (!reason || !days || days < 1) {
    errorResponse(res, 'reason and days (>= 1) are required', 400);
    return;
  }

  const suspendedUntil = new Date();
  suspendedUntil.setDate(suspendedUntil.getDate() + days);

  const profile = await getOrCreateProfile(targetId);
  profile.isSuspended = true;
  profile.suspendedUntil = suspendedUntil;
  profile.suspendedReason = reason;
  profile.moderatorNotes.push({
    note: `Suspended for ${days} day(s): ${reason}`,
    addedBy: toOid(adminId),
    addedAt: new Date(),
  });
  await profile.save();

  createNotification({
    userId: targetId,
    type: 'general',
    title: 'Account Suspended',
    body: `Your community account has been suspended until ${suspendedUntil.toDateString()}: ${reason}`,
  }).catch(() => {});

  successResponse(res, 'User suspended', { suspendedUntil });
});

export const unsuspendUser = asyncHandler(async (req: Request, res: Response) => {
  const targetId = req.params['userId'] as string;
  const adminId = req.user!.userId;

  if (!mongoose.isValidObjectId(targetId)) {
    errorResponse(res, 'Invalid user ID', 400);
    return;
  }

  const profile = await getOrCreateProfile(targetId);
  profile.isSuspended = false;
  profile.suspendedUntil = undefined;
  profile.suspendedReason = undefined;
  profile.moderatorNotes.push({
    note: 'Suspension lifted',
    addedBy: toOid(adminId),
    addedAt: new Date(),
  });
  await profile.save();

  createNotification({
    userId: targetId,
    type: 'general',
    title: 'Suspension Lifted',
    body: 'Your community account suspension has been removed.',
  }).catch(() => {});

  successResponse(res, 'User unsuspended');
});
