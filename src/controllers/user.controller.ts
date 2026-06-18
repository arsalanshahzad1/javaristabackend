import { Request, Response } from 'express';
import User from '../models/User';
import BrewLog from '../models/BrewLog';
import Bean from '../models/Bean';
import EspressoShot from '../models/EspressoShot';
import { successResponse, errorResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId);
  if (!user) {
    errorResponse(res, 'User not found', 404);
    return;
  }
  successResponse(res, 'Profile fetched', user);
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { name, avatar } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user!.userId,
    { name, avatar },
    { new: true, runValidators: true }
  );
  if (!user) {
    errorResponse(res, 'User not found', 404);
    return;
  }
  successResponse(res, 'Profile updated', user);
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user!.userId).select('+password');
  if (!user) {
    errorResponse(res, 'User not found', 404);
    return;
  }

  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) {
    errorResponse(res, 'Current password is incorrect', 401);
    return;
  }

  user.password = newPassword;
  await user.save();

  successResponse(res, 'Password changed successfully');
});

export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  await Promise.all([
    BrewLog.deleteMany({ user: userId }),
    Bean.deleteMany({ user: userId }),
    EspressoShot.deleteMany({ user: userId }),
  ]);

  await User.findByIdAndDelete(userId);

  successResponse(res, 'Account deleted successfully');
});
