import { Request, Response } from 'express';
import { Types } from 'mongoose';
import asyncHandler from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import Playbook, { PLAYBOOK_CATEGORIES, PlaybookCategory } from '../models/playbook.model';
import { JwtPayload } from '../utils/jwt';

// community < investor < employee — admin bypasses all restrictions.
function getAllowedRoles(user?: JwtPayload): string[] {
  if (!user) return [];
  if (user.role === 'admin') return ['community', 'investor', 'employee'];
  if (user.role === 'employee') return ['community', 'investor', 'employee'];
  if (user.role === 'investor') return ['community', 'investor'];
  return ['community'];
}

// GET /api/playbooks
export const getPlaybooks = asyncHandler(async (req: Request, res: Response) => {
  const { search, category, tag, requiredRole, includeInactive } = req.query;
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query['limit'] as string) || 20));
  const skip = (page - 1) * limit;

  const allowedRoles = getAllowedRoles(req.user);

  const isAdmin = req.user?.role === 'admin';
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
  const isAdmin = req.user?.role === 'admin';

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
  if (role !== 'admin' && role !== 'employee') {
    errorResponse(res, 'Employee or admin access required', 403);
    return;
  }

  const { title, slug, category, tags, body, mediaUrls, requiredRole, relatedPlaybooks, isActive } = req.body as {
    title?: string;
    slug?: string;
    category?: string;
    tags?: string[];
    body?: string;
    mediaUrls?: string[];
    requiredRole?: string;
    relatedPlaybooks?: string[];
    isActive?: boolean;
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
    mediaUrls: mediaUrls ?? [],
    requiredRole: (requiredRole ?? 'employee') as 'community' | 'investor' | 'employee',
    relatedPlaybooks: relatedPlaybooks ?? [],
    createdBy: req.user!.userId,
    isActive: isActive ?? true,
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
    mediaUrls?: string[];
    requiredRole?: 'community' | 'investor' | 'employee';
    relatedPlaybooks?: Types.ObjectId[];
    isActive?: boolean;
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
  if (updates.mediaUrls !== undefined) playbook.mediaUrls = updates.mediaUrls;
  if (updates.requiredRole !== undefined) playbook.requiredRole = updates.requiredRole;
  if (updates.relatedPlaybooks !== undefined) playbook.relatedPlaybooks = updates.relatedPlaybooks;
  if (updates.isActive !== undefined) playbook.isActive = updates.isActive;

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
