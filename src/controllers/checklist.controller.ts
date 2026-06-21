import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import ChecklistTemplate, { ChecklistCategory } from '../models/checklist-template.model';
import ChecklistSubmission, { ICompletedItem, SubmissionStatus } from '../models/checklist-submission.model';
import User from '../models/User';

// ─── Templates ────────────────────────────────────────────────────────────────

// GET /api/checklists/templates
export const getTemplates = asyncHandler(async (req: Request, res: Response) => {
  const { category, includeInactive } = req.query;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (req.user?.role !== 'admin' || includeInactive !== 'true') filter['isActive'] = true;
  if (category) filter['category'] = category as ChecklistCategory;

  const templates = await ChecklistTemplate.find(filter)
    .select('-__v')
    .sort({ category: 1, title: 1 });

  successResponse(res, 'Templates fetched', templates);
});

// GET /api/checklists/templates/:id
export const getTemplate = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { _id: req.params['id'] };
  if (req.user?.role !== 'admin') filter['isActive'] = true;
  const template = await ChecklistTemplate.findOne(filter).select('-__v');

  if (!template) {
    errorResponse(res, 'Template not found', 404);
    return;
  }

  successResponse(res, 'Template fetched', template);
});

// POST /api/checklists/templates  (admin only)
export const createTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { title, category, items, isActive } = req.body as {
    title?: string;
    category?: ChecklistCategory;
    items?: Array<{ order: number; label: string; requiresPhoto?: boolean; requiresNote?: boolean }>;
    isActive?: boolean;
  };

  if (!title || !category) {
    errorResponse(res, 'title and category are required', 400);
    return;
  }

  const template = await ChecklistTemplate.create({
    title,
    category,
    items: items ?? [],
    isActive: isActive ?? true,
  });

  successResponse(res, 'Template created', template, 201);
});

// PUT /api/checklists/templates/:id  (admin only)
export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const updates: Record<string, unknown> = {};
  if (req.body.title !== undefined) updates['title'] = req.body.title;
  if (req.body.category !== undefined) updates['category'] = req.body.category;
  if (req.body.items !== undefined) updates['items'] = req.body.items;
  if (req.body.isActive !== undefined) updates['isActive'] = req.body.isActive;

  const template = await ChecklistTemplate.findByIdAndUpdate(req.params['id'], updates, {
    new: true,
    runValidators: true,
  }).select('-__v');

  if (!template) {
    errorResponse(res, 'Template not found', 404);
    return;
  }

  successResponse(res, 'Template updated', template);
});

// ─── Submissions ──────────────────────────────────────────────────────────────

// POST /api/checklists/submissions
export const createSubmission = asyncHandler(async (req: Request, res: Response) => {
  const { templateId, completedItems, status, storeId } = req.body as {
    templateId?: string;
    completedItems?: ICompletedItem[];
    status?: string;
    storeId?: string;
  };

  if (!templateId) {
    errorResponse(res, 'templateId is required', 400);
    return;
  }

  const template = await ChecklistTemplate.findOne({ _id: templateId, isActive: true });
  if (!template) {
    errorResponse(res, 'Template not found', 404);
    return;
  }

  const resolvedStatus = (status as SubmissionStatus) ?? 'in_progress';
  const validStatuses: SubmissionStatus[] = ['in_progress', 'submitted', 'approved', 'flagged'];
  if (!validStatuses.includes(resolvedStatus)) {
    errorResponse(res, `Invalid status. Valid values: ${validStatuses.join(', ')}`, 400);
    return;
  }

  const submittedAt = resolvedStatus === 'submitted' ? new Date() : undefined;

  const { _id } = await ChecklistSubmission.create({
    template: templateId,
    submittedBy: req.user!.userId,
    storeId,
    completedItems: completedItems ?? [],
    status: resolvedStatus,
    submittedAt,
  });

  const populated = await ChecklistSubmission.findById(_id)
    .select('-__v')
    .populate('template', 'title category')
    .populate('submittedBy', 'name email');

  successResponse(res, 'Submission created', populated, 201);
});

