import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import BrewLog from '../models/BrewLog';
import BrewShare from '../models/brew-share.model';
import Recipe from '../models/Recipe';
import Bean from '../models/Bean';
import EspressoShot from '../models/EspressoShot';
import { successResponse, errorResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';
import { serializeRecipeForUi } from '../utils/recipe.mapper';

const USER_ROLES = ['community', 'investor', 'employee', 'admin'];

function serializeAdminUser(user: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
  isPremium: boolean;
  isVerified: boolean;
  followersCount?: number;
  followingCount?: number;
  createdAt?: Date;
}) {
  return {
    id: String(user._id),
    _id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    isPremium: user.isPremium,
    isVerified: user.isVerified,
    followersCount: user.followersCount ?? 0,
    followingCount: user.followingCount ?? 0,
    createdAt: user.createdAt,
  };
}

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const [
    totalUsers,
    premiumUsers,
    totalBrewLogs,
    totalRecipes,
    totalBeans,
    totalShots,
    popularMethods,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isPremium: true }),
    BrewLog.countDocuments(),
    Recipe.countDocuments(),
    Bean.countDocuments(),
    EspressoShot.countDocuments(),
    BrewLog.aggregate([
      { $group: { _id: '$brewMethod', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'brewmethods',
          localField: '_id',
          foreignField: '_id',
          as: 'method',
        },
      },
      { $unwind: { path: '$method', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, count: 1, name: '$method.name' } },
    ]),
  ]);

  successResponse(res, 'Stats fetched', {
    totalUsers,
    premiumUsers,
    totalBrewLogs,
    totalRecipes,
    totalBeans,
    totalShots,
    popularMethods,
  });
});

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(100, parseInt(req.query['limit'] as string) || 20);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { isActive: { $ne: false } };
  if (req.query['search']) {
    const regex = { $regex: req.query['search'] as string, $options: 'i' };
    filter['$or'] = [{ name: regex }, { email: regex }];
  }
  if (req.query['role']) {
    const role = String(req.query['role']);
    if (!USER_ROLES.includes(role)) {
      errorResponse(res, `Invalid role. Must be one of: ${USER_ROLES.join(', ')}`, 400);
      return;
    }
    filter['role'] = role;
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name email role isPremium isVerified followersCount followingCount createdAt')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  successResponse(res, 'Users fetched', users.map(serializeAdminUser), 200, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { role, subscriptionStatus, isPremium } = req.body;

  const updates: Record<string, unknown> = {};
  if (role !== undefined) updates['role'] = role;
  if (subscriptionStatus !== undefined) updates['subscriptionStatus'] = subscriptionStatus;
  if (isPremium !== undefined) {
    updates['isPremium'] = isPremium;
    updates['subscriptionStatus'] = isPremium === true ? 'active' : 'none';
  }

  const user = await User.findByIdAndUpdate(req.params['id'], updates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    errorResponse(res, 'User not found', 404);
    return;
  }

  successResponse(res, 'User updated', user);
});

const PREMIUM_ROLES = new Set(['investor', 'employee', 'admin']);

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { role, isPremium } = req.body;

  if (!USER_ROLES.includes(role)) {
    errorResponse(res, `Invalid role. Must be one of: ${USER_ROLES.join(', ')}`, 400);
    return;
  }

  const premium = typeof isPremium === 'boolean' ? isPremium : PREMIUM_ROLES.has(role);
  const updates: Record<string, unknown> = {
    role,
    isPremium: premium,
    subscriptionStatus: premium ? 'active' : 'none',
  };

  const user = await User.findByIdAndUpdate(req.params['userId'], updates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    errorResponse(res, 'User not found', 404);
    return;
  }

  successResponse(res, 'User role updated', serializeAdminUser(user));
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params['id'];

  const user = await User.findOneAndUpdate(
    { _id: userId, isActive: { $ne: false } },
    { isActive: false, deactivatedAt: new Date(), refreshToken: undefined },
    { new: true }
  );
  if (!user) {
    errorResponse(res, 'User not found', 404);
    return;
  }

  successResponse(res, 'User deactivated');
});

