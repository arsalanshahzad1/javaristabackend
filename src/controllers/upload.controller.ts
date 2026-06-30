import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import { cloudinary } from '../config/cloudinary';
import User from '../models/User';

export const uploadRecipePhoto = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    errorResponse(res, 'No file provided', 400);
    return;
  }
  successResponse(res, 'Photo uploaded', {
    url: req.file.path,
    publicId: req.file.filename,
  });
});

export const uploadPlaybookMedia = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    errorResponse(res, 'No file provided', 400);
    return;
  }
  const type = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image';
  successResponse(res, 'File uploaded', {
    url: req.file.path,
    publicId: req.file.filename,
    type,
    originalName: req.file.originalname,
  });
});

export const uploadChecklistPhoto = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    errorResponse(res, 'No file provided', 400);
    return;
  }
  successResponse(res, 'Photo uploaded', {
    url: req.file.path,
    publicId: req.file.filename,
  });
});

export const uploadCertificationBadge = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    errorResponse(res, 'No file provided', 400);
    return;
  }
  successResponse(res, 'Badge uploaded', {
    url: req.file.path,
    publicId: req.file.filename,
  });
});

export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    errorResponse(res, 'No file provided', 400);
    return;
  }

  const userId = req.user?.userId;
  if (userId) {
    await User.findByIdAndUpdate(userId, { avatar: req.file.path });
  }

  successResponse(res, 'Avatar uploaded', {
    url: req.file.path,
    publicId: req.file.filename,
  });
});

export const deleteUpload = asyncHandler(async (req: Request, res: Response) => {
  // publicId captured from wildcard route, e.g. "javarista/recipes/abc123"
  const publicId = (req.params as Record<string, string>)['path'];
  if (!publicId) {
    errorResponse(res, 'publicId is required', 400);
    return;
  }

  await cloudinary.uploader.destroy(publicId);
  successResponse(res, 'File deleted', { deleted: true });
});
