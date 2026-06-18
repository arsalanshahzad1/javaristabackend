import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import BrewLog from '../models/BrewLog';
import Recipe from '../models/Recipe';
import Bean from '../models/Bean';
import EspressoShot from '../models/EspressoShot';
import { successResponse, errorResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';

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

  const filter: Record<string, unknown> = {};
  if (req.query['search']) {
    const regex = { $regex: req.query['search'] as string, $options: 'i' };
    filter['$or'] = [{ name: regex }, { email: regex }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  successResponse(res, 'Users fetched', users, 200, {
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
    if (isPremium === true) updates['subscriptionStatus'] = 'premium';
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

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params['id'];

  const user = await User.findById(userId);
  if (!user) {
    errorResponse(res, 'User not found', 404);
    return;
  }

  const objectId = new mongoose.Types.ObjectId(userId as string);

  await Promise.all([
    BrewLog.deleteMany({ user: objectId }),
    Bean.deleteMany({ user: objectId }),
    EspressoShot.deleteMany({ user: objectId }),
  ]);

  await User.findByIdAndDelete(userId);

  successResponse(res, 'User and all associated data deleted');
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

  successResponse(res, 'Recipes fetched', recipes, 200, {
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

  successResponse(res, 'Recipe updated', recipe);
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
