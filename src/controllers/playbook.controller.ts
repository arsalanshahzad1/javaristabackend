import { Request, Response } from 'express';
import { Types } from 'mongoose';
import asyncHandler from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import Playbook, { PLAYBOOK_CATEGORIES, PlaybookCategory } from '../models/playbook.model';
import PlaybookRead from '../models/PlaybookRead';
import Notification from '../models/Notification';
import User from '../models/User';
import { cloudinary } from '../config/cloudinary';
import { JwtPayload } from '../utils/jwt';

// community < investor < employee — owner bypasses all restrictions.
function getAllowedRoles(user?: JwtPayload): string[] {
  if (!user) return [];
  if (user.role === 'investor') return ['community', 'investor'];
  return ['community', 'investor', 'employee'];
}

// GET /api/playbooks/my-reading-list
export const getMyReadingList = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const userRole = req.user!.role;
  const unreadOnly = req.query['unread'] === 'true';

  const playbooks = await Playbook.find({
    assignedRoles: userRole,
    status: 'published',
    isActive: true,
  }).select('-__v').lean();

  const playbookIds = playbooks.map((p) => p._id);
  const readRecords = await PlaybookRead.find({
    userId: new Types.ObjectId(userId),
    playbookId: { $in: playbookIds },
  }).lean();

  const readMap = new Map(readRecords.map((r) => [r.playbookId.toString(), r]));

  let result = playbooks.map((p) => {
    const record = readMap.get((p._id as Types.ObjectId).toString());
    return {
      ...p,
      isRead: !!record,
      isAcknowledged: record?.acknowledged ?? false,
    };
  });

  if (unreadOnly) {
    result = result.filter((p) => !p.isRead);
  }

  successResponse(res, 'Reading list fetched', result);
});

