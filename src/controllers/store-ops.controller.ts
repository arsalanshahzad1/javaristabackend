import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import StoreRecipe, { STORE_RECIPE_CATEGORIES, StoreRecipeCategory } from '../models/store-recipe.model';
import RecipePrepLog from '../models/RecipePrepLog';
import mongoose from 'mongoose';
import { userHasRecipeCertification } from '../services/certification.service';

const MANAGEMENT_ROLES = new Set(['shift_supervisor', 'store_manager', 'assistant_manager', 'area_manager', 'regional_manager', 'coo', 'cfo', 'ceo', 'owner', 'hr_manager', 'marketing_manager']);

function stripCostData(recipe: Record<string, unknown>, role?: string): Record<string, unknown> {
  if (!role || !MANAGEMENT_ROLES.has(role)) {
    const { costInfo: _c, ...rest } = recipe;
    return rest;
  }
  return recipe;
}

// GET /api/store-ops/recipes
export const listRecipes = asyncHandler(async (req: Request, res: Response) => {
  const { category, search } = req.query;
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] as string) || 20));
  const skip = (page - 1) * limit;
  const role = req.user?.role;

  const filter: Record<string, unknown> = { isActive: true };

  if (category) {
    if (!STORE_RECIPE_CATEGORIES.includes(category as StoreRecipeCategory)) {
      errorResponse(res, `Invalid category. Valid values: ${STORE_RECIPE_CATEGORIES.join(', ')}`, 400);
      return;
    }
    filter['category'] = category;
  }

  if (search) filter['$text'] = { $search: search as string };

  if (role) {
    filter['$or'] = [
      { visibilityRoles: { $size: 0 } },
      { visibilityRoles: role },
    ];
  }

  const [recipes, total] = await Promise.all([
    StoreRecipe.find(filter)
      .select('-qualityStandards -commonMistakes -__v')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort(search ? ({ score: { $meta: 'textScore' } } as any) : { createdAt: -1 })
      .skip(skip)
      .limit(limit),
    StoreRecipe.countDocuments(filter),
  ]);

  const data = recipes.map((r) => stripCostData(r.toObject() as unknown as Record<string, unknown>, role));

  successResponse(res, 'Store recipes fetched', data, 200, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

// GET /api/store-ops/recipes/:slug
export const getRecipe = asyncHandler(async (req: Request, res: Response) => {
  const role = req.user?.role;
  const filter: Record<string, unknown> = { slug: req.params['slug'], isActive: true };

  if (role) {
    filter['$or'] = [
      { visibilityRoles: { $size: 0 } },
      { visibilityRoles: role },
    ];
  }

  const recipe = await StoreRecipe.findOne(filter).select('-__v');

  if (!recipe) {
    errorResponse(res, 'Recipe not found', 404);
    return;
  }

  successResponse(res, 'Store recipe fetched', stripCostData(recipe.toObject() as unknown as Record<string, unknown>, role));
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
    visibilityRoles,
    performanceData,
    stationAssignment,
    certificationRequired,
    requiredCertifications,
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
    costInfo?: { ingredientCost?: number; laborCost?: number; totalCost?: number; sellingPrice?: number; margin?: number };
    qualityStandards?: string;
    commonMistakes?: string[];
    requiredEquipment?: string[];
    visibilityRoles?: string[];
    performanceData?: { targetPrepSeconds?: number };
    stationAssignment?: string;
    certificationRequired?: boolean;
    requiredCertifications?: string[];
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
    visibilityRoles: (visibilityRoles ?? []) as import('../models/User').UserRole[],
    performanceData: performanceData ?? { storeAverages: [] },
    stationAssignment,
    certificationRequired: certificationRequired ?? false,
    requiredCertifications: requiredCertifications ?? [],
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
    costInfo?: { ingredientCost?: number; laborCost?: number; totalCost?: number; sellingPrice?: number; margin?: number };
    qualityStandards?: string;
    commonMistakes?: string[];
    requiredEquipment?: string[];
    isActive?: boolean;
    visibilityRoles?: string[];
    performanceData?: { targetPrepSeconds?: number };
    stationAssignment?: string;
    certificationRequired?: boolean;
    requiredCertifications?: string[];
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
  if (updates.visibilityRoles !== undefined) recipe.visibilityRoles = updates.visibilityRoles as typeof recipe.visibilityRoles;
  if (updates.stationAssignment !== undefined) recipe.stationAssignment = updates.stationAssignment;
  if (updates.certificationRequired !== undefined) recipe.certificationRequired = updates.certificationRequired;
  if (updates.requiredCertifications !== undefined) recipe.requiredCertifications = updates.requiredCertifications;

  await recipe.save();

  successResponse(res, 'Store recipe updated', recipe);
});

// POST /api/store-ops/recipes/:id/quality-photos
export const addQualityPhoto = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  if (!mongoose.isValidObjectId(id)) {
    errorResponse(res, 'Invalid recipe ID', 400);
    return;
  }

  const recipe = await StoreRecipe.findById(id);
  if (!recipe) {
    errorResponse(res, 'Recipe not found', 404);
    return;
  }

  const { type, url, publicId, caption } = req.body as {
    type?: string;
    url?: string;
    publicId?: string;
    caption?: string;
  };

  if (!type || !['correct', 'incorrect'].includes(type)) {
    errorResponse(res, "type must be 'correct' or 'incorrect'", 400);
    return;
  }
  if (!url || !publicId || !caption) {
    errorResponse(res, 'url, publicId, and caption are required', 400);
    return;
  }

  recipe.qualityPhotos.push({
    type: type as 'correct' | 'incorrect',
    url,
    publicId,
    caption: caption.trim(),
    uploadedBy: new (require('mongoose').Types.ObjectId)(req.user!.userId) as import('mongoose').Types.ObjectId,
    uploadedAt: new Date(),
  } as typeof recipe.qualityPhotos[number]);

  await recipe.save();

  successResponse(res, 'Quality photo added', recipe.qualityPhotos);
});

