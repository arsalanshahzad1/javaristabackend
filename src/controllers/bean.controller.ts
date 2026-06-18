import { Request, Response } from 'express';
import Bean from '../models/Bean';
import { successResponse, errorResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';

export const getBeans = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { user: req.user!.userId };
  if (req.query['status']) filter['status'] = req.query['status'];

  const beans = await Bean.find(filter).sort({ createdAt: -1 });
  successResponse(res, 'Beans fetched', beans);
});

export const getBean = asyncHandler(async (req: Request, res: Response) => {
  const bean = await Bean.findById(req.params['id']);
  if (!bean) {
    errorResponse(res, 'Bean not found', 404);
    return;
  }

  if (bean.user.toString() !== req.user!.userId) {
    errorResponse(res, 'Not authorized to view this bean', 403);
    return;
  }

  successResponse(res, 'Bean fetched', bean);
});

export const createBean = asyncHandler(async (req: Request, res: Response) => {
  const bean = await Bean.create({ ...req.body, user: req.user!.userId });
  successResponse(res, 'Bean created', bean, 201);
});

export const updateBean = asyncHandler(async (req: Request, res: Response) => {
  const bean = await Bean.findById(req.params['id']);
  if (!bean) {
    errorResponse(res, 'Bean not found', 404);
    return;
  }

  if (bean.user.toString() !== req.user!.userId) {
    errorResponse(res, 'Not authorized to update this bean', 403);
    return;
  }

  const updated = await Bean.findByIdAndUpdate(req.params['id'], req.body, {
    new: true,
    runValidators: true,
  });
  successResponse(res, 'Bean updated', updated);
});

export const deleteBean = asyncHandler(async (req: Request, res: Response) => {
  const bean = await Bean.findById(req.params['id']);
  if (!bean) {
    errorResponse(res, 'Bean not found', 404);
    return;
  }

  if (bean.user.toString() !== req.user!.userId) {
    errorResponse(res, 'Not authorized to delete this bean', 403);
    return;
  }

  await Bean.findByIdAndDelete(req.params['id']);
  successResponse(res, 'Bean deleted');
});
