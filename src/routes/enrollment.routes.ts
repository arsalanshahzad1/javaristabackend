import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { authMiddleware } from '../middleware/auth.middleware';

const isValidObjectId = (id: string) => Types.ObjectId.isValid(id);
import { managerOrAdminMiddleware } from '../middleware/managerOrAdmin.middleware';
import asyncHandler from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import LearningPathEnrollment from '../models/LearningPathEnrollment';
import {
  checkPrerequisites,
  enrollUser,
  enrollStore,
  enrollRegion,
  recordReadingTime,
  recordVideoProgress,
  recordQuizScore,
} from '../services/enrollment.service';
import User from '../models/User';

const router = Router();

// ─── Prerequisite Check ───────────────────────────────────────────────────────

/**
 * GET /api/enrollments/prerequisites-check?userId=&learningPathId=
 * Returns whether the given user satisfies all prerequisites for a path.
 * Auth: any authenticated user.
 */
router.get(
  '/prerequisites-check',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, learningPathId } = req.query as {
      userId?: string;
      learningPathId?: string;
    };

    if (!userId || !learningPathId) {
      return errorResponse(res, 'userId and learningPathId query params are required', 400);
    }

    const result = await checkPrerequisites(userId, learningPathId);
    return successResponse(res, 'Prerequisites check complete', result);
  })
);

// ─── Create Enrollment ────────────────────────────────────────────────────────

/**
 * POST /api/enrollments
 * Body: { userId, learningPathId, storeId, dueDate? }
 * Auth: manager or admin.
 */
router.post(
  '/',
  authMiddleware,
  managerOrAdminMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, learningPathId, storeId, dueDate } = req.body as {
      userId: string;
      learningPathId: string;
      storeId: string;
      dueDate?: string;
    };

    if (!userId || !learningPathId || !storeId) {
      return errorResponse(res, 'userId, learningPathId, and storeId are required', 400);
    }
    if (!isValidObjectId(userId)) return errorResponse(res, 'Invalid userId', 400);
    if (!isValidObjectId(learningPathId)) return errorResponse(res, 'Invalid learningPathId', 400);
    if (!isValidObjectId(storeId)) return errorResponse(res, 'Invalid storeId', 400);

    const enrollment = await enrollUser({
      userId,
      learningPathId,
      storeId,
      enrolledBy: req.user!.userId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    return successResponse(res, 'User enrolled successfully', enrollment, 201);
  })
);

// ─── Self Enroll ──────────────────────────────────────────────────────────────

/**
 * POST /api/enrollments/self-enroll
 * Body: { learningPathId, dueDate? }
 * Auth: any authenticated user. Enrols the caller in a learning path using
 *   their own storeId from the user record (enrolledBy = themselves).
 */
router.post(
  '/self-enroll',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { learningPathId, dueDate } = req.body as {
      learningPathId: string;
      dueDate?: string;
    };

    if (!learningPathId) {
      return errorResponse(res, 'learningPathId is required', 400);
    }

    const user = await User.findById(req.user!.userId).select('storeId');
    if (!user?.storeId) {
      return errorResponse(res, 'User is not assigned to a store', 400);
    }

    const enrollment = await enrollUser({
      userId: req.user!.userId,
      learningPathId,
      storeId: user.storeId.toString(),
      enrolledBy: req.user!.userId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    return successResponse(res, 'Enrolled successfully', enrollment, 201);
  })
);

// ─── Enroll Store ─────────────────────────────────────────────────────────────

/**
 * POST /api/enrollments/enroll-store
 * Body: { learningPathId, storeId, dueDate? }
 * Auth: manager or admin. Bulk-enrolls all active users in the store.
 */
router.post(
  '/enroll-store',
  authMiddleware,
  managerOrAdminMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { learningPathId, storeId, dueDate } = req.body as {
      learningPathId: string;
      storeId: string;
      dueDate?: string;
    };

    if (!learningPathId || !storeId) {
      return errorResponse(res, 'learningPathId and storeId are required', 400);
    }
    if (!isValidObjectId(learningPathId)) return errorResponse(res, 'Invalid learningPathId', 400);
    if (!isValidObjectId(storeId)) return errorResponse(res, 'Invalid storeId', 400);

    const result = await enrollStore({
      learningPathId,
      storeId,
      enrolledBy: req.user!.userId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    return successResponse(res, 'Store enrollment complete', result);
  })
);

