import { Request, Response } from 'express';
import mongoose from 'mongoose';
import BrewLog from '../models/BrewLog';
import Recipe from '../models/Recipe';
import { successResponse, errorResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';

export const getBrewLogs = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, parseInt(req.query['limit'] as string) || 10);
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    BrewLog.find({ user: req.user!.userId })
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('brewMethod', 'name')
      .populate('recipe', 'name'),
    BrewLog.countDocuments({ user: req.user!.userId }),
  ]);

  successResponse(res, 'Brew logs fetched', logs, 200, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

export const getBrewStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalBrews, ratingResult, thisMonth] = await Promise.all([
    BrewLog.countDocuments({ user: userId }),
    BrewLog.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), rating: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } },
    ]),
    BrewLog.countDocuments({ user: userId, completedAt: { $gte: startOfMonth } }),
  ]);

  const avgRating = ratingResult[0]?.avgRating
    ? parseFloat(ratingResult[0].avgRating.toFixed(2))
    : null;

  successResponse(res, 'Brew stats fetched', { totalBrews, avgRating, thisMonth });
});

export const getBrewLog = asyncHandler(async (req: Request, res: Response) => {
  const log = await BrewLog.findById(req.params['id'])
    .populate('brewMethod', 'name')
    .populate('recipe', 'name');

  if (!log) {
    errorResponse(res, 'Brew log not found', 404);
    return;
  }

  if (log.user.toString() !== req.user!.userId) {
    errorResponse(res, 'Not authorized to view this log', 403);
    return;
  }

  successResponse(res, 'Brew log fetched', log);
});

export const createBrewLog = asyncHandler(async (req: Request, res: Response) => {
  const log = await BrewLog.create({ ...req.body, user: req.user!.userId });

  if (req.body.recipe) {
    await Recipe.findByIdAndUpdate(req.body.recipe, { $inc: { brewCount: 1 } });
  }

  successResponse(res, 'Brew log created', log, 201);
});

export const updateBrewLog = asyncHandler(async (req: Request, res: Response) => {
  const log = await BrewLog.findById(req.params['id']);
  if (!log) {
    errorResponse(res, 'Brew log not found', 404);
    return;
  }

  if (log.user.toString() !== req.user!.userId) {
    errorResponse(res, 'Not authorized to update this log', 403);
    return;
  }

  const updated = await BrewLog.findByIdAndUpdate(req.params['id'], req.body, {
    new: true,
    runValidators: true,
  });
  successResponse(res, 'Brew log updated', updated);
});

export const deleteBrewLog = asyncHandler(async (req: Request, res: Response) => {
  const log = await BrewLog.findById(req.params['id']);
  if (!log) {
    errorResponse(res, 'Brew log not found', 404);
    return;
  }

  if (log.user.toString() !== req.user!.userId) {
    errorResponse(res, 'Not authorized to delete this log', 403);
    return;
  }

  await BrewLog.findByIdAndDelete(req.params['id']);
  successResponse(res, 'Brew log deleted');
});
