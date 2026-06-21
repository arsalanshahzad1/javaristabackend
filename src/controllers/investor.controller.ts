import { Request, Response } from 'express';
import ExclusiveContent from '../models/exclusive-content.model';
import { successResponse, errorResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';

export const listContent = asyncHandler(async (req: Request, res: Response) => {
  const { contentType, page = '1', limit = '10', includeInactive } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter: Record<string, unknown> = {};
  if (includeInactive !== 'true') filter.isActive = true;
  if (contentType) filter.contentType = contentType;

  const [items, total] = await Promise.all([
    ExclusiveContent.find(filter)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v'),
    ExclusiveContent.countDocuments(filter),
  ]);

  return successResponse(res, 'Exclusive content retrieved', items, 200, {
    page: pageNum,
    limit: limitNum,
    total,
    pages: Math.ceil(total / limitNum),
  });
});

export const getContentBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const filter: Record<string, unknown> = { slug };
  if (req.user?.role !== 'admin') filter.isActive = true;

  const item = await ExclusiveContent.findOne(filter).select('-__v');
  if (!item) {
    return errorResponse(res, 'Content not found', 404);
  }

  return successResponse(res, 'Content retrieved', item);
});

export const createContent = asyncHandler(async (req: Request, res: Response) => {
  const { title, slug, contentType, body, videoUrl, mediaUrls, publishedAt, tags, isActive } = req.body;

  const content = await ExclusiveContent.create({
    title,
    slug: slug || undefined,
    contentType,
    body,
    videoUrl,
    mediaUrls: mediaUrls ?? [],
    publishedAt,
    tags: tags ?? [],
    isActive: isActive ?? true,
  });

  return successResponse(res, 'Content created', content, 201);
});

export const updateContent = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const content = await ExclusiveContent.findOneAndUpdate(
    { slug },
    { $set: req.body },
    { new: true, runValidators: true },
  ).select('-__v');

  if (!content) {
    return errorResponse(res, 'Content not found', 404);
  }

  return successResponse(res, 'Content updated', content);
});

export const deleteContent = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const content = await ExclusiveContent.findOneAndUpdate(
    { slug },
    { $set: { isActive: false } },
    { new: true },
  );

  if (!content) {
    return errorResponse(res, 'Content not found', 404);
  }

  return successResponse(res, 'Content deleted', null);
});

export const listEvents = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();

  const events = await ExclusiveContent.find({
    contentType: 'event',
    publishedAt: { $gte: now },
    isActive: true,
  })
    .sort({ publishedAt: 1 })
    .select('-__v');

  return successResponse(res, 'Upcoming investor events retrieved', events);
});