// ─── Enroll Region ────────────────────────────────────────────────────────────

/**
 * POST /api/enrollments/enroll-region
 * Body: { learningPathId, regionId, dueDate? }
 * Auth: manager or admin. Bulk-enrolls all active users in every store of
 *   the given region.
 */
router.post(
  '/enroll-region',
  authMiddleware,
  managerOrAdminMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { learningPathId, regionId, dueDate } = req.body as {
      learningPathId: string;
      regionId: string;
      dueDate?: string;
    };

    if (!learningPathId || !regionId) {
      return errorResponse(res, 'learningPathId and regionId are required', 400);
    }
    if (!isValidObjectId(learningPathId)) return errorResponse(res, 'Invalid learningPathId', 400);
    if (!isValidObjectId(regionId)) return errorResponse(res, 'Invalid regionId', 400);

    const result = await enrollRegion({
      learningPathId,
      regionId,
      enrolledBy: req.user!.userId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    return successResponse(res, 'Region enrollment complete', result);
  })
);

// ─── List Enrollments ─────────────────────────────────────────────────────────

/**
 * GET /api/enrollments
 * Query: userId?, storeId?, learningPathId?, status?, page?, limit?
 * Auth: any authenticated user; non-managers see only their own records.
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const MANAGER_OR_ABOVE = [
      'owner', 'ceo', 'coo', 'cfo', 'regional_manager',
      'area_manager', 'store_manager', 'assistant_manager', 'hr_manager', 'marketing_manager',
    ];
    const isManager = MANAGER_OR_ABOVE.includes(req.user!.role);

    const {
      userId,
      storeId,
      learningPathId,
      status,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};

    if (!isManager) {
      filter.userId = new Types.ObjectId(req.user!.userId);
    } else if (userId) {
      filter.userId = new Types.ObjectId(userId);
    }

    if (storeId) filter.storeId = new Types.ObjectId(storeId);
    if (learningPathId) filter.learningPathId = new Types.ObjectId(learningPathId);
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [enrollments, total] = await Promise.all([
      LearningPathEnrollment.find(filter)
        .populate('userId', 'name email')
        .populate('learningPathId', 'title')
        .populate('storeId', 'name')
        .sort({ enrolledAt: -1 })
        .skip(skip)
        .limit(limitNum),
      LearningPathEnrollment.countDocuments(filter),
    ]);

    return successResponse(res, 'Enrollments retrieved', enrollments, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    });
  })
);

// ─── Get Single Enrollment ────────────────────────────────────────────────────

/**
 * GET /api/enrollments/:enrollmentId
 * Auth: owner of the enrollment or manager/admin.
 */
router.get(
  '/:enrollmentId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    if (!isValidObjectId(req.params['enrollmentId'] as string)) {
      return errorResponse(res, 'Invalid enrollmentId', 400);
    }
    const enrollment = await LearningPathEnrollment.findById(req.params.enrollmentId)
      .populate('userId', 'name email')
      .populate('learningPathId', 'title completionRequirements estimatedDurationMinutes')
      .populate('storeId', 'name')
      .populate('enrolledBy', 'name email');

    if (!enrollment) {
      return errorResponse(res, 'Enrollment not found', 404);
    }

    const MANAGER_OR_ABOVE = [
      'owner', 'ceo', 'coo', 'cfo', 'regional_manager',
      'area_manager', 'store_manager', 'assistant_manager', 'hr_manager', 'marketing_manager',
    ];
    const isManager = MANAGER_OR_ABOVE.includes(req.user!.role);
    const isOwner = enrollment.userId.toString() === req.user!.userId;

    if (!isOwner && !isManager) {
      return errorResponse(res, 'Forbidden', 403);
    }

    return successResponse(res, 'Enrollment retrieved', enrollment);
  })
);

// ─── Record Reading Time ──────────────────────────────────────────────────────

/**
 * PATCH /api/enrollments/:enrollmentId/reading-time
 * Body: { additionalSeconds: number, scrollDepthPercent?: number }
 * Auth: must be the enrolled user.
 */