// GET /api/checklists/submissions/mine
export const getMySubmissions = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] as string) || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { submittedBy: req.user!.userId };
  if (req.query['status']) filter['status'] = req.query['status'];

  if (req.query['category']) {
    const templates = await ChecklistTemplate.find({
      category: req.query['category'] as ChecklistCategory,
    }).select('_id');
    filter['template'] = { $in: templates.map((t) => t._id) };
  }

  const [submissions, total] = await Promise.all([
    ChecklistSubmission.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('template', 'title category'),
    ChecklistSubmission.countDocuments(filter),
  ]);

  successResponse(res, 'Submissions fetched', submissions, 200, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

// GET /api/checklists/submissions/:id
export const getSubmission = asyncHandler(async (req: Request, res: Response) => {
  const submission = await ChecklistSubmission.findById(req.params['id'])
    .select('-__v')
    .populate('template', 'title category items')
    .populate('submittedBy', 'name email')
    .populate('approvedBy', 'name email');

  if (!submission) {
    errorResponse(res, 'Submission not found', 404);
    return;
  }

  // Only owner or admin can view
  const isOwner = submission.submittedBy._id.toString() === req.user!.userId;
  const isAdmin = req.user!.role === 'admin';
  if (!isOwner && !isAdmin) {
    errorResponse(res, 'Access denied', 403);
    return;
  }

  successResponse(res, 'Submission fetched', submission);
});

// PUT /api/checklists/submissions/:id
export const updateSubmission = asyncHandler(async (req: Request, res: Response) => {
  const submission = await ChecklistSubmission.findById(req.params['id']);

  if (!submission) {
    errorResponse(res, 'Submission not found', 404);
    return;
  }

  // Only owner can update, and only while in_progress
  const isOwner = submission.submittedBy.toString() === req.user!.userId;
  if (!isOwner) {
    errorResponse(res, 'Access denied', 403);
    return;
  }

  if (submission.status !== 'in_progress') {
    errorResponse(res, 'Only in-progress submissions can be updated', 400);
    return;
  }

  const { completedItems, status, storeId } = req.body as {
    completedItems?: ICompletedItem[];
    status?: string;
    storeId?: string;
  };

  if (completedItems !== undefined) submission.completedItems = completedItems as typeof submission.completedItems;
  if (storeId !== undefined) submission.storeId = storeId;

  if (status !== undefined) {
    const validStatuses: SubmissionStatus[] = ['in_progress', 'submitted'];
    if (!validStatuses.includes(status as SubmissionStatus)) {
      errorResponse(res, 'Status can only be set to in_progress or submitted', 400);
      return;
    }
    submission.status = status as SubmissionStatus;
    if (status === 'submitted' && !submission.submittedAt) {
      submission.submittedAt = new Date();
    }
  }

  await submission.save();

  const populated = await submission.populate([
    { path: 'template', select: 'title category' },
    { path: 'submittedBy', select: 'name email' },
  ]);

  successResponse(res, 'Submission updated', populated);
});

// GET /api/checklists/submissions  (admin/manager)
export const getAllSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] as string) || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (req.query['status']) filter['status'] = req.query['status'];
  if (req.query['from'] || req.query['to']) {
    const submittedAt: Record<string, Date> = {};
    if (req.query['from']) submittedAt['$gte'] = new Date(String(req.query['from']));
    if (req.query['to']) {
      const to = new Date(String(req.query['to']));
      to.setHours(23, 59, 59, 999);
      submittedAt['$lte'] = to;
    }
    filter['submittedAt'] = submittedAt;
  }

  if (req.query['category']) {
    const templates = await ChecklistTemplate.find({
      category: req.query['category'] as ChecklistCategory,
    }).select('_id');
    filter['template'] = { $in: templates.map((t) => t._id) };
  }

  if (req.query['employeeSearch']) {
    const users = await User.find({
      name: { $regex: String(req.query['employeeSearch']), $options: 'i' },
    }).select('_id');
    filter['submittedBy'] = { $in: users.map((u) => u._id) };
  }

  const [submissions, total] = await Promise.all([
    ChecklistSubmission.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('template', 'title category')
      .populate('submittedBy', 'name email')
      .populate('approvedBy', 'name email'),
    ChecklistSubmission.countDocuments(filter),
  ]);

  successResponse(res, 'All submissions fetched', submissions, 200, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

// PUT /api/checklists/submissions/:id/approve  (admin/manager)
export const approveSubmission = asyncHandler(async (req: Request, res: Response) => {
  const submission = await ChecklistSubmission.findById(req.params['id']);

  if (!submission) {
    errorResponse(res, 'Submission not found', 404);
    return;
  }

  if (submission.status !== 'submitted') {
    errorResponse(res, 'Only submitted checklists can be approved or flagged', 400);
    return;
  }

  const { status, managerNote } = req.body as {
    status?: string;
    managerNote?: string;
  };

  const validStatuses: SubmissionStatus[] = ['approved', 'flagged'];
  if (!status || !validStatuses.includes(status as SubmissionStatus)) {
    errorResponse(res, `status must be one of: ${validStatuses.join(', ')}`, 400);
    return;
  }

  submission.status = status as SubmissionStatus;
  submission.approvedBy = req.user!.userId as unknown as typeof submission.approvedBy;
  submission.approvedAt = new Date();
  if (managerNote !== undefined) submission.managerNote = managerNote;

  await submission.save();

  const populated = await submission.populate([
    { path: 'template', select: 'title category' },
    { path: 'submittedBy', select: 'name email' },
    { path: 'approvedBy', select: 'name email' },
  ]);

  successResponse(res, `Submission ${status}`, populated);
});
