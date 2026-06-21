import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import StoreRecipe, { STORE_RECIPE_CATEGORIES, StoreRecipeCategory } from '../models/store-recipe.model';

// GET /api/store-ops/recipes
export const listRecipes = asyncHandler(async (req: Request, res: Response) => {
  const { category, search } = req.query;
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] as string) || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { isActive: true };

  if (category) {
    if (!STORE_RECIPE_CATEGORIES.includes(category as StoreRecipeCategory)) {
      errorResponse(res, `Invalid category. Valid values: ${STORE_RECIPE_CATEGORIES.join(', ')}`, 400);
      return;
    }
    filter['category'] = category;
  }

  if (search) filter['$text'] = { $search: search as string };

  const [recipes, total] = await Promise.all([
    StoreRecipe.find(filter)
      .select('-qualityStandards -commonMistakes -__v')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort(search ? ({ score: { $meta: 'textScore' } } as any) : { createdAt: -1 })
      .skip(skip)
      .limit(limit),
    StoreRecipe.countDocuments(filter),
  ]);

  successResponse(res, 'Store recipes fetched', recipes, 200, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

// GET /api/store-ops/recipes/:slug
export const getRecipe = asyncHandler(async (req: Request, res: Response) => {
  const recipe = await StoreRecipe.findOne({ slug: req.params['slug'], isActive: true }).select('-__v');

  if (!recipe) {
    errorResponse(res, 'Recipe not found', 404);
    return;
  }

  successResponse(res, 'Store recipe fetched', recipe);
});

// POST /api/store-ops/recipes
export const createRecipe = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    slug,
    category,
    sizes,
    buildOrder,
    photos,
    videoUrl,
    targetPrepTimeSeconds,
    costInfo,
    qualityStandards,
    commonMistakes,
    requiredEquipment,
  } = req.body as {
    name?: string;
    slug?: string;
    category?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sizes?: any[];
    buildOrder?: string[];
    photos?: string[];
    videoUrl?: string;
    targetPrepTimeSeconds?: number;
    costInfo?: { ingredientCost?: number; sellingPrice?: number };
    qualityStandards?: string;
    commonMistakes?: string[];
    requiredEquipment?: string[];
  };

  if (!name || !category) {
    errorResponse(res, 'name and category are required', 400);
    return;
  }

  if (!STORE_RECIPE_CATEGORIES.includes(category as StoreRecipeCategory)) {
    errorResponse(res, `Invalid category. Valid values: ${STORE_RECIPE_CATEGORIES.join(', ')}`, 400);
    return;
  }

  const recipe = await StoreRecipe.create({
    name,
    slug,
    category: category as StoreRecipeCategory,
    sizes: sizes ?? [],
    buildOrder: buildOrder ?? [],
    photos: photos ?? [],
    videoUrl,
    targetPrepTimeSeconds,
    costInfo: costInfo ?? {},
    qualityStandards,
    commonMistakes: commonMistakes ?? [],
    requiredEquipment: requiredEquipment ?? [],
  });

  successResponse(res, 'Store recipe created', recipe, 201);
});

// PUT /api/store-ops/recipes/:slug
export const updateRecipe = asyncHandler(async (req: Request, res: Response) => {
  const recipe = await StoreRecipe.findOne({ slug: req.params['slug'], isActive: true });

  if (!recipe) {
    errorResponse(res, 'Recipe not found', 404);
    return;
  }

  const updates = req.body as {
    name?: string;
    slug?: string;
    category?: StoreRecipeCategory;
    sizes?: unknown[];
    buildOrder?: string[];
    photos?: string[];
    videoUrl?: string;
    targetPrepTimeSeconds?: number;
    costInfo?: { ingredientCost?: number; sellingPrice?: number };
    qualityStandards?: string;
    commonMistakes?: string[];
    requiredEquipment?: string[];
    isActive?: boolean;
  };

  if (updates.name !== undefined) recipe.name = updates.name;
  if (updates.slug !== undefined) recipe.slug = updates.slug;
  if (updates.category !== undefined) {
    if (!STORE_RECIPE_CATEGORIES.includes(updates.category)) {
      errorResponse(res, `Invalid category. Valid values: ${STORE_RECIPE_CATEGORIES.join(', ')}`, 400);
      return;
    }
    recipe.category = updates.category;
  }
  if (updates.sizes !== undefined) recipe.sizes = updates.sizes as typeof recipe.sizes;
  if (updates.buildOrder !== undefined) recipe.buildOrder = updates.buildOrder;
  if (updates.photos !== undefined) recipe.photos = updates.photos;
  if (updates.videoUrl !== undefined) recipe.videoUrl = updates.videoUrl;
  if (updates.targetPrepTimeSeconds !== undefined) recipe.targetPrepTimeSeconds = updates.targetPrepTimeSeconds;
  if (updates.costInfo !== undefined) recipe.costInfo = updates.costInfo;
  if (updates.qualityStandards !== undefined) recipe.qualityStandards = updates.qualityStandards;
  if (updates.commonMistakes !== undefined) recipe.commonMistakes = updates.commonMistakes;
  if (updates.requiredEquipment !== undefined) recipe.requiredEquipment = updates.requiredEquipment;
  if (updates.isActive !== undefined) recipe.isActive = updates.isActive;

  await recipe.save();

  successResponse(res, 'Store recipe updated', recipe);
});
