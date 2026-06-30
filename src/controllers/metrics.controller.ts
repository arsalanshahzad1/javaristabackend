import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User, { UserRole } from '../models/User';
import Course from '../models/course.model';
import Certification from '../models/certification.model';
import UserProgress from '../models/UserProgress';
import { successResponse, errorResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';

const EMPLOYEE_ROLES = [
  'barista',
  'trainee',
  'shift_supervisor',
  'store_manager',
  'assistant_manager',
  'area_manager',
  'regional_manager',
  'coo',
  'cfo',
  'ceo',
  'owner',
  'hr_manager',
  'marketing_manager',
];

export const getDashboardMetrics = asyncHandler(async (_req: Request, res: Response) => {
  const [employees, courseCompleted, manualCompleted, activeCourses, certificationIssuedCount] =
    await Promise.all([
      User.find({ role: { $in: EMPLOYEE_ROLES as UserRole[] }, isActive: true }).select(
        '_id storeId javaRistaScore'
      ),
      UserProgress.distinct('userId', {
        entityType: 'course',
        status: 'completed',
      }),
      UserProgress.distinct('userId', {
        entityType: 'manual',
        status: 'completed',
      }),
      Course.countDocuments({ isActive: true }),
      Certification.countDocuments({}),
    ]);

  const totalEmployees = employees.length;

  const completedCourseSet = new Set(courseCompleted.map((id: mongoose.Types.ObjectId) => id.toString()));
  const completedManualSet = new Set(manualCompleted.map((id: mongoose.Types.ObjectId) => id.toString()));

  const trainingCompletedCount = employees.filter((e) =>
    completedCourseSet.has(e._id.toString())
  ).length;
  const manualReadCount = employees.filter((e) =>
    completedManualSet.has(e._id.toString())
  ).length;

  const trainingPercent =
    totalEmployees > 0 ? Math.round((trainingCompletedCount / totalEmployees) * 100) : 0;
  const manualPercent =
    totalEmployees > 0 ? Math.round((manualReadCount / totalEmployees) * 100) : 0;

  const scoredEmployees = employees.filter((e) => (e.javaRistaScore ?? 0) > 0);
  const avgJavaRistaScore =
    scoredEmployees.length > 0
      ? Math.round(
          scoredEmployees.reduce((sum, e) => sum + (e.javaRistaScore ?? 0), 0) /
            scoredEmployees.length
        )
      : 0;

  const storeMap = new Map<string, { scores: number[]; count: number; storeName: string }>();
  for (const emp of employees) {
    if (!emp.storeId) continue;
    if (!storeMap.has(emp.storeId)) {
      storeMap.set(emp.storeId, { scores: [], count: 0, storeName: emp.storeId });
    }
    const entry = storeMap.get(emp.storeId)!;
    entry.count += 1;
    if ((emp.javaRistaScore ?? 0) > 0) {
      entry.scores.push(emp.javaRistaScore ?? 0);
    }
  }

  const storeReadiness = Array.from(storeMap.entries()).map(([storeId, data]) => ({
    storeId,
    storeName: data.storeName,
    readinessPercent:
      data.scores.length > 0
        ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
        : 0,
    employeeCount: data.count,
  }));

  successResponse(res, 'Dashboard metrics fetched', {
    trainingCompliance: {
      percent: trainingPercent,
      completed: trainingCompletedCount,
      total: totalEmployees,
    },
    manualCompliance: {
      percent: manualPercent,
      read: manualReadCount,
      total: totalEmployees,
    },
    avgJavaRistaScore,
    totalEmployees,
    activeCoursesCount: activeCourses,
    certificationIssuedCount,
    storeReadiness,
  });
});

export const getMyProgress = asyncHandler(async (req: Request, res: Response) => {
  const progress = await UserProgress.find({ userId: req.user!.userId });
  successResponse(res, 'Progress fetched', progress);
});

export const upsertProgress = asyncHandler(async (req: Request, res: Response) => {
  const { entityType, entityId, status, progressPercent } = req.body;

  if (!entityType || !entityId || !status) {
    errorResponse(res, 'entityType, entityId and status are required', 400);
    return;
  }

  const progress = await UserProgress.findOneAndUpdate(
    {
      userId: new mongoose.Types.ObjectId(req.user!.userId),
      entityType,
      entityId: new mongoose.Types.ObjectId(entityId as string),
    },
    {
      $set: {
        status,
        progressPercent: progressPercent ?? 0,
        ...(status === 'completed' ? { completedAt: new Date() } : {}),
      },
    },
    { upsert: true, new: true, runValidators: true }
  );

  successResponse(res, 'Progress updated', progress, 200);
});
