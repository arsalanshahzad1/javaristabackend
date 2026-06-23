import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Follow from '../models/follow.model';
import BrewShare from '../models/brew-share.model';
import Certification from '../models/certification.model';
import BrewLog from '../models/BrewLog';
import { successResponse, errorResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';

const toOid = (id: string) => new mongoose.Types.ObjectId(id);

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

  const [recentShares, certifications] = await Promise.all([
    BrewShare.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('brewLog', 'rating tasteNotes comments completedAt brewMethod')
      .lean(),
    Certification.find({ user: userId, status: 'active' })
      .select('type issuedAt certificateNumber')
      .sort({ issuedAt: -1 })
      .lean(),
  ]);

  successResponse(res, 'Profile fetched', { user, recentShares, certifications });
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
  } else {
    share.likes.push(userOid);
    share.likesCount += 1;
  }

  await share.save();

  successResponse(res, alreadyLiked ? 'Like removed' : 'Like added', {
    liked: !alreadyLiked,
    likesCount: share.likesCount,
  });
});