export const getAllRecipes = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(100, parseInt(req.query['limit'] as string) || 20);
  const skip = (page - 1) * limit;

  const [recipes, total] = await Promise.all([
    Recipe.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate('brewMethod', 'name')
      .populate('author', 'name'),
    Recipe.countDocuments(),
  ]);

  successResponse(res, 'Recipes fetched', recipes.map((recipe) => serializeRecipeForUi(recipe)), 200, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

export const publishRecipe = asyncHandler(async (req: Request, res: Response) => {
  const { isPublished, isFeatured } = req.body;

  const updates: Record<string, unknown> = {};
  if (isPublished !== undefined) updates['isPublished'] = isPublished;
  if (isFeatured !== undefined) updates['isFeatured'] = isFeatured;

  const recipe = await Recipe.findByIdAndUpdate(req.params['id'], updates, {
    new: true,
    runValidators: true,
  });

  if (!recipe) {
    errorResponse(res, 'Recipe not found', 404);
    return;
  }

  await recipe.populate([
    { path: 'brewMethod', select: 'name' },
    { path: 'author', select: 'name' },
  ]);
  successResponse(res, 'Recipe updated', serializeRecipeForUi(recipe));
});

export const deleteRecipe = asyncHandler(async (req: Request, res: Response) => {
  const recipe = await Recipe.findByIdAndDelete(req.params['id']);
  if (!recipe) {
    errorResponse(res, 'Recipe not found', 404);
    return;
  }
  successResponse(res, 'Recipe deleted');
});

export const getAllBrewLogs = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(100, parseInt(req.query['limit'] as string) || 20);
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    BrewLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name')
      .populate('brewMethod', 'name'),
    BrewLog.countDocuments(),
  ]);

  successResponse(res, 'Brew logs fetched', logs, 200, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

// ─── Community Moderation ─────────────────────────────────────────────────────

export const getCommunityShares = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(100, parseInt(req.query['limit'] as string) || 20);
  const skip = (page - 1) * limit;

  const { userId, search, startDate, endDate } = req.query;

  const initialMatch: Record<string, unknown> = {};
  if (userId && mongoose.isValidObjectId(userId as string)) {
    initialMatch['user'] = new mongoose.Types.ObjectId(userId as string);
  }
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter['$gte'] = new Date(startDate as string);
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      dateFilter['$lte'] = end;
    }
    initialMatch['createdAt'] = dateFilter;
  }

  const basePipeline = [
    { $match: initialMatch },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userArr',
      },
    },
    { $unwind: { path: '$userArr', preserveNullAndEmptyArrays: true } },
  ];

  const searchStage = search
    ? [
        {
          $match: {
            $or: [
              { caption: { $regex: search as string, $options: 'i' } },
              { 'userArr.name': { $regex: search as string, $options: 'i' } },
            ],
          },
        },
      ]
    : [];

  const dataPipeline = [
    ...basePipeline,
    ...searchStage,
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'brewlogs',
        localField: 'brewLog',
        foreignField: '_id',
        as: 'brewLogArr',
      },
    },
    { $unwind: { path: '$brewLogArr', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'brewmethods',
        localField: 'brewLogArr.brewMethod',
        foreignField: '_id',
        as: 'methodArr',
      },
    },
    { $unwind: { path: '$methodArr', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        caption: 1,
        likesCount: 1,
        createdAt: 1,
        user: {
          _id: '$userArr._id',
          name: '$userArr.name',
          avatar: '$userArr.avatar',
        },
        brewLog: {
          _id: '$brewLogArr._id',
          rating: '$brewLogArr.rating',
          tasteNotes: '$brewLogArr.tasteNotes',
          comments: '$brewLogArr.comments',
          brewMethod: { name: '$methodArr.name' },
        },
      },
    },
  ];

  const countPipeline = [...basePipeline, ...searchStage, { $count: 'total' }];

  const [shares, countResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    BrewShare.aggregate(dataPipeline as any[]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    BrewShare.aggregate(countPipeline as any[]),
  ]);

  const total = (countResult[0] as { total?: number } | undefined)?.total ?? 0;

  successResponse(res, 'Community shares fetched', shares, 200, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

export const deleteCommunityShare = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    errorResponse(res, 'Invalid share ID', 400);
    return;
  }

  const share = await BrewShare.findByIdAndDelete(id);
  if (!share) {
    errorResponse(res, 'Share not found', 404);
    return;
  }

  successResponse(res, 'Share deleted');
});

export const getCommunityUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.aggregate([
    { $match: { isActive: { $ne: false } } },
    {
      $lookup: {
        from: 'brewshares',
        localField: '_id',
        foreignField: 'user',
        as: 'sharesDocs',
      },
    },
    { $addFields: { totalShares: { $size: '$sharesDocs' } } },
    {
      $match: {
        $or: [{ totalShares: { $gte: 1 } }, { followersCount: { $gte: 1 } }],
      },
    },
    {
      $project: {
        name: 1,
        email: 1,
        role: 1,
        followersCount: 1,
        followingCount: 1,
        totalShares: 1,
        createdAt: 1,
      },
    },
    { $sort: { totalShares: -1 } },
  ]);

  successResponse(res, 'Community users fetched', users);
});
