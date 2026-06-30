import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import Certification, { CertificationType, CERTIFICATION_TYPES, CERTIFICATION_TRACKS } from '../models/certification.model';
import type { UserRole } from '../models/User';
import CertificationPath from '../models/CertificationPath';
import User from '../models/User';
import { cloudinary } from '../config/cloudinary';
import { triggerScoreRecompute } from '../services/score-events.service';

const LEVEL_TO_CERT: Record<number, CertificationType> = {
  1: 'javarista_level_1',
  2: 'javarista_level_2',
  3: 'javarista_level_3',
  4: 'javarista_level_4',
  5: 'javarista_level_5',
};

/**
 * Shared issuance logic called both from this controller and from the
 * academy controller when a level course reaches 100% completion.
 * Idempotent — silently skips if an active cert of the same type already exists.
 */
export async function issueLevelCertification(
  userId: string,
  level: number,
  issuedById?: string
): Promise<void> {
  const certType = LEVEL_TO_CERT[level];
  if (!certType) return;

  const existing = await Certification.findOne({ user: userId, type: certType, status: 'active' });
  if (existing) return;

  await Certification.create({
    user: userId,
    type: certType,
    issuedBy: issuedById ?? undefined,
  });

  triggerScoreRecompute(userId, 'certification_awarded').catch(() => {});
}

// GET /api/certifications/mine
export const getMyCertifications = asyncHandler(async (req: Request, res: Response) => {
  const certifications = await Certification.find({ user: req.user!.userId })
    .sort({ issuedAt: -1 })
    .populate('issuedBy', 'name email');

  successResponse(res, 'Certifications fetched', certifications);
});

// GET /api/certifications/user/:userId
export const getUserCertifications = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params['userId']).select('name email');
  if (!user) {
    errorResponse(res, 'User not found', 404);
    return;
  }

  const certifications = await Certification.find({ user: user._id })
    .sort({ issuedAt: -1 })
    .populate('issuedBy', 'name email');

  successResponse(res, 'Certifications fetched', {
    user: { id: user._id, name: user.name, email: user.email },
    certifications,
  });
});

// GET /api/certifications  (admin only)
export const getAllCertifications = asyncHandler(async (req: Request, res: Response) => {
  const { search, type, status } = req.query;
  const filter: Record<string, unknown> = {};

  if (type) {
    if (!CERTIFICATION_TYPES.includes(type as CertificationType)) {
      errorResponse(res, `Invalid certification type. Valid values: ${CERTIFICATION_TYPES.join(', ')}`, 400);
      return;
    }
    filter['type'] = type;
  }

  if (status) {
    const statusValue = String(status);
    if (!['active', 'revoked'].includes(statusValue)) {
      errorResponse(res, 'Invalid status. Must be active or revoked', 400);
      return;
    }
    filter['status'] = statusValue;
  }

  if (search) {
    const searchValue = String(search);
    const users = await User.find({ name: { $regex: searchValue, $options: 'i' } }).select('_id');
    filter['$or'] = [
      { certificateNumber: { $regex: searchValue, $options: 'i' } },
      { user: { $in: users.map((user) => user._id) } },
    ];
  }

  const certifications = await Certification.find(filter)
    .sort({ issuedAt: -1 })
    .populate('user', 'name email')
    .populate('issuedBy', 'name email');

  successResponse(res, 'Certifications fetched', certifications);
});

// POST /api/certifications  (admin only)
export const issueCertification = asyncHandler(async (req: Request, res: Response) => {
  const { userId, type, notes } = req.body as {
    userId?: string;
    type?: string;
    notes?: string;
  };

  if (!userId || !type) {
    errorResponse(res, 'userId and type are required', 400);
    return;
  }

  if (!CERTIFICATION_TYPES.includes(type as CertificationType)) {
    errorResponse(res, `Invalid certification type. Valid values: ${CERTIFICATION_TYPES.join(', ')}`, 400);
    return;
  }

  const certType = type as CertificationType;

  const user = await User.findById(userId);
  if (!user) {
    errorResponse(res, 'User not found', 404);
    return;
  }

  const existing = await Certification.findOne({ user: userId, type: certType, status: 'active' });
  if (existing) {
    errorResponse(res, 'User already holds an active certification of this type', 409);
    return;
  }

  const certification = await Certification.create({
    user: userId,
    type: certType,
    notes: notes ?? undefined,
    issuedBy: req.user!.userId,
  });

  await certification.populate('issuedBy', 'name email');

  triggerScoreRecompute(userId, 'certification_awarded').catch(() => {});

  successResponse(res, 'Certification issued', certification, 201);
});

// PUT /api/certifications/:id/revoke  (admin only)
export const revokeCertification = asyncHandler(async (req: Request, res: Response) => {
  const certification = await Certification.findById(req.params['id']);
  if (!certification) {
    errorResponse(res, 'Certification not found', 404);
    return;
  }

  if (certification.status === 'revoked') {
    errorResponse(res, 'Certification is already revoked', 400);
    return;
  }

  certification.status = 'revoked';
  await certification.save();

  successResponse(res, 'Certification revoked', certification);
});

