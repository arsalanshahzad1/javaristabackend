import { Request, Response } from 'express';
import { Types } from 'mongoose';
import asyncHandler from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import User from '../models/User';
import CourseEnrollment from '../models/course-enrollment.model';
import UserProgress from '../models/UserProgress';
import ChecklistSchedule from '../models/ChecklistSchedule';
import { computeAndSaveScore, getScoreBreakdown } from '../services/javarista-score.service';

const MANAGEMENT_ROLES = new Set([
  'shift_supervisor', 'store_manager', 'assistant_manager', 'area_manager',
  'regional_manager', 'coo', 'cfo', 'ceo', 'owner', 'hr_manager', 'marketing_manager',
]);

function isManagementOrAdmin(role?: string): boolean {
  return !!role && MANAGEMENT_ROLES.has(role);
}

// GET /api/employees/:userId/profile
export const getEmployeeProfile = asyncHandler(async (req: Request, res: Response) => {
  const targetId = req.params['userId'] as string;
  const requesterId = req.user!.userId;
  const requesterRole = req.user!.role;

  const isSelf = requesterId === targetId;
  if (!isSelf && !isManagementOrAdmin(requesterRole)) {
    errorResponse(res, 'Access denied', 403);
    return;
  }

  if (!Types.ObjectId.isValid(targetId)) {
    errorResponse(res, 'Invalid user ID', 400);
    return;
  }

  const user = await User.findById(targetId).select(
    'name email role storeId department javaRistaScore promotionReadiness avatar'
  );

  if (!user) {
    errorResponse(res, 'User not found', 404);
    return;
  }

  // Fetch related data in parallel
  const [enrollments, manualProgress, recentSchedules] = await Promise.all([
    CourseEnrollment.find({ user: targetId })
      .populate('course', 'title category lessons')
      .sort({ enrolledAt: -1 })
      .limit(50),
    UserProgress.find({ user: targetId }).sort({ updatedAt: -1 }).limit(50),
    ChecklistSchedule.find({ assignedTo: targetId }).limit(20).lean(),
  ]);

  // Compute compliance scores
  const totalCourses = enrollments.length;
  const completedCourses = enrollments.filter((e) => e.completedAt).length;
  const trainingCompliance = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

  const totalManuals = manualProgress.length;
  const completedManuals = manualProgress.filter((p) => (p as unknown as { completed?: boolean }).completed).length;
  const manualCompliance = totalManuals > 0 ? Math.round((completedManuals / totalManuals) * 100) : 0;

  const schedules = recentSchedules as unknown as Array<{ status?: string }>;
  const totalSchedules = schedules.length;
  const completedSchedules = schedules.filter((s) => s.status === 'completed').length;
  const checklistCompliance = totalSchedules > 0 ? Math.round((completedSchedules / totalSchedules) * 100) : 0;

  const trainingProgress = enrollments.map((e) => {
    const course = e.course as unknown as { title?: string; category?: string; lessons?: unknown[] };
    const totalLessons = course?.lessons?.length ?? 0;
    const progressPercent = totalLessons > 0 ? Math.round((e.completedLessons.length / totalLessons) * 100) : 0;
    return {
      courseId: e.course,
      courseTitle: course?.title,
      category: course?.category,
      progressPercent,
      completedAt: e.completedAt,
      enrolledAt: e.enrolledAt,
    };
  });

  successResponse(res, 'Employee profile fetched', {
    user,
    trainingProgress,
    manualProgress,
    recentChecklists: schedules.slice(0, 10),
    complianceScores: {
      training: trainingCompliance,
      manual: manualCompliance,
      checklist: checklistCompliance,
    },
  });
});

// GET /api/employees/:userId/score
export const getScore = asyncHandler(async (req: Request, res: Response) => {
  const targetId = req.params['userId'] as string;
  const requesterId = req.user!.userId;
  const requesterRole = req.user!.role;

  const isSelf = requesterId === targetId;
  if (!isSelf && !isManagementOrAdmin(requesterRole)) {
    errorResponse(res, 'Access denied', 403);
    return;
  }

  if (!Types.ObjectId.isValid(targetId)) {
    errorResponse(res, 'Invalid user ID', 400);
    return;
  }

  const exists = await User.exists({ _id: targetId });
  if (!exists) {
    errorResponse(res, 'User not found', 404);
    return;
  }

  const data = await getScoreBreakdown(targetId);
  successResponse(res, 'Score fetched', data);
});

/**
 * POST /api/employees/:userId/compute-score
 *
 * Manual override. Score now auto-computes on data changes.
 * Use this only to force a recalculation outside of normal triggers.
 */
export const computeScore = asyncHandler(async (req: Request, res: Response) => {
  const targetId = req.params['userId'] as string;

  if (!Types.ObjectId.isValid(targetId)) {
    errorResponse(res, 'Invalid user ID', 400);
    return;
  }

  const user = await computeAndSaveScore(targetId, 'manual');

  successResponse(res, 'JavaRista Score computed', {
    score: { javaRistaScore: user.javaRistaScore, lastComputedAt: user.lastComputedAt },
    triggeredBy: 'manual',
  });
});