// GET /api/playbooks
export const getPlaybooks = asyncHandler(async (req: Request, res: Response) => {
  const { search, category, tag, requiredRole, includeInactive } = req.query;
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] as string) || 20));
  const skip = (page - 1) * limit;

  const allowedRoles = getAllowedRoles(req.user);

  const isAdmin = req.user?.role === 'owner';
  const filter: Record<string, unknown> = {
    requiredRole: { $in: allowedRoles },
  };

  if (!isAdmin || includeInactive !== 'true') {
    filter['isActive'] = true;
  }

  if (search) filter['$text'] = { $search: search as string };
  if (category) filter['category'] = category;
  if (requiredRole) filter['requiredRole'] = requiredRole;
  if (tag) filter['tags'] = tag;

  const [playbooks, total] = await Promise.all([
    Playbook.find(filter)
      .select('-body -__v')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort(search ? ({ score: { $meta: 'textScore' } } as any) : { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name'),
    Playbook.countDocuments(filter),
  ]);

  successResponse(res, 'Playbooks fetched', playbooks, 200, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

// GET /api/playbooks/:slug
export const getPlaybook = asyncHandler(async (req: Request, res: Response) => {
  const allowedRoles = getAllowedRoles(req.user);
  const isAdmin = req.user?.role === 'owner';

  const playbook = await Playbook.findOne(isAdmin ? { slug: req.params['slug'] } : { slug: req.params['slug'], isActive: true })
    .select('-__v')
    .populate('createdBy', 'name')
    .populate('relatedPlaybooks', 'title slug category tags');

  if (!playbook) {
    errorResponse(res, 'Playbook not found', 404);
    return;
  }

  if (!isAdmin && !allowedRoles.includes(playbook.requiredRole)) {
    errorResponse(res, 'You do not have access to this playbook', 403);
    return;
  }

  successResponse(res, 'Playbook fetched', playbook);
});

// POST /api/playbooks  (employee or admin)
export const createPlaybook = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.user!;
  if (role === 'investor' || role === 'trainee') {
    errorResponse(res, 'Employee or admin access required', 403);
    return;
  }

  const { title, slug, category, tags, body, requiredRole, relatedPlaybooks, isActive, assignedRoles, accessLevel, complianceTracking } = req.body as {
    title?: string;
    slug?: string;
    category?: string;
    tags?: string[];
    body?: string;
    requiredRole?: string;
    relatedPlaybooks?: string[];
    isActive?: boolean;
    assignedRoles?: string[];
    accessLevel?: string;
    complianceTracking?: { isRequired?: boolean; requiredByDate?: string; acknowledgeRequired?: boolean };
  };

  if (!title || !category) {
    errorResponse(res, 'title and category are required', 400);
    return;
  }

  if (!PLAYBOOK_CATEGORIES.includes(category as PlaybookCategory)) {
    errorResponse(
      res,
      `Invalid category. Valid values: ${PLAYBOOK_CATEGORIES.join(', ')}`,
      400
    );
    return;
  }

  const playbook = await Playbook.create({
    title,
    slug,
    category: category as PlaybookCategory,
    tags: tags ?? [],
    body: body ?? '',
    requiredRole: (requiredRole ?? 'employee') as 'community' | 'investor' | 'employee',
    relatedPlaybooks: relatedPlaybooks ?? [],
    createdBy: req.user!.userId,
    isActive: isActive ?? true,
    assignedRoles: (assignedRoles ?? []) as import('../models/User').UserRole[],
    accessLevel: accessLevel as import('../models/playbook.model').PlaybookAccessLevel | undefined,
    complianceTracking: {
      isRequired: complianceTracking?.isRequired ?? false,
      requiredByDate: complianceTracking?.requiredByDate ? new Date(complianceTracking.requiredByDate) : undefined,
      acknowledgeRequired: complianceTracking?.acknowledgeRequired ?? false,
    },
  });

  successResponse(res, 'Playbook created', playbook, 201);
});

// PUT /api/playbooks/:slug  (admin only)
export const updatePlaybook = asyncHandler(async (req: Request, res: Response) => {
  const playbook = await Playbook.findOne({ slug: req.params['slug'] });

  if (!playbook) {
    errorResponse(res, 'Playbook not found', 404);
    return;
  }

  const updates = req.body as {
    title?: string;
    slug?: string;
    category?: PlaybookCategory;
    tags?: string[];
    body?: string;
    requiredRole?: 'community' | 'investor' | 'employee';
    relatedPlaybooks?: Types.ObjectId[];
    isActive?: boolean;
    assignedRoles?: string[];
    accessLevel?: string;
    complianceTracking?: { isRequired?: boolean; requiredByDate?: string | null; acknowledgeRequired?: boolean };
  };

  if (updates.title !== undefined) playbook.title = updates.title;
  if (updates.slug !== undefined) playbook.slug = updates.slug;
  if (updates.category !== undefined) {
    if (!PLAYBOOK_CATEGORIES.includes(updates.category)) {
      errorResponse(res, `Invalid category. Valid values: ${PLAYBOOK_CATEGORIES.join(', ')}`, 400);
      return;
    }
    playbook.category = updates.category;
  }
  if (updates.tags !== undefined) playbook.tags = updates.tags;
  if (updates.body !== undefined) playbook.body = updates.body;
  if (updates.requiredRole !== undefined) playbook.requiredRole = updates.requiredRole;
  if (updates.relatedPlaybooks !== undefined) playbook.relatedPlaybooks = updates.relatedPlaybooks;
  if (updates.isActive !== undefined) playbook.isActive = updates.isActive;
  if (updates.assignedRoles !== undefined) playbook.assignedRoles = updates.assignedRoles as never[];
  if (updates.accessLevel !== undefined) playbook.accessLevel = (updates.accessLevel || undefined) as never;
  if (updates.complianceTracking !== undefined) {
    const ct = updates.complianceTracking;
    if (ct.isRequired !== undefined) playbook.complianceTracking.isRequired = ct.isRequired;
    if (ct.acknowledgeRequired !== undefined) playbook.complianceTracking.acknowledgeRequired = ct.acknowledgeRequired;
    if ('requiredByDate' in ct) {
      playbook.complianceTracking.requiredByDate = ct.requiredByDate ? new Date(ct.requiredByDate) : undefined;
    }
  }

  await playbook.save();

  successResponse(res, 'Playbook updated', playbook);
});

// DELETE /api/playbooks/:slug  (admin only — soft delete)
export const deletePlaybook = asyncHandler(async (req: Request, res: Response) => {
  const playbook = await Playbook.findOne({ slug: req.params['slug'] });

  if (!playbook) {
    errorResponse(res, 'Playbook not found', 404);
    return;
  }

  if (!playbook.isActive) {
    errorResponse(res, 'Playbook is already deleted', 400);
    return;
  }

  playbook.isActive = false;
  await playbook.save();

  successResponse(res, 'Playbook deleted', { id: playbook._id, slug: playbook.slug });
});

// ── Attachment endpoints ──────────────────────────────────────────────────────

// POST /api/playbooks/:id/attachments
export const addAttachment = asyncHandler(async (req: Request, res: Response) => {
  const playbook = await Playbook.findById(req.params['id']);
  if (!playbook) { errorResponse(res, 'Playbook not found', 404); return; }

  if (!req.file) {
    errorResponse(res, 'No file provided', 400);
    return;
  }

  const type = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image';
  const { title, description } = req.body as { title?: string; description?: string };

  playbook.attachments.push({
    _id: new Types.ObjectId(),
    type,
    url: req.file.path,
    publicId: req.file.filename,
    title: title || req.file.originalname || 'Untitled',
    description: description || undefined,
    order: playbook.attachments.length,
    uploadedBy: new Types.ObjectId(req.user!.userId),
    uploadedAt: new Date(),
  });

  await playbook.save();
  successResponse(res, 'Attachment added', playbook.attachments);
});

// DELETE /api/playbooks/:id/attachments/:attachmentId
export const deleteAttachment = asyncHandler(async (req: Request, res: Response) => {
  const playbook = await Playbook.findById(req.params['id']);
  if (!playbook) { errorResponse(res, 'Playbook not found', 404); return; }

  const attachment = playbook.attachments.find((a) => a._id.toString() === req.params['attachmentId']);
  if (!attachment) { errorResponse(res, 'Attachment not found', 404); return; }

  if (attachment.publicId) {
    try {
      await cloudinary.uploader.destroy(attachment.publicId);
    } catch {
      // skip if Cloudinary deletion fails
    }
  }

  playbook.attachments = playbook.attachments.filter((a) => a._id.toString() !== req.params['attachmentId']) as never;
  await playbook.save();
  successResponse(res, 'Attachment deleted', playbook.attachments);
});

// POST /api/playbooks/:id/video
export const addVideoUrl = asyncHandler(async (req: Request, res: Response) => {
  const playbook = await Playbook.findById(req.params['id']);
  if (!playbook) { errorResponse(res, 'Playbook not found', 404); return; }

  const { url, title, description } = req.body as { url?: string; title?: string; description?: string };
  if (!url || !title) { errorResponse(res, 'url and title are required', 400); return; }

  playbook.attachments.push({
    _id: new Types.ObjectId(),
    type: 'video',
    url,
    title,
    description: description || undefined,
    order: playbook.attachments.length,
    uploadedBy: new Types.ObjectId(req.user!.userId),
    uploadedAt: new Date(),
  });

  await playbook.save();
  successResponse(res, 'Video added', playbook.attachments);
});

// ── Compliance tracking endpoints ─────────────────────────────────────────────

// POST /api/playbooks/:id/read
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = new Types.ObjectId(req.user!.userId);
  const playbookId = new Types.ObjectId(req.params['id'] as string);
  const { durationSeconds } = req.body as { durationSeconds?: number };

  const existing = await PlaybookRead.findOne({ playbookId, userId });
  const alreadyRead = !!existing;

  await PlaybookRead.findOneAndUpdate(
    { playbookId, userId },
    {
      $set: {
        readAt: new Date(),
        ...(durationSeconds !== undefined ? { readDurationSeconds: durationSeconds } : {}),
      },
    },
    { upsert: true, new: true }
  );

  if (!alreadyRead) {
    await Playbook.findByIdAndUpdate(playbookId, { $inc: { readCount: 1 } });
  }

  successResponse(res, 'Marked as read', { alreadyRead });
});

