import { Request, Response } from 'express';
import { Types } from 'mongoose';
import asyncHandler from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import ChecklistSchedule from '../models/ChecklistSchedule';
import ChecklistTemplate from '../models/checklist-template.model';
import User from '../models/User';
import { createNotification } from '../services/notification.service';

// GET /api/checklist-schedules/my
export const getMySchedules = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { assignedTo: req.user!.userId };
  if (req.query['status']) filter['status'] = req.query['status'];

  const schedules = await ChecklistSchedule.find(filter)
    .sort({ scheduledFor: 1 })
    .populate('checklistId', 'title category severity dueTime isScheduled')
    .populate('submissionId', 'status')
    .select('-__v');

  successResponse(res, 'Schedules fetched', schedules);
});

// GET /api/checklist-schedules/compliance  (admin only)
export const getComplianceSummary = asyncHandler(async (req: Request, res: Response) => {
  const [total, completed, missed, pending] = await Promise.all([
    ChecklistSchedule.countDocuments(),
    ChecklistSchedule.countDocuments({ status: { $in: ['completed', 'approved'] } }),
    ChecklistSchedule.countDocuments({ status: 'missed' }),
    ChecklistSchedule.countDocuments({ status: 'pending' }),
  ]);

  const now = new Date();
  const overdueCount = await ChecklistSchedule.countDocuments({
    status: { $in: ['pending', 'in_progress'] },
    scheduledFor: { $lt: now },
  });

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // By checklist aggregation
  const byChecklist = await ChecklistSchedule.aggregate([
    {
      $group: {
        _id: '$checklistId',
        totalAssigned: { $sum: 1 },
        completedCount: {
          $sum: { $cond: [{ $in: ['$status', ['completed', 'approved']] }, 1, 0] },
        },
        overdueCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $in: ['$status', ['pending', 'in_progress']] },
                  { $lt: ['$scheduledFor', now] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'checklisttemplates',
        localField: '_id',
        foreignField: '_id',
        as: 'template',
      },
    },
    { $unwind: { path: '$template', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        checklistId: '$_id',
        title: { $ifNull: ['$template.title', 'Unknown'] },
        totalAssigned: 1,
        completedCount: 1,
        overdueCount: 1,
        completionRate: {
          $cond: [
            { $gt: ['$totalAssigned', 0] },
            { $multiply: [{ $divide: ['$completedCount', '$totalAssigned'] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { completionRate: 1 } },
  ]);

  // By store aggregation
  const byStore = await ChecklistSchedule.aggregate([
    { $match: { storeId: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$storeId',
        totalAssigned: { $sum: 1 },
        completedCount: {
          $sum: { $cond: [{ $in: ['$status', ['completed', 'approved']] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        storeId: '$_id',
        storeName: '$_id',
        totalAssigned: 1,
        completionRate: {
          $cond: [
            { $gt: ['$totalAssigned', 0] },
            { $multiply: [{ $divide: ['$completedCount', '$totalAssigned'] }, 100] },
            0,
          ],
        },
      },
    },
    { $sort: { completionRate: 1 } },
  ]);

  successResponse(res, 'Compliance summary fetched', {
    overall: { completionRate, overdueCount, missedCount: missed, pendingCount: pending },
    byChecklist: byChecklist.map((item) => ({ ...item, completionRate: Math.round(item.completionRate) })),
    byStore: byStore.map((item) => ({ ...item, completionRate: Math.round(item.completionRate) })),
  });
});

// POST /api/checklist-schedules/generate  (admin only)
export const generateSchedules = asyncHandler(async (req: Request, res: Response) => {
  const { checklistId, targetDate } = req.body as {
    checklistId?: string;
    targetDate?: string;
  };

  if (!checklistId) {
    errorResponse(res, 'checklistId is required', 400);
    return;
  }

  const template = await ChecklistTemplate.findById(checklistId);
  if (!template) {
    errorResponse(res, 'Checklist template not found', 404);
    return;
  }

  const scheduledFor = targetDate ? new Date(targetDate) : new Date();
  // Normalize to start of day for deduplication
  const dayStart = new Date(scheduledFor);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  const assignedRoles = template.assignedRoles ?? [];
  if (assignedRoles.length === 0) {
    errorResponse(res, 'Template has no assignedRoles defined', 400);
    return;
  }

  const users = await User.find({ role: { $in: assignedRoles } }).select('_id storeId');

  let created = 0;
  for (const user of users) {
    const existing = await ChecklistSchedule.findOne({
      checklistId: template._id,
      assignedTo: user._id,
      scheduledFor: { $gte: dayStart, $lte: dayEnd },
    });

    if (!existing) {
      await ChecklistSchedule.create({
        checklistId: template._id,
        assignedTo: user._id,
        storeId: user.storeId,
        scheduledFor,
      });
      created++;
    }
  }

  successResponse(res, `Generated ${created} schedule instance(s)`, { created, total: users.length });
});

// PUT /api/checklist-schedules/:id/approve  (admin only)
export const approveSchedule = asyncHandler(async (req: Request, res: Response) => {
  const schedule = await ChecklistSchedule.findById(req.params['id']);
  if (!schedule) {
    errorResponse(res, 'Schedule not found', 404);
    return;
  }

  schedule.status = 'approved';
  schedule.approvedBy = req.user!.userId as unknown as typeof schedule.approvedBy;
  schedule.approvedAt = new Date();
  await schedule.save();

  void createNotification({
    userId: schedule.assignedTo.toString(),
    type: 'checklist_approved',
    title: 'Checklist Approved',
    body: 'Your checklist submission has been approved.',
    link: '/checklists',
    relatedId: schedule._id as Types.ObjectId,
    relatedType: 'ChecklistSchedule',
  });

  successResponse(res, 'Schedule approved', schedule);
});

// PUT /api/checklist-schedules/:id/miss  (admin only)
export const markScheduleMissed = asyncHandler(async (req: Request, res: Response) => {
  const schedule = await ChecklistSchedule.findById(req.params['id']);
  if (!schedule) {
    errorResponse(res, 'Schedule not found', 404);
    return;
  }

  schedule.status = 'missed';
  schedule.missedAt = new Date();
  await schedule.save();

  void createNotification({
    userId: schedule.assignedTo.toString(),
    type: 'checklist_missed',
    title: 'Checklist Missed',
    body: 'A checklist assigned to you has been marked as missed.',
    link: '/checklists',
    relatedId: schedule._id as Types.ObjectId,
    relatedType: 'ChecklistSchedule',
  });

  successResponse(res, 'Schedule marked as missed', schedule);
});