// DELETE /api/store-ops/recipes/:id/quality-photos/:photoId
export const deleteQualityPhoto = asyncHandler(async (req: Request, res: Response) => {
  const { id, photoId } = req.params as { id: string; photoId: string };

  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(photoId)) {
    errorResponse(res, 'Invalid ID', 400);
    return;
  }

  const recipe = await StoreRecipe.findById(id);
  if (!recipe) {
    errorResponse(res, 'Recipe not found', 404);
    return;
  }

  const photo = recipe.qualityPhotos.find((p) => p._id.toString() === photoId);
  if (!photo) {
    errorResponse(res, 'Photo not found', 404);
    return;
  }

  // Destroy from Cloudinary
  try {
    const { cloudinary } = await import('../config/cloudinary');
    await cloudinary.uploader.destroy(photo.publicId);
  } catch {
    // Non-fatal: remove from DB even if Cloudinary fails
  }

  recipe.qualityPhotos = recipe.qualityPhotos.filter(
    (p) => p._id.toString() !== photoId
  ) as typeof recipe.qualityPhotos;

  await recipe.save();

  successResponse(res, 'Quality photo deleted', recipe.qualityPhotos);
});

// GET /api/store-ops/recipes/:id/cert-check
export const checkRecipeCert = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  if (!mongoose.isValidObjectId(id)) {
    errorResponse(res, 'Invalid recipe ID', 400);
    return;
  }
  const certCheck = await userHasRecipeCertification({
    userId: req.user!.userId,
    recipeId: id,
  });
  successResponse(res, 'Certification check', certCheck);
});

// POST /api/store-ops/recipes/:id/prep-log
export const logPrepTime = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  if (!mongoose.isValidObjectId(id)) {
    errorResponse(res, 'Invalid recipe ID', 400);
    return;
  }

  const certCheck = await userHasRecipeCertification({
    userId: req.user!.userId,
    recipeId: id,
  });
  if (!certCheck.certified) {
    res.status(403).json({
      message: 'You are not certified to prepare this recipe.',
      missingCerts: certCheck.missingCerts,
      heldCerts: certCheck.heldCerts,
    });
    return;
  }

  const recipe = await StoreRecipe.findById(id);
  if (!recipe) {
    errorResponse(res, 'Recipe not found', 404);
    return;
  }

  const { prepSeconds, size, notes } = req.body as {
    prepSeconds?: number;
    size?: string;
    notes?: string;
  };

  if (!prepSeconds || prepSeconds < 1) {
    errorResponse(res, 'prepSeconds must be a positive number', 400);
    return;
  }
  if (!size) {
    errorResponse(res, 'size is required', 400);
    return;
  }

  const storeId = req.user?.storeId ?? 'unknown';
  const userId = new (require('mongoose').Types.ObjectId)(req.user!.userId) as import('mongoose').Types.ObjectId;

  await RecipePrepLog.create({
    recipeId: recipe._id,
    userId,
    storeId,
    prepSeconds,
    size,
    notes,
    loggedAt: new Date(),
  });

  // Recompute this store's average
  const storeAggResult = await RecipePrepLog.aggregate<{ avgSecs: number; count: number }>([
    { $match: { recipeId: recipe._id, storeId } },
    { $group: { _id: null, avgSecs: { $avg: '$prepSeconds' }, count: { $sum: 1 } } },
  ]);

  const storeAvg = storeAggResult[0]?.avgSecs ?? prepSeconds;
  const storeSampleCount = storeAggResult[0]?.count ?? 1;

  const existing = recipe.performanceData.storeAverages.find((s) => s.storeId === storeId);
  if (existing) {
    existing.avgPrepSeconds = Math.round(storeAvg);
    existing.sampleCount = storeSampleCount;
    existing.lastUpdated = new Date();
  } else {
    recipe.performanceData.storeAverages.push({
      storeId,
      avgPrepSeconds: Math.round(storeAvg),
      sampleCount: storeSampleCount,
      lastUpdated: new Date(),
    });
  }

  // Recompute company-wide average
  const allAverages = recipe.performanceData.storeAverages;
  if (allAverages.length > 0) {
    const total = allAverages.reduce((sum, s) => sum + s.avgPrepSeconds, 0);
    recipe.performanceData.companyAvgPrepSeconds = Math.round(total / allAverages.length);
  }

  await recipe.save();

  successResponse(res, 'Prep time logged', {
    logged: true,
    yourTime: prepSeconds,
    storeAvg: Math.round(storeAvg),
    companyAvg: recipe.performanceData.companyAvgPrepSeconds ?? Math.round(storeAvg),
  });
});

// GET /api/store-ops/recipes/:id/performance
export const getPerformance = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  if (!mongoose.isValidObjectId(id)) {
    errorResponse(res, 'Invalid recipe ID', 400);
    return;
  }

  const recipe = await StoreRecipe.findById(id).select('name performanceData targetPrepTimeSeconds');
  if (!recipe) {
    errorResponse(res, 'Recipe not found', 404);
    return;
  }

  const sorted = [...recipe.performanceData.storeAverages].sort(
    (a, b) => a.avgPrepSeconds - b.avgPrepSeconds
  );

  successResponse(res, 'Performance data fetched', {
    performanceData: recipe.performanceData,
    targetPrepTimeSeconds: recipe.targetPrepTimeSeconds,
    top5Fastest: sorted.slice(0, 5),
    top5Slowest: sorted.slice(-5).reverse(),
  });
});
