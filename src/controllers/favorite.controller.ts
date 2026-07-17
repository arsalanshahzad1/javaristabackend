import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Favorite, { FAVORITE_ITEM_TYPES, FavoriteItemType } from '../models/favorite.model';
import Recipe from '../models/Recipe';
import BrewMethod from '../models/BrewMethod';
import Bean from '../models/Bean';
import { successResponse, errorResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';

const MODELS_BY_TYPE: Record<FavoriteItemType, mongoose.Model<any>> = {
  Recipe,
  BrewMethod,
  Bean,
};

export const toggleFavorite = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { itemType, itemId } = req.body as { itemType?: string; itemId?: string };

  if (!itemType || !FAVORITE_ITEM_TYPES.includes(itemType as FavoriteItemType)) {
    errorResponse(res, 'itemType must be one of Recipe, BrewMethod, Bean', 400);
    return;
  }
  if (!itemId || !mongoose.isValidObjectId(itemId)) {
    errorResponse(res, 'Invalid itemId', 400);
    return;
  }

  const item = await MODELS_BY_TYPE[itemType as FavoriteItemType].findById(itemId);
  if (!item) {
    errorResponse(res, `${itemType} not found`, 404);
    return;
  }

  const existing = await Favorite.findOne({
    user: userId,
    itemType: itemType as FavoriteItemType,
    itemId,
  });
  if (existing) {
    await existing.deleteOne();
    successResponse(res, 'Removed from favorites', { favorited: false });
    return;
  }

  await Favorite.create({ user: userId, itemType: itemType as FavoriteItemType, itemId });
  successResponse(res, 'Added to favorites', { favorited: true }, 201);
});

export const getFavoriteStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { itemType, itemId } = req.query as { itemType?: string; itemId?: string };

  if (!itemType || !FAVORITE_ITEM_TYPES.includes(itemType as FavoriteItemType)) {
    errorResponse(res, 'itemType must be one of Recipe, BrewMethod, Bean', 400);
    return;
  }
  if (!itemId || !mongoose.isValidObjectId(itemId)) {
    errorResponse(res, 'Invalid itemId', 400);
    return;
  }

  const existing = await Favorite.findOne({
    user: userId,
    itemType: itemType as FavoriteItemType,
    itemId,
  });
  successResponse(res, 'Favorite status fetched', { favorited: !!existing });
});

export const getMyFavorites = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { itemType } = req.query as { itemType?: string };

  if (itemType && !FAVORITE_ITEM_TYPES.includes(itemType as FavoriteItemType)) {
    errorResponse(res, 'itemType must be one of Recipe, BrewMethod, Bean', 400);
    return;
  }

  const favorites = await Favorite.find({
    user: userId,
    ...(itemType ? { itemType: itemType as FavoriteItemType } : {}),
  })
    .sort({ createdAt: -1 })
    .populate('itemId');

  const data = favorites
    .filter((f) => f.itemId != null)
    .map((f) => ({
      id: f._id,
      itemType: f.itemType,
      item: f.itemId,
      createdAt: f.createdAt,
    }));

  successResponse(res, 'Favorites fetched', data);
});
