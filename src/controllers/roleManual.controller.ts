import { Request, Response } from 'express';
import { Types } from 'mongoose';
import asyncHandler from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import RoleManual from '../models/RoleManual';
import type { UserRole } from '../models/User';

// GET /api/role-manuals
export const getManuals = asyncHandler(async (req: Request, res: Response) => {
  const manuals = await RoleManual.find({ isActive: true })
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });
  successResponse(res, 'Role manuals fetched', manuals);
});

// GET /api/role-manuals/my
export const getMyManual = asyncHandler(async (req: Request, res: Response) => {
  const role = req.user!.role as UserRole;
  const manual = await RoleManual.findOne({ targetRole: role, isActive: true })
    .populate('createdBy', 'name');
  if (!manual) {
    errorResponse(res, 'No manual found for your role', 404);
    return;
  }
  successResponse(res, 'Role manual fetched', manual);
});

// GET /api/role-manuals/:id
export const getManual = asyncHandler(async (req: Request, res: Response) => {
  const manual = await RoleManual.findById(req.params['id'])
    .populate('createdBy', 'name');
  if (!manual) {
    errorResponse(res, 'Role manual not found', 404);
    return;
  }
  successResponse(res, 'Role manual fetched', manual);
});

// POST /api/role-manuals
export const createManual = asyncHandler(async (req: Request, res: Response) => {
  const { targetRole, title, description, version, isActive } = req.body as {
    targetRole?: string;
    title?: string;
    description?: string;
    version?: string;
    isActive?: boolean;
  };

  if (!targetRole || !title) {
    errorResponse(res, 'targetRole and title are required', 400);
    return;
  }

  const manual = await RoleManual.create({
    targetRole: targetRole as UserRole,
    title,
    description,
    version: version ?? '1.0',
    isActive: isActive ?? true,
    sections: [],
    createdBy: req.user!.userId,
  });

  successResponse(res, 'Role manual created', manual, 201);
});

// PUT /api/role-manuals/:id
export const updateManual = asyncHandler(async (req: Request, res: Response) => {
  const manual = await RoleManual.findById(req.params['id']);
  if (!manual) {
    errorResponse(res, 'Role manual not found', 404);
    return;
  }

  const { targetRole, title, description, version, isActive } = req.body as {
    targetRole?: string;
    title?: string;
    description?: string;
    version?: string;
    isActive?: boolean;
  };

  if (targetRole !== undefined) manual.targetRole = targetRole as UserRole;
  if (title !== undefined) manual.title = title;
  if (description !== undefined) manual.description = description;
  if (version !== undefined) manual.version = version;
  if (isActive !== undefined) manual.isActive = isActive;
  manual.updatedBy = new Types.ObjectId(req.user!.userId);

  await manual.save();
  successResponse(res, 'Role manual updated', manual);
});

// DELETE /api/role-manuals/:id
export const deleteManual = asyncHandler(async (req: Request, res: Response) => {
  const manual = await RoleManual.findByIdAndDelete(req.params['id']);
  if (!manual) {
    errorResponse(res, 'Role manual not found', 404);
    return;
  }
  successResponse(res, 'Role manual deleted', { id: req.params['id'] });
});

