import { Request, Response } from 'express';
import SourcingStory from '../models/SourcingStory';
import { cloudinary } from '../config/cloudinary';
import { successResponse, errorResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';

function isAdmin(role: string) {
  return role === 'owner';
}

export const listStories = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20' } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter: Record<string, unknown> = {};
  if (!isAdmin(req.user?.role ?? '')) filter.isPublished = true;

  const [items, total] = await Promise.all([
    SourcingStory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v -producerStory'),
    SourcingStory.countDocuments(filter),
  ]);

  return successResponse(res, 'Sourcing stories retrieved', items, 200, {
    page: pageNum,
    limit: limitNum,
    total,
    pages: Math.ceil(total / limitNum),
  });
});

export const getStory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const filter: Record<string, unknown> = { _id: id };
  if (!isAdmin(req.user?.role ?? '')) filter.isPublished = true;

  const story = await SourcingStory.findOne(filter).select('-__v');
  if (!story) return errorResponse(res, 'Sourcing story not found', 404);
  return successResponse(res, 'Sourcing story retrieved', story);
});

export const createStory = asyncHandler(async (req: Request, res: Response) => {
  const {
    coffeeName, origin, producerName, producerStory,
    harvestSeason, videoUrl, tastingNotes, accessLevel, isPublished,
  } = req.body;

  const story = await SourcingStory.create({
    coffeeName,
    origin,
    producerName: producerName || undefined,
    producerStory: producerStory || undefined,
    harvestSeason: harvestSeason || undefined,
    videoUrl: videoUrl || undefined,
    tastingNotes: tastingNotes ?? [],
    accessLevel: accessLevel ?? 'shareholder',
    isPublished: isPublished ?? false,
    publishedAt: isPublished ? new Date() : undefined,
    createdBy: req.user?.userId,
  });

  return successResponse(res, 'Sourcing story created', story, 201);
});

export const updateStory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isPublished } = req.body;

  const updates: Record<string, unknown> = { ...req.body };
  if (isPublished === true) updates.publishedAt = new Date();

  const story = await SourcingStory.findByIdAndUpdate(id, { $set: updates }, {
    new: true,
    runValidators: true,
  }).select('-__v');

  if (!story) return errorResponse(res, 'Sourcing story not found', 404);
  return successResponse(res, 'Sourcing story updated', story);
});

export const deleteStory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const story = await SourcingStory.findByIdAndDelete(id);
  if (!story) return errorResponse(res, 'Sourcing story not found', 404);
  return successResponse(res, 'Sourcing story deleted', null);
});

export const addStoryPhoto = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const story = await SourcingStory.findById(id);
  if (!story) return errorResponse(res, 'Sourcing story not found', 404);

  const file = req.file as Express.Multer.File & { path?: string; filename?: string };
  if (!file) return errorResponse(res, 'No photo uploaded', 400);

  const url = (file as unknown as { path: string }).path;
  const publicId = (file as unknown as { filename: string }).filename;
  const { caption, stage } = req.body;

  story.photos.push({
    url,
    publicId,
    caption: caption || undefined,
    stage: stage || undefined,
  });
  await story.save();

  return successResponse(res, 'Photo added', story);
});