// POST /api/playbooks/:id/acknowledge
export const acknowledgePlaybook = asyncHandler(async (req: Request, res: Response) => {
  const userId = new Types.ObjectId(req.user!.userId);
  const playbookId = new Types.ObjectId(req.params['id'] as string);

  await PlaybookRead.findOneAndUpdate(
    { playbookId, userId },
    {
      $set: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        readAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  // Ensure readCount is accurate
  await Playbook.findByIdAndUpdate(playbookId, { $inc: { readCount: 1 } }, {});

  // Notify manager if reportingTo is set
  const [user, playbook] = await Promise.all([
    User.findById(userId).select('name reportingTo').lean(),
    Playbook.findById(playbookId).select('title').lean(),
  ]);

  if (user?.reportingTo && playbook) {
    try {
      const manager = await User.findById(user.reportingTo).select('_id').lean();
      if (manager) {
        await Notification.create({
          userId: manager._id,
          type: 'general',
          title: 'Playbook Acknowledged',
          body: `${(user as { name?: string }).name ?? 'A team member'} acknowledged "${(playbook as { title?: string }).title ?? 'a playbook'}"`,
          relatedId: playbookId,
          relatedType: 'Playbook',
        });
      }
    } catch {
      // skip notification silently on error
    }
  }

  successResponse(res, 'Playbook acknowledged', { acknowledged: true });
});

// GET /api/playbooks/:id/compliance
export const getCompliance = asyncHandler(async (req: Request, res: Response) => {
  const playbookId = new Types.ObjectId(req.params['id'] as string);
  const playbook = await Playbook.findById(playbookId).select('assignedRoles readCount title').lean();
  if (!playbook) { errorResponse(res, 'Playbook not found', 404); return; }

  const assignedRoles = (playbook as { assignedRoles?: string[] }).assignedRoles ?? [];

  const [totalAssigned, readRecords] = await Promise.all([
    assignedRoles.length > 0 ? User.countDocuments({ role: { $in: assignedRoles as import('../models/User').UserRole[] }, isActive: true }) : 0,
    PlaybookRead.find({ playbookId })
      .populate('userId', 'name')
      .lean(),
  ]);

  const acknowledgedCount = readRecords.filter((r) => r.acknowledged).length;
  const readCount = readRecords.length;
  const safeTotal = totalAssigned || 1;

  const readers = readRecords.map((r) => ({
    userId: r.userId,
    name: (r.userId as unknown as { name?: string })?.name ?? 'Unknown',
    readAt: r.readAt,
    acknowledged: r.acknowledged,
    acknowledgedAt: r.acknowledgedAt,
  }));

  successResponse(res, 'Compliance data fetched', {
    totalAssigned,
    readCount,
    acknowledgedCount,
    readPercent: Math.round((readCount / safeTotal) * 100),
    acknowledgedPercent: Math.round((acknowledgedCount / safeTotal) * 100),
    readers,
  });
});

// ── Workflow endpoints ────────────────────────────────────────────────────────

function incrementVersion(current: string): string {
  const parts = current.split('.').map(Number);
  parts[1] = (parts[1] ?? 0) + 1;
  if ((parts[1] ?? 0) >= 10) { parts[0] = (parts[0] ?? 1) + 1; parts[1] = 0; }
  return `${parts[0]}.${parts[1]}`;
}

// PUT /api/playbooks/:id/submit-review  (any employee)
export const submitForReview = asyncHandler(async (req: Request, res: Response) => {
  const playbook = await Playbook.findById(req.params['id']);
  if (!playbook) { errorResponse(res, 'Playbook not found', 404); return; }
  if (playbook.status !== 'draft') { errorResponse(res, 'Only draft playbooks can be submitted for review', 400); return; }
  playbook.status = 'review';
  await playbook.save();
  successResponse(res, 'Playbook submitted for review', playbook);
});

// PUT /api/playbooks/:id/approve  (admin only)
export const approvePlaybook = asyncHandler(async (req: Request, res: Response) => {
  const playbook = await Playbook.findById(req.params['id']);
  if (!playbook) { errorResponse(res, 'Playbook not found', 404); return; }
  if (playbook.status !== 'review') { errorResponse(res, 'Only playbooks in review can be approved', 400); return; }
  playbook.status = 'approved';
  playbook.approvedBy = new Types.ObjectId(req.user!.userId);
  await playbook.save();
  successResponse(res, 'Playbook approved', playbook);
});

// PUT /api/playbooks/:id/publish  (admin only)
export const publishPlaybook = asyncHandler(async (req: Request, res: Response) => {
  const playbook = await Playbook.findById(req.params['id']);
  if (!playbook) { errorResponse(res, 'Playbook not found', 404); return; }
  if (playbook.status !== 'approved') { errorResponse(res, 'Only approved playbooks can be published', 400); return; }
  playbook.status = 'published';
  playbook.publishedAt = new Date();
  await playbook.save();
  successResponse(res, 'Playbook published', playbook);
});

// PUT /api/playbooks/:id/archive  (admin only)
export const archivePlaybook = asyncHandler(async (req: Request, res: Response) => {
  const playbook = await Playbook.findById(req.params['id']);
  if (!playbook) { errorResponse(res, 'Playbook not found', 404); return; }
  playbook.status = 'archived';
  playbook.archivedAt = new Date();
  await playbook.save();
  successResponse(res, 'Playbook archived', playbook);
});

// PUT /api/playbooks/:id/new-version  (admin only)
export const newVersion = asyncHandler(async (req: Request, res: Response) => {
  const playbook = await Playbook.findById(req.params['id']);
  if (!playbook) { errorResponse(res, 'Playbook not found', 404); return; }
  const { summary } = req.body as { summary?: string };
  if (!summary) { errorResponse(res, 'summary is required', 400); return; }
  const nextVersion = incrementVersion(playbook.version);
  playbook.changeLog.push({
    version: nextVersion,
    changedBy: new Types.ObjectId(req.user!.userId),
    changedAt: new Date(),
    summary,
  });
  playbook.version = nextVersion;
  playbook.status = 'draft';
  await playbook.save();
  successResponse(res, 'New version created', playbook);
});

// GET /api/playbooks/:id/changelog
export const getChangelog = asyncHandler(async (req: Request, res: Response) => {
  const playbook = await Playbook.findById(req.params['id']).select('changeLog version title').populate('changeLog.changedBy', 'name');
  if (!playbook) { errorResponse(res, 'Playbook not found', 404); return; }
  successResponse(res, 'Changelog fetched', playbook.changeLog);
});