// POST /api/role-manuals/:id/sections
export const addSection = asyncHandler(async (req: Request, res: Response) => {
  const manual = await RoleManual.findById(req.params['id']);
  if (!manual) {
    errorResponse(res, 'Role manual not found', 404);
    return;
  }

  const { title, order } = req.body as { title?: string; order?: number };
  if (!title) {
    errorResponse(res, 'title is required', 400);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  manual.sections.push({ title, order: order ?? manual.sections.length, items: [] } as any);
  manual.updatedBy = new Types.ObjectId(req.user!.userId);
  await manual.save();

  successResponse(res, 'Section added', manual, 201);
});

// PUT /api/role-manuals/:id/sections/:sectionId
export const updateSection = asyncHandler(async (req: Request, res: Response) => {
  const manual = await RoleManual.findById(req.params['id']);
  if (!manual) {
    errorResponse(res, 'Role manual not found', 404);
    return;
  }

  const section = manual.sections.find(s => s._id.toString() === req.params['sectionId']);
  if (!section) {
    errorResponse(res, 'Section not found', 404);
    return;
  }

  const { title, order } = req.body as { title?: string; order?: number };
  if (title !== undefined) section.title = title;
  if (order !== undefined) section.order = order;
  manual.updatedBy = new Types.ObjectId(req.user!.userId);
  await manual.save();

  successResponse(res, 'Section updated', manual);
});

// DELETE /api/role-manuals/:id/sections/:sectionId
export const deleteSection = asyncHandler(async (req: Request, res: Response) => {
  const manual = await RoleManual.findById(req.params['id']);
  if (!manual) {
    errorResponse(res, 'Role manual not found', 404);
    return;
  }

  const index = manual.sections.findIndex(s => s._id.toString() === req.params['sectionId']);
  if (index === -1) {
    errorResponse(res, 'Section not found', 404);
    return;
  }

  manual.sections.splice(index, 1);
  manual.updatedBy = new Types.ObjectId(req.user!.userId);
  await manual.save();

  successResponse(res, 'Section deleted', manual);
});

// POST /api/role-manuals/:id/sections/:sectionId/items
export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const manual = await RoleManual.findById(req.params['id']);
  if (!manual) {
    errorResponse(res, 'Role manual not found', 404);
    return;
  }

  const section = manual.sections.find(s => s._id.toString() === req.params['sectionId']);
  if (!section) {
    errorResponse(res, 'Section not found', 404);
    return;
  }

  const { type, title, description, contentUrl, contentText, isRequired, order, estimatedMinutes } = req.body as {
    type?: string;
    title?: string;
    description?: string;
    contentUrl?: string;
    contentText?: string;
    isRequired?: boolean;
    order?: number;
    estimatedMinutes?: number;
  };

  if (!type || !title) {
    errorResponse(res, 'type and title are required', 400);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  section.items.push({
    type,
    title,
    description,
    contentUrl,
    contentText,
    isRequired: isRequired ?? false,
    order: order ?? section.items.length,
    estimatedMinutes,
  } as any);
  manual.updatedBy = new Types.ObjectId(req.user!.userId);
  await manual.save();

  successResponse(res, 'Item added', manual, 201);
});

// PUT /api/role-manuals/:id/sections/:sectionId/items/:itemId
export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const manual = await RoleManual.findById(req.params['id']);
  if (!manual) {
    errorResponse(res, 'Role manual not found', 404);
    return;
  }

  const section = manual.sections.find(s => s._id.toString() === req.params['sectionId']);
  if (!section) {
    errorResponse(res, 'Section not found', 404);
    return;
  }

  const item = section.items.find(i => i._id.toString() === req.params['itemId']);
  if (!item) {
    errorResponse(res, 'Item not found', 404);
    return;
  }

  const { type, title, description, contentUrl, contentText, isRequired, order, estimatedMinutes } = req.body as {
    type?: string;
    title?: string;
    description?: string;
    contentUrl?: string;
    contentText?: string;
    isRequired?: boolean;
    order?: number;
    estimatedMinutes?: number;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (type !== undefined) (item as any).type = type;
  if (title !== undefined) item.title = title;
  if (description !== undefined) item.description = description;
  if (contentUrl !== undefined) item.contentUrl = contentUrl;
  if (contentText !== undefined) item.contentText = contentText;
  if (isRequired !== undefined) item.isRequired = isRequired;
  if (order !== undefined) item.order = order;
  if (estimatedMinutes !== undefined) item.estimatedMinutes = estimatedMinutes;
  manual.updatedBy = new Types.ObjectId(req.user!.userId);
  await manual.save();

  successResponse(res, 'Item updated', manual);
});

// DELETE /api/role-manuals/:id/sections/:sectionId/items/:itemId
export const deleteItem = asyncHandler(async (req: Request, res: Response) => {
  const manual = await RoleManual.findById(req.params['id']);
  if (!manual) {
    errorResponse(res, 'Role manual not found', 404);
    return;
  }

  const section = manual.sections.find(s => s._id.toString() === req.params['sectionId']);
  if (!section) {
    errorResponse(res, 'Section not found', 404);
    return;
  }

  const index = section.items.findIndex(i => i._id.toString() === req.params['itemId']);
  if (index === -1) {
    errorResponse(res, 'Item not found', 404);
    return;
  }

  section.items.splice(index, 1);
  manual.updatedBy = new Types.ObjectId(req.user!.userId);
  await manual.save();

  successResponse(res, 'Item deleted', manual);
});
