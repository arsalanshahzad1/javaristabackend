import { Request, Response } from 'express';
import ConstructionJournal from '../models/ConstructionJournal';
import { cloudinary, uploadRecipePhoto } from '../config/cloudinary';
import { successResponse, errorResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';

function isAdmin(role: string) {
  return role === 'owner';
}

export const listJournals = asyncHandler(async (req: Request, res: Response) => {
  const { storeId, page = '1', limit = '20' } = req.query;
  const role = req.user?.role ?? '';

  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter: Record<string, unknown> = {};
  if (storeId) filter.storeId = storeId;
  if (!isAdmin(role)) filter.isPublished = true;

  const [items, total] = await Promise.all([
    ConstructionJournal.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('storeId', 'name storeNumber status')
      .select('-__v'),
    ConstructionJournal.countDocuments(filter),
  ]);

  return successResponse(res, 'Construction journals retrieved', items, 200, {
    page: pageNum,
    limit: limitNum,
    total,
    pages: Math.ceil(total / limitNum),
  });
});

export const getJournal = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const role = req.user?.role ?? '';

  const filter: Record<string, unknown> = { _id: id };
  if (!isAdmin(role)) filter.isPublished = true;

  const journal = await ConstructionJournal.findOne(filter)
    .populate('storeId', 'name storeNumber status')
    .select('-__v');

  if (!journal) return errorResponse(res, 'Journal not found', 404);
  return successResponse(res, 'Journal retrieved', journal);
});

export const createJournal = asyncHandler(async (req: Request, res: Response) => {
  const { storeId, title, body, milestone, progressPercent, videoUrl, isPublished } = req.body;

  const journal = await ConstructionJournal.create({
    storeId,
    title,
    body,
    milestone: milestone || undefined,
    progressPercent: progressPercent ?? 0,
    videoUrl: videoUrl || undefined,
    isPublished: isPublished ?? false,
    publishedAt: isPublished ? new Date() : undefined,
    createdBy: req.user?.userId,
  });

  return successResponse(res, 'Journal created', journal, 201);
});

export const updateJournal = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isPublished } = req.body;

  const updates: Record<string, unknown> = { ...req.body };
  if (isPublished === true) {
    updates.publishedAt = new Date();
  }

  const journal = await ConstructionJournal.findByIdAndUpdate(id, { $set: updates }, {
    new: true,
    runValidators: true,
  }).select('-__v');

  if (!journal) return errorResponse(res, 'Journal not found', 404);
  return successResponse(res, 'Journal updated', journal);
});

export const deleteJournal = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const journal = await ConstructionJournal.findByIdAndDelete(id);
  if (!journal) return errorResponse(res, 'Journal not found', 404);
  return successResponse(res, 'Journal deleted', null);
});

export const addJournalPhoto = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const journal = await ConstructionJournal.findById(id);
  if (!journal) return errorResponse(res, 'Journal not found', 404);

  const file = req.file as Express.Multer.File & { path?: string; filename?: string };
  if (!file) return errorResponse(res, 'No photo uploaded', 400);

  const url = (file as unknown as { path: string }).path;
  const publicId = (file as unknown as { filename: string }).filename;

  const { caption } = req.body;

  journal.photos.push({ url, publicId, caption: caption || undefined });
  await journal.save();

  return successResponse(res, 'Photo added', journal);
});

export const removeJournalPhoto = asyncHandler(async (req: Request, res: Response) => {
  const { id, photoIndex } = req.params as { id: string; photoIndex: string };
  const idx = parseInt(photoIndex, 10);

  const journal = await ConstructionJournal.findById(id);
  if (!journal) return errorResponse(res, 'Journal not found', 404);
  if (idx < 0 || idx >= journal.photos.length) return errorResponse(res, 'Photo index out of range', 400);

  const [removed] = journal.photos.splice(idx, 1);
  if (removed?.publicId) {
    await cloudinary.uploader.destroy(removed.publicId).catch(() => null);
  }
  await journal.save();

  return successResponse(res, 'Photo removed', journal);
});