router.patch(
  '/:enrollmentId/reading-time',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    if (!isValidObjectId(req.params['enrollmentId'] as string)) {
      return errorResponse(res, 'Invalid enrollmentId', 400);
    }

    const { additionalSeconds, scrollDepthPercent } = req.body as {
      additionalSeconds: number;
      scrollDepthPercent?: number;
    };

    if (typeof additionalSeconds !== 'number' || additionalSeconds < 0) {
      return errorResponse(res, 'additionalSeconds must be a non-negative number', 400);
    }

    if (
      scrollDepthPercent !== undefined &&
      (typeof scrollDepthPercent !== 'number' || scrollDepthPercent < 0 || scrollDepthPercent > 100)
    ) {
      return errorResponse(res, 'scrollDepthPercent must be a number between 0 and 100', 400);
    }

    await recordReadingTime({
      enrollmentId: String(req.params['enrollmentId']),
      userId: req.user!.userId,
      additionalSeconds,
      scrollDepthPercent,
    });

    return successResponse(res, 'Reading time recorded');
  })
);

// ─── Record Video Progress ────────────────────────────────────────────────────

/**
 * PATCH /api/enrollments/:enrollmentId/video-progress
 * Body: { itemId: string, watchedPercent: number }
 * Auth: must be the enrolled user.
 */
router.patch(
  '/:enrollmentId/video-progress',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    if (!isValidObjectId(req.params['enrollmentId'] as string)) {
      return errorResponse(res, 'Invalid enrollmentId', 400);
    }

    const { itemId, watchedPercent } = req.body as {
      itemId: string;
      watchedPercent: number;
    };

    if (!itemId) {
      return errorResponse(res, 'itemId is required', 400);
    }
    if (!isValidObjectId(itemId)) return errorResponse(res, 'Invalid itemId', 400);
    if (typeof watchedPercent !== 'number' || watchedPercent < 0 || watchedPercent > 100) {
      return errorResponse(res, 'watchedPercent must be a number between 0 and 100', 400);
    }

    await recordVideoProgress({
      enrollmentId: String(req.params['enrollmentId']),
      userId: req.user!.userId,
      itemId,
      watchedPercent,
    });

    return successResponse(res, 'Video progress recorded');
  })
);

// ─── Record Quiz Score ────────────────────────────────────────────────────────

/**
 * PATCH /api/enrollments/:enrollmentId/quiz-score
 * Body: { itemId: string, score: number }
 * Auth: must be the enrolled user.
 */
router.patch(
  '/:enrollmentId/quiz-score',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    if (!isValidObjectId(req.params['enrollmentId'] as string)) {
      return errorResponse(res, 'Invalid enrollmentId', 400);
    }

    const { itemId, score } = req.body as { itemId: string; score: number };

    if (!itemId) {
      return errorResponse(res, 'itemId is required', 400);
    }
    if (!isValidObjectId(itemId)) return errorResponse(res, 'Invalid itemId', 400);
    if (typeof score !== 'number' || score < 0 || score > 100) {
      return errorResponse(res, 'score must be a number between 0 and 100', 400);
    }

    await recordQuizScore({
      enrollmentId: String(req.params['enrollmentId']),
      userId: req.user!.userId,
      itemId,
      score,
    });

    return successResponse(res, 'Quiz score recorded');
  })
);

// ─── Withdraw Enrollment ──────────────────────────────────────────────────────

/**
 * DELETE /api/enrollments/:enrollmentId
 * Soft-deletes by setting status to 'withdrawn'. Auth: manager or admin.
 */
router.delete(
  '/:enrollmentId',
  authMiddleware,
  managerOrAdminMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const enrollment = await LearningPathEnrollment.findById(req.params.enrollmentId);

    if (!enrollment) {
      return errorResponse(res, 'Enrollment not found', 404);
    }
    if (enrollment.status === 'withdrawn') {
      return errorResponse(res, 'Enrollment is already withdrawn', 400);
    }

    enrollment.status = 'withdrawn';
    await enrollment.save();

    return successResponse(res, 'Enrollment withdrawn');
  })
);

export default router;
