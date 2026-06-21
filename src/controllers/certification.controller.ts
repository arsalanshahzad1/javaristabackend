import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import Certification, { CertificationType, CERTIFICATION_TYPES } from '../models/certification.model';
import User from '../models/User';

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
  }).populate('user', 'name');

  if (!certification) {
    successResponse(res, 'Certificate not found', { valid: false });
    return;
  }

  const holder = certification.user as unknown as { name: string };

  successResponse(res, 'Certificate verified', {
    valid: certification.status === 'active',
    holderName: holder.name,
    type: certification.type,
    issuedAt: certification.issuedAt,
    status: certification.status,
    certificateNumber: certification.certificateNumber,
  });
});
