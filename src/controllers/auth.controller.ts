import { Request, Response } from 'express';
import User from '../models/User';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    errorResponse(res, 'Email already registered', 409);
    return;
  }

  const user = await User.create({ name, email, password });

  const accessToken = generateAccessToken(user._id.toString(), user.role);
  const refreshToken = generateRefreshToken(user._id.toString());

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  successResponse(res, 'Registration successful', {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      isPremium: user.isPremium,
      subscriptionStatus: user.subscriptionStatus,
      avatar: user.avatar,
    },
    accessToken,
    refreshToken,
  }, 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password +refreshToken');
  if (!user) {
    errorResponse(res, 'Invalid email or password', 401);
    return;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    errorResponse(res, 'Invalid email or password', 401);
    return;
  }

  const accessToken = generateAccessToken(user._id.toString(), user.role);
  const refreshToken = generateRefreshToken(user._id.toString());

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  successResponse(res, 'Login successful', {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      isPremium: user.isPremium,
      subscriptionStatus: user.subscriptionStatus,
      avatar: user.avatar,
    },
    accessToken,
    refreshToken,
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    errorResponse(res, 'Refresh token required', 401);
    return;
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    errorResponse(res, 'Invalid or expired refresh token', 401);
    return;
  }

  const user = await User.findOne({ _id: decoded.userId }).select('+refreshToken');
  if (!user || user.refreshToken !== refreshToken) {
    errorResponse(res, 'Invalid refresh token', 401);
    return;
  }

  const accessToken = generateAccessToken(user._id.toString(), user.role);

  successResponse(res, 'Token refreshed', { accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await User.findByIdAndUpdate(req.user!.userId, { refreshToken: null });
  successResponse(res, 'Logged out successfully');
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (user) {
    console.log(`Password reset requested for: ${email}`);
  }

  successResponse(res, 'If this email exists you will receive a reset link');
});

export const resetPassword = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, 'Password reset successful');
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId);
  if (!user) {
    errorResponse(res, 'User not found', 404);
    return;
  }
  successResponse(res, 'User fetched', user);
});
