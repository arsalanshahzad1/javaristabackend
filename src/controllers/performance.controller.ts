import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import CourseEnrollment from '../models/course-enrollment.model';
import Certification from '../models/certification.model';
import ChecklistSubmission from '../models/checklist-submission.model';
import BrewLog from '../models/BrewLog';
import { successResponse, errorResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';
import type { PerformanceProfile, TeamMemberSummary } from '../models/performance-profile.model';

function extractLevel(certType: string): number {
  const match = certType.match(/^javarista_level_(\d+)$/);
  return match ? parseInt(match[1]!, 10) : 0;
}

async function assembleProfile(userId: string): Promise<PerformanceProfile | null> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;

  const userObjId = new mongoose.Types.ObjectId(userId);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [user, enrollments, certs, submissions, totalBrews, ratingResult, thisMonth] =
    await Promise.all([
      User.findById(userObjId).select('name email role'),
      CourseEnrollment.find({ user: userObjId }).populate('course', 'title lessons level category'),
      Certification.find({ user: userObjId, status: 'active' }).select(
        'type issuedAt certificateNumber'
      ),
      ChecklistSubmission.find({ submittedBy: userObjId })
        .populate('template', 'title')
        .sort({ createdAt: -1 }),
      BrewLog.countDocuments({ user: userObjId }),
      BrewLog.aggregate([
        { $match: { user: userObjId, rating: { $exists: true, $ne: null } } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } },
      ]),
      BrewLog.countDocuments({ user: userObjId, completedAt: { $gte: startOfMonth } }),
    ]);

  if (!user) return null;

  // Academy — split into completed and in-progress
  const completedEnrollments = enrollments.filter((e) => e.completedAt != null);
  const inProgressEnrollments = enrollments.filter((e) => e.completedAt == null);

  const currentLevel = certs.reduce((max, c) => Math.max(max, extractLevel(c.type)), 0);

  const coursesInProgress = inProgressEnrollments.map((e) => {
    const course = e.course as unknown as {
      _id: mongoose.Types.ObjectId;
      title: string;
      lessons: unknown[];
    };
    const total = course?.lessons?.length ?? 0;
    const progressPercent =
      total === 0 ? 0 : Math.round((e.completedLessons.length / total) * 100);
    return { courseId: course._id, title: course.title ?? '', progressPercent };
  });

  // Checklists — exclude in-progress from submission counts
  const submitted = submissions.filter((s) => s.status !== 'in_progress');
  const totalApproved = submitted.filter((s) => s.status === 'approved').length;
  const totalFlagged = submitted.filter((s) => s.status === 'flagged').length;
  const approvalRate =
    submitted.length > 0
      ? parseFloat(((totalApproved / submitted.length) * 100).toFixed(1))
      : 0;

  const recentSubmissions = submissions.slice(0, 5).map((s) => {
    const tmpl = s.template as unknown as { title?: string } | null;
    return {
      templateTitle: tmpl?.title ?? '',
      status: s.status,
      submittedAt: s.submittedAt,
    };
  });

  // Brewing
  const avgRating = ratingResult[0]?.avgRating
    ? parseFloat((ratingResult[0].avgRating as number).toFixed(2))
    : null;

  return {
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    academy: {
      enrolledCourses: enrollments.length,
      completedCourses: completedEnrollments.length,
      currentLevel,
      coursesInProgress,
    },
    certifications: {
      total: certs.length,
      list: certs.map((c) => ({
        type: c.type,
        issuedAt: c.issuedAt,
        certificateNumber: c.certificateNumber,
      })),
    },
    checklists: {
      totalSubmitted: submitted.length,
      totalApproved,
      totalFlagged,
      approvalRate,
      recentSubmissions,
    },
    brewing: { totalBrews, avgRating, thisMonth },
  };
}

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await assembleProfile(req.user!.userId);
  if (!profile) {
    errorResponse(res, 'User not found', 404);
    return;
  }
  successResponse(res, 'Performance profile fetched', profile);
});

export const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = String(req.params['userId'] ?? '');

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    errorResponse(res, 'Invalid user ID', 400);
    return;
  }

  const profile = await assembleProfile(userId);
  if (!profile) {
    errorResponse(res, 'User not found', 404);
    return;
  }
  successResponse(res, 'Performance profile fetched', profile);
});

export const getTeamProfiles = asyncHandler(async (req: Request, res: Response) => {
  const employees = await User.find({ role: 'employee' }).select('name email role');

  if (employees.length === 0) {
    successResponse(res, 'Team profiles fetched', []);
    return;
  }

  const userIds = employees.map((u) => u._id as mongoose.Types.ObjectId);

  const [completedEnrollmentAgg, levelAgg, brewAgg, checklistAgg] = await Promise.all([
    // Completed courses per user
    CourseEnrollment.aggregate([
      { $match: { user: { $in: userIds }, completedAt: { $ne: null } } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
    ]),

    // Highest javarista level cert per user
    Certification.aggregate([
      {
        $match: {
          user: { $in: userIds },
          status: 'active',
          type: { $regex: '^javarista_level_' },
        },
      },
      {
        $addFields: {
          levelNum: {
            $toInt: { $arrayElemAt: [{ $split: ['$type', '_'] }, -1] },
          },
        },
      },
      { $group: { _id: '$user', currentLevel: { $max: '$levelNum' } } },
    ]),

    // Total brew count per user
    BrewLog.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: '$user', totalBrews: { $sum: 1 } } },
    ]),

    // Checklist approval rate per user (excluding in_progress)
    ChecklistSubmission.aggregate([
      { $match: { submittedBy: { $in: userIds }, status: { $ne: 'in_progress' } } },
      {
        $group: {
          _id: '$submittedBy',
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        },
      },
      {
        $project: {
          approvalRate: {
            $cond: [
              { $gt: ['$total', 0] },
              { $round: [{ $multiply: [{ $divide: ['$approved', '$total'] }, 100] }, 1] },
              0,
            ],
          },
        },
      },
    ]),
  ]);

  const completedMap = new Map<string, number>(
    completedEnrollmentAgg.map((e) => [e._id.toString(), e.count as number])
  );
  const levelMap = new Map<string, number>(
    levelAgg.map((e) => [e._id.toString(), e.currentLevel as number])
  );
  const brewMap = new Map<string, number>(
    brewAgg.map((e) => [e._id.toString(), e.totalBrews as number])
  );
  const checklistMap = new Map<string, number>(
    checklistAgg.map((e) => [e._id.toString(), e.approvalRate as number])
  );

  const team: TeamMemberSummary[] = employees.map((u) => {
    const id = (u._id as mongoose.Types.ObjectId).toString();
    return {
      user: { id: u._id, name: u.name, email: u.email, role: u.role },
      currentLevel: levelMap.get(id) ?? 0,
      totalBrews: brewMap.get(id) ?? 0,
      approvalRate: checklistMap.get(id) ?? 0,
      completedCourses: completedMap.get(id) ?? 0,
    };
  });

  successResponse(res, 'Team profiles fetched', team);
});
