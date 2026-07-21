import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Collection from '../models/collection.model';
import Recipe from '../models/Recipe';
import { successResponse, errorResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';
import { serializeRecipeForUi } from '../utils/recipe.mapper';

export const getMyCollections = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const collections = await Collection.find({ user: userId }).sort({ updatedAt: -1 });

  const data = collections.map((c) => ({
    id: c._id,
    name: c.name,
    recipeCount: c.recipes.length,
    updatedAt: c.updatedAt,
  }));

  successResponse(res, 'Collections fetched', data);
});

export const createCollection = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { name } = req.body as { name?: string };

  if (!name || !name.trim()) {
    errorResponse(res, 'Collection name is required', 400);
    return;
  }

  const collection = await Collection.create({ user: userId, name: name.trim(), recipes: [] });
  successResponse(
    res,
    'Collection created',
    { id: collection._id, name: collection.name, recipeCount: 0, updatedAt: collection.updatedAt },
    201
  );
});

export const getCollection = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    errorResponse(res, 'Invalid collection ID', 400);
    return;
  }

  const collection = await Collection.findById(id).populate({
    path: 'recipes',
    populate: { path: 'brewMethod', select: 'name' },
  });

  if (!collection) {
    errorResponse(res, 'Collection not found', 404);
    return;
  }
  if (collection.user.toString() !== userId) {
    errorResponse(res, 'Access denied', 403);
    return;
  }

  successResponse(res, 'Collection fetched', {
    id: collection._id,
    name: collection.name,
    recipes: collection.recipes.map((r) => serializeRecipeForUi(r)),
    updatedAt: collection.updatedAt,
  });
});

export const renameCollection = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const { name } = req.body as { name?: string };

  if (!mongoose.isValidObjectId(id)) {
    errorResponse(res, 'Invalid collection ID', 400);
    return;
  }
  if (!name || !name.trim()) {
    errorResponse(res, 'Collection name is required', 400);
    return;
  }

  const collection = await Collection.findById(id);
  if (!collection) {
    errorResponse(res, 'Collection not found', 404);
    return;
  }
  if (collection.user.toString() !== userId) {
    errorResponse(res, 'Access denied', 403);
    return;
  }

  collection.name = name.trim();
  await collection.save();

  successResponse(res, 'Collection renamed', { id: collection._id, name: collection.name });
});

export const deleteCollection = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    errorResponse(res, 'Invalid collection ID', 400);
    return;
  }

  const collection = await Collection.findById(id);
  if (!collection) {
    errorResponse(res, 'Collection not found', 404);
    return;
  }
  if (collection.user.toString() !== userId) {
    errorResponse(res, 'Access denied', 403);
    return;
  }

  await collection.deleteOne();
  successResponse(res, 'Collection deleted');
});

export const addRecipeToCollection = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const { recipeId } = req.body as { recipeId?: string };

  if (!mongoose.isValidObjectId(id)) {
    errorResponse(res, 'Invalid collection ID', 400);
    return;
  }
  if (!recipeId || !mongoose.isValidObjectId(recipeId)) {
    errorResponse(res, 'Invalid recipeId', 400);
    return;
  }

  const [collection, recipe] = await Promise.all([
    Collection.findById(id),
    Recipe.findById(recipeId),
  ]);

  if (!collection) {
    errorResponse(res, 'Collection not found', 404);
    return;
  }
  if (collection.user.toString() !== userId) {
    errorResponse(res, 'Access denied', 403);
    return;
  }
  if (!recipe) {
    errorResponse(res, 'Recipe not found', 404);
    return;
  }

  const alreadyIn = collection.recipes.some((r) => r.toString() === recipeId);
  if (!alreadyIn) {
    collection.recipes.push(recipe._id as mongoose.Types.ObjectId);
    await collection.save();
  }

  successResponse(res, 'Recipe added to collection', { recipeCount: collection.recipes.length });
});

export const removeRecipeFromCollection = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { id, recipeId } = req.params;

  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(recipeId)) {
    errorResponse(res, 'Invalid ID', 400);
    return;
  }

  const collection = await Collection.findById(id);
  if (!collection) {
    errorResponse(res, 'Collection not found', 404);
    return;
  }
  if (collection.user.toString() !== userId) {
    errorResponse(res, 'Access denied', 403);
    return;
  }

  collection.recipes = collection.recipes.filter((r) => r.toString() !== recipeId);
  await collection.save();

  successResponse(res, 'Recipe removed from collection', { recipeCount: collection.recipes.length });
});
