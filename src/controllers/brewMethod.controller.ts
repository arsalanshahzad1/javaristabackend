import { Request, Response } from 'express';
import BrewMethod from '../models/BrewMethod';
import { successResponse, errorResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';

export const getAllBrewMethods = asyncHandler(async (_req: Request, res: Response) => {
  const methods = await BrewMethod.find({ isActive: true }).sort({ name: 1 });
  successResponse(res, 'Brew methods fetched', methods);
});

export const getBrewMethod = asyncHandler(async (req: Request, res: Response) => {
  const method = await BrewMethod.findById(req.params['id']);
  if (!method) {
    errorResponse(res, 'Brew method not found', 404);
    return;
  }
  successResponse(res, 'Brew method fetched', method);
});

export const createBrewMethod = asyncHandler(async (req: Request, res: Response) => {
  const slug = req.body.name.toLowerCase().replace(/\s+/g, '-');

  const method = await BrewMethod.create({
    ...req.body,
    slug,
    createdBy: req.user!.userId,
  });

  successResponse(res, 'Brew method created', method, 201);
});

export const updateBrewMethod = asyncHandler(async (req: Request, res: Response) => {
  const method = await BrewMethod.findByIdAndUpdate(req.params['id'], req.body, {
    new: true,
    runValidators: true,
  });
  if (!method) {
    errorResponse(res, 'Brew method not found', 404);
    return;
  }
  successResponse(res, 'Brew method updated', method);
});

export const deleteBrewMethod = asyncHandler(async (req: Request, res: Response) => {
  const method = await BrewMethod.findByIdAndUpdate(
    req.params['id'],
    { isActive: false },
    { new: true }
  );
  if (!method) {
    errorResponse(res, 'Brew method not found', 404);
    return;
  }
  successResponse(res, 'Brew method deactivated');
});
