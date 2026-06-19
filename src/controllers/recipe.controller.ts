import { Request, Response } from 'express';
import Recipe from '../models/Recipe';
import { successResponse, errorResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';
import { normalizeRecipeForDb, serializeRecipeForUi } from '../utils/recipe.mapper';

export const getAllRecipes = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, parseInt(req.query['limit'] as string) || 10);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { isPublished: true };

  if (req.query['brewMethod']) filter['brewMethod'] = req.query['brewMethod'];
  if (req.query['difficulty']) filter['difficulty'] = req.query['difficulty'];
  if (req.query['tags']) filter['tags'] = { $in: (req.query['tags'] as string).split(',') };
  if (req.query['search']) {
    filter['name'] = { $regex: req.query['search'] as string, $options: 'i' };
  }

  const [recipes, total] = await Promise.all([
    Recipe.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Recipe.countDocuments(filter),
  ]);

  successResponse(res, 'Recipes fetched', recipes, 200, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

export const getFeaturedRecipes = asyncHandler(async (_req: Request, res: Response) => {
  const recipes = await Recipe.find({ isFeatured: true, isPublished: true })
    .limit(5)
    .populate('brewMethod', 'name');
  successResponse(res, 'Featured recipes fetched', recipes);
});

export const getRecipe = asyncHandler(async (req: Request, res: Response) => {
  const recipe = await Recipe.findById(req.params['id'])
    .populate('brewMethod', 'name')
    .populate('author', 'name avatar');
  if (!recipe) {
    errorResponse(res, 'Recipe not found', 404);
    return;
  }
  successResponse(res, 'Recipe fetched', serializeRecipeForUi(recipe));
});

export const createRecipe = asyncHandler(async (req: Request, res: Response) => {
  const recipe = await Recipe.create({
    ...normalizeRecipeForDb(req.body),
    author: req.user!.userId,
    isPublished: false,
  });
  const populated = await recipe.populate([
    { path: 'brewMethod', select: 'name' },
    { path: 'author', select: 'name avatar' },
  ]);
  successResponse(res, 'Recipe created', serializeRecipeForUi(populated), 201);
});

export const updateRecipe = asyncHandler(async (req: Request, res: Response) => {
  const recipe = await Recipe.findById(req.params['id']);
  if (!recipe) {
    errorResponse(res, 'Recipe not found', 404);
    return;
  }

  const isOwner = recipe.author.toString() === req.user!.userId;
  const isAdmin = req.user!.role === 'admin';
  if (!isOwner && !isAdmin) {
    errorResponse(res, 'Not authorized to update this recipe', 403);
    return;
  }

  const updated = await Recipe.findByIdAndUpdate(req.params['id'], normalizeRecipeForDb(req.body), {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    errorResponse(res, 'Recipe not found', 404);
    return;
  }

  await updated.populate([
    { path: 'brewMethod', select: 'name' },
    { path: 'author', select: 'name avatar' },
  ]);
  successResponse(res, 'Recipe updated', serializeRecipeForUi(updated));
});

export const deleteRecipe = asyncHandler(async (req: Request, res: Response) => {
  const recipe = await Recipe.findById(req.params['id']);
  if (!recipe) {
    errorResponse(res, 'Recipe not found', 404);
    return;
  }

  const isOwner = recipe.author.toString() === req.user!.userId;
  const isAdmin = req.user!.role === 'admin';
  if (!isOwner && !isAdmin) {
    errorResponse(res, 'Not authorized to delete this recipe', 403);
    return;
  }

  await Recipe.findByIdAndDelete(req.params['id']);
  successResponse(res, 'Recipe deleted');
});

export const likeRecipe = asyncHandler(async (req: Request, res: Response) => {
  const recipe = await Recipe.findByIdAndUpdate(
    req.params['id'],
    { $inc: { likesCount: 1 } },
    { new: true }
  );
  if (!recipe) {
    errorResponse(res, 'Recipe not found', 404);
    return;
  }
  successResponse(res, 'Recipe liked', { likesCount: recipe.likesCount });
});

export const getSavedRecipes = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, 'Coming soon', []);
});