// GET /api/certifications/verify/:certificateNumber  (public)
export const verifyCertificate = asyncHandler(async (req: Request, res: Response) => {
  const certification = await Certification.findOne({
    certificateNumber: req.params['certificateNumber'],
  })
    .populate('user', 'name')
    .populate('issuedBy', 'name');

  if (!certification) {
    res.status(404).json({ valid: false, message: 'Certificate not found' });
    return;
  }

  const holder = certification.user as unknown as { name: string };
  const issuer = certification.issuedBy as unknown as { name?: string } | null;

  res.json({
    valid: certification.status === 'active',
    certificateNumber: certification.certificateNumber,
    holderName: holder?.name ?? 'Unknown',
    type: certification.type,
    issuedAt: certification.issuedAt,
    issuedBy: issuer?.name ?? 'JavaRista',
    expiresAt: certification.expiresAt ?? null,
    status: certification.status,
  });
});

// ─── Badge endpoints ──────────────────────────────────────────────────────────

// POST /api/certifications/:id/badge  (admin only, multipart)
export const uploadCertBadge = asyncHandler(async (req: Request, res: Response) => {
  const certification = await Certification.findById(req.params['id']);
  if (!certification) {
    errorResponse(res, 'Certification not found', 404);
    return;
  }

  const file = req.file as Express.Multer.File & { path?: string; filename?: string };
  if (!file) {
    errorResponse(res, 'No file uploaded', 400);
    return;
  }

  // Destroy old badge if present
  if (certification.badgePublicId) {
    try {
      await cloudinary.uploader.destroy(certification.badgePublicId);
    } catch {
      // Non-fatal
    }
  }

  // multer-storage-cloudinary puts the URL in file.path and public_id in file.filename
  certification.badgeUrl = (file as unknown as Record<string, string>)['path'] ?? '';
  certification.badgePublicId = (file as unknown as Record<string, string>)['filename'] ?? '';
  await certification.save();

  successResponse(res, 'Badge uploaded', certification);
});

// DELETE /api/certifications/:id/badge  (admin only)
export const removeCertBadge = asyncHandler(async (req: Request, res: Response) => {
  const certification = await Certification.findById(req.params['id']);
  if (!certification) {
    errorResponse(res, 'Certification not found', 404);
    return;
  }

  if (certification.badgePublicId) {
    try {
      await cloudinary.uploader.destroy(certification.badgePublicId);
    } catch {
      // Non-fatal
    }
  }

  certification.badgeUrl = undefined;
  certification.badgePublicId = undefined;
  await certification.save();

  successResponse(res, 'Badge removed', certification);
});

// ─── Certification Paths ──────────────────────────────────────────────────────

// GET /api/certifications/paths
export const getCertificationPaths = asyncHandler(async (req: Request, res: Response) => {
  const paths = await CertificationPath.find()
    .sort({ title: 1 })
    .populate('certifications', 'type track')
    .select('-__v');
  successResponse(res, 'Paths fetched', paths);
});

// GET /api/certifications/paths/my
export const getMyRelevantPaths = asyncHandler(async (req: Request, res: Response) => {
  const userRole = req.user!.role;
  const paths = await CertificationPath.find({ targetRoles: userRole, isActive: true })
    .populate('certifications', 'type track status')
    .select('-__v');
  successResponse(res, 'Paths fetched', paths);
});

// GET /api/certifications/tracks
export const getCertificationTracks = asyncHandler(async (req: Request, res: Response) => {
  const counts = await Certification.aggregate([
    { $group: { _id: '$track', count: { $sum: 1 } } },
  ]);
  const result = CERTIFICATION_TRACKS.map((track) => ({
    track,
    count: counts.find((c) => c._id === track)?.count ?? 0,
  }));
  successResponse(res, 'Tracks fetched', result);
});

// POST /api/certifications/paths  (admin only)
export const createCertificationPath = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, track, targetRoles, certifications, isActive, estimatedWeeks } = req.body as {
    title?: string;
    description?: string;
    track?: string;
    targetRoles?: string[];
    certifications?: string[];
    isActive?: boolean;
    estimatedWeeks?: number;
  };

  if (!title || !track) {
    errorResponse(res, 'title and track are required', 400);
    return;
  }

  const path = await CertificationPath.create({
    title,
    description,
    track,
    targetRoles: (targetRoles ?? []) as UserRole[],
    certifications: certifications ?? [],
    isActive: isActive ?? true,
    estimatedWeeks,
    createdBy: req.user!.userId,
  });

  successResponse(res, 'Path created', path, 201);
});

// PUT /api/certifications/paths/:id  (admin only)
export const updateCertificationPath = asyncHandler(async (req: Request, res: Response) => {
  const updates: Record<string, unknown> = {};
  const fields = ['title', 'description', 'track', 'targetRoles', 'certifications', 'isActive', 'estimatedWeeks'] as const;
  for (const field of fields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const path = await CertificationPath.findByIdAndUpdate(req.params['id'], updates, {
    new: true,
    runValidators: true,
  }).select('-__v');

  if (!path) {
    errorResponse(res, 'Path not found', 404);
    return;
  }

  successResponse(res, 'Path updated', path);
});

// DELETE /api/certifications/paths/:id  (admin only)
export const deleteCertificationPath = asyncHandler(async (req: Request, res: Response) => {
  const path = await CertificationPath.findByIdAndDelete(req.params['id']);
  if (!path) {
    errorResponse(res, 'Path not found', 404);
    return;
  }
  successResponse(res, 'Path deleted', null);
});
