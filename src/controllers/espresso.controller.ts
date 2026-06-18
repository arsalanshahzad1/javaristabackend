import { Request, Response } from 'express';
import EspressoShot from '../models/EspressoShot';
import { getEspressoSuggestion } from '../config/constants';
import { successResponse, errorResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';

export const getShots = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, parseInt(req.query['limit'] as string) || 10);
  const skip = (page - 1) * limit;

  const [shots, total] = await Promise.all([
    EspressoShot.find({ user: req.user!.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('bean', 'name'),
    EspressoShot.countDocuments({ user: req.user!.userId }),
  ]);

  successResponse(res, 'Espresso shots fetched', shots, 200, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

export const getLatestShot = asyncHandler(async (req: Request, res: Response) => {
  const shot = await EspressoShot.findOne({ user: req.user!.userId })
    .sort({ createdAt: -1 })
    .populate('bean', 'name');

  if (!shot) {
    errorResponse(res, 'No espresso shots found', 404);
    return;
  }

  successResponse(res, 'Latest shot fetched', shot);
});

export const logShot = asyncHandler(async (req: Request, res: Response) => {
  const suggestion = getEspressoSuggestion(req.body.tasteProfile);

  const shot = await EspressoShot.create({
    ...req.body,
    user: req.user!.userId,
    suggestion,
  });

  successResponse(res, 'Espresso shot logged', shot, 201);
});

export const deleteShot = asyncHandler(async (req: Request, res: Response) => {
  const shot = await EspressoShot.findById(req.params['id']);
  if (!shot) {
    errorResponse(res, 'Espresso shot not found', 404);
    return;
  }

  if (shot.user.toString() !== req.user!.userId) {
    errorResponse(res, 'Not authorized to delete this shot', 403);
    return;
  }

  await EspressoShot.findByIdAndDelete(req.params['id']);
  successResponse(res, 'Espresso shot deleted');
});
