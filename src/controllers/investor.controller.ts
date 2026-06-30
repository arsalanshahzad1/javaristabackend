import { Request, Response } from 'express';
import ExclusiveContent, { canAccessInvestorContent } from '../models/exclusive-content.model';
import ConstructionJournal from '../models/ConstructionJournal';
import User from '../models/User';
import Store from '../models/Store';
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

  const userRole = req.user?.role ?? '';
  const userInvestorLevel = (req.user as unknown as Record<string, unknown>)?.investorAccessLevel as string | undefined;
  const isAdmin = userRole === 'owner';

  if (!isAdmin) {
    const rank: Record<string, number> = { community: 0, shareholder: 1, major_investor: 2, board: 3 };
    const userRank = rank[userInvestorLevel ?? 'community'] ?? 0;
    const accessibleLevels = Object.entries(rank)
      .filter(([, r]) => r <= userRank)
      .map(([level]) => level);
    filter.accessLevel = { $in: accessibleLevels };
  }

  const [items, total] = await Promise.all([
    ExclusiveContent.find(filter)
      .sort({ isPinned: -1, publishedAt: -1 })
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
  if (req.user?.role !== 'owner') filter.isActive = true;

  const item = await ExclusiveContent.findOne(filter).select('-__v');
  if (!item) return errorResponse(res, 'Content not found', 404);

  const userRole = req.user?.role ?? '';
  const userInvestorLevel = (req.user as unknown as Record<string, unknown>)?.investorAccessLevel as string | undefined;

  if (!canAccessInvestorContent(userRole, userInvestorLevel, item.accessLevel)) {
    return errorResponse(res, 'Access denied for this content tier', 403);
  }

  await ExclusiveContent.updateOne({ _id: item._id }, { $inc: { viewCount: 1 } });

  return successResponse(res, 'Content retrieved', item);
});

export const createContent = asyncHandler(async (req: Request, res: Response) => {
  const {
    title, slug, contentType, body, videoUrl, mediaUrls,
    publishedAt, tags, isActive, accessLevel, isPinned,
    featuredImage, featuredImagePublicId, attachments,
  } = req.body;

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
    accessLevel: accessLevel ?? 'shareholder',
    isPinned: isPinned ?? false,
    featuredImage: featuredImage || undefined,
    featuredImagePublicId: featuredImagePublicId || undefined,
    attachments: attachments ?? [],
    publishedBy: req.user?.userId,
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

  if (!content) return errorResponse(res, 'Content not found', 404);
  return successResponse(res, 'Content updated', content);
});

export const deleteContent = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  const content = await ExclusiveContent.findOneAndUpdate(
    { slug },
    { $set: { isActive: false } },
    { new: true },
  );

  if (!content) return errorResponse(res, 'Content not found', 404);
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

export const getTransparencyDashboard = asyncHandler(async (req: Request, res: Response) => {
  const [storesByStatus, totalShareholders, totalEmployees, recentJournals, recentContent] =
    await Promise.all([
      Store.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      User.countDocuments({ role: 'investor', isActive: true }),
      User.countDocuments({
        role: {
          $in: [
            'barista', 'trainee', 'shift_supervisor',
            'store_manager', 'assistant_manager', 'area_manager',
            'regional_manager', 'coo', 'cfo', 'ceo', 'hr_manager', 'marketing_manager',
          ],
        },
        isActive: true,
      }),
      ConstructionJournal.find({ isPublished: true })
        .sort({ publishedAt: -1 })
        .limit(5)
        .populate('storeId', 'name storeNumber')
        .select('title milestone progressPercent publishedAt storeId'),
      ExclusiveContent.find({ isActive: true })
        .sort({ isPinned: -1, publishedAt: -1 })
        .limit(5)
        .select('title contentType accessLevel publishedAt isPinned'),
    ]);

  const statusMap: Record<string, number> = { open: 0, construction: 0, planning: 0, closed: 0 };
  let totalStores = 0;
  for (const row of storesByStatus) {
    totalStores += row.count as number;
    const key = (row._id as string) === 'temporarily_closed' ? 'closed' : (row._id as string);
    if (key in statusMap) statusMap[key] += row.count as number;
  }

  return successResponse(res, 'Transparency dashboard retrieved', {
    totalStores,
    storesByStatus: {
      open: statusMap['open'],
      construction: statusMap['construction'],
      planning: statusMap['planning'],
      closed: statusMap['closed'],
    },
    totalShareholders,
    totalEmployees,
    totalCertifications: 0,
    recentJournalEntries: recentJournals,
    recentContent,
  });
});
