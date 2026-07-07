import { Request, Response } from 'express';
import User from '../models/User';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';
import { INVESTINPATH } from '../config/paths';

type SignupPayload = {
  name: string;
  nickName: string;
  email: string;
  password: string;
  phone: string;
};

type InvestinSignupResponse = {
  walletId?: string;
  clabe?: string;
};

const createUser = async (payload: SignupPayload) => {
  const user = await new User({
    name: payload.name,
    nickName: payload.nickName,
    phone: payload.phone,
    email: payload.email,
    password: payload.password,
    role: 'investor',
    isPremium: true,
    subscriptionStatus: 'active',
    isVerified: true,
    source: 'javarista',
  }).save();

  await User.findOneAndUpdate(
    { email: user.email },
    { $set: { isVerified: true } },
    { new: true }
  );

  return user;
};

const syncUserToInvestin = async (payload: SignupPayload): Promise<InvestinSignupResponse> => {
  const response = await fetch(`${INVESTINPATH}/register-javarista`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      first_name: payload.name,
      last_name: payload.nickName,
      email: payload.email,
      password: payload.password,
      phone_no: payload.phone,
    }),
  });

  const responseData = await response.json();
  console.log(responseData, 'investin registration response');
  return responseData as InvestinSignupResponse;
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const name = req.body.name ?? req.body.first_name;
  const email = req.body.email;
  const password = req.body.password;
  const nickName = req.body.nickName ?? req.body.last_name ?? name;
  const phone = req.body.phone ?? req.body.phone_no ?? email;
  const normalizedEmail = String(email).trim().toLowerCase();
  const signupPayload = {
    name,
    nickName,
    email: normalizedEmail,
    password,
    phone,
  };

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    errorResponse(res, 'Email already registered', 409);
    return;
  }

  const user = await createUser(signupPayload);

  try {
    const remoteResponse = await syncUserToInvestin(signupPayload);
    const remoteWalletId = remoteResponse?.walletId ?? (remoteResponse as any)?.data?.walletId ?? (remoteResponse as any)?.data?.wallet;
    const remoteClabe = remoteResponse?.clabe ?? (remoteResponse as any)?.data?.clabe;

    if (remoteWalletId) {
      user.wallet = String(remoteWalletId);
    }
    if (remoteClabe) {
      user.clabe = String(remoteClabe);
    }
    if (remoteWalletId || remoteClabe) {
      await user.save({ validateBeforeSave: false });
    }
  } catch (error) {
    console.error('[auth.register] register-javarista failed:', error);
  }

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
      wallet: user.wallet,
      clabe: user.clabe,
    },
    accessToken,
    refreshToken,
  }, 201);
});

export const registerFundraiser = asyncHandler(async (req: Request, res: Response) => {
  const name = String(req.body.name ?? req.body.first_name ?? '').trim();
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const password = String(req.body.password ?? '');
  const nickName = String(req.body.nickName ?? req.body.last_name ?? name).trim() || name;
  const phone = String(req.body.phone ?? req.body.phone_no ?? email).trim() || email;

  if (!name || !email || !password) {
    errorResponse(res, 'Name, email and password are required', 400);
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    errorResponse(res, 'Email already registered', 409);
    return;
  }

  const now = new Date();
  await User.collection.updateOne(
    { email },
    {
      $set: {
        name,
        nickName,
        phone,
        password,
        role: 'investor',
        isVerified: true,
        isPremium: true,
        subscriptionStatus: 'active',
        isActive: true,
        source: 'investin',
        updatedAt: now,
      },
      $setOnInsert: {
        email,
        createdAt: now,
        followersCount: 0,
        followingCount: 0,
        directReports: [],
        hierarchyPath: [],
        hierarchyDepth: 0,
      },
    },
    { upsert: true }
  );

  const user = await User.findOne({ email });

  successResponse(res, 'Fundraiser registered', {
    user: {
      _id: user?._id,
      name: user?.name,
      email: user?.email,
      role: user?.role,
      isVerified: user?.isVerified,
      isPremium: user?.isPremium,
      subscriptionStatus: user?.subscriptionStatus,
      avatar: user?.avatar,
    },
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
