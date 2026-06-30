import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { authMiddleware } from '../middleware/auth.middleware';

const isValidObjectId = (id: string) => Types.ObjectId.isValid(id);

const MANAGER_OR_ADMIN_ROLES = [
  'owner', 'ceo', 'coo', 'cfo', 'regional_manager',
  'area_manager', 'store_manager', 'assistant_manager', 'hr_manager', 'marketing_manager',
];
import { managerOrAdminMiddleware } from '../middleware/managerOrAdmin.middleware';
import {
  setManager,
  getDirectReports,
  getAncestors,
  getOrgChartData,
} from '../services/org-hierarchy.service';
import {
  submitRoleChangeRequest,
  reviewRoleChangeRequest,
  withdrawRoleChangeRequest,
} from '../services/role-change.service';
import RoleChangeRequest from '../models/RoleChangeRequest';

const router = Router();

// ─── Hierarchy routes ────────────────────────────────────────────────────────

/** GET /api/org/chart?rootUserId= */
router.get('/chart', authMiddleware, async (req: Request, res: Response) => {
  try {
    const rootUserId = req.query.rootUserId
      ? String(req.query.rootUserId)
      : undefined;
    const data = await getOrgChartData(rootUserId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/** GET /api/org/users/:userId/direct-reports */
router.get(
  '/users/:userId/direct-reports',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = String(req.params.userId);
      const data = await getDirectReports(userId);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/** GET /api/org/users/:userId/ancestors */
router.get('/users/:userId/ancestors', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);
    const data = await getAncestors(userId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/** PUT /api/org/users/:userId/manager */
router.put(
  '/users/:userId/manager',
  authMiddleware,
  managerOrAdminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = String(req.params.userId);
      if (!isValidObjectId(userId)) {
        res.status(400).json({ success: false, message: 'Invalid userId' });
        return;
      }
      const { managerId } = req.body as { managerId: string | null };
      if (managerId !== null && managerId !== undefined && !isValidObjectId(String(managerId))) {
        res.status(400).json({ success: false, message: 'Invalid managerId' });
        return;
      }
      await setManager({ userId, managerId: managerId ?? null });
      res.json({ success: true, message: 'Reporting structure updated' });
    } catch (err: any) {
      const isCircular = err.message === 'Circular reporting structure detected';
      res.status(isCircular ? 422 : 500).json({ success: false, message: err.message });
    }
  }
);

// ─── Role change request routes ───────────────────────────────────────────────

/** POST /api/org/role-change-requests */
router.post('/role-change-requests', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { targetUser, toRole, reason, storeId } = req.body as {
      targetUser?: string;
      toRole?: string;
      reason?: string;
      storeId?: string;
    };

    if (!targetUser || !toRole || !reason) {
      res.status(400).json({ success: false, message: 'targetUser, toRole, and reason are required' });
      return;
    }
    if (!isValidObjectId(targetUser)) {
      res.status(400).json({ success: false, message: 'Invalid targetUser' });
      return;
    }

    const requestedBy = req.user!.userId;
    const isManagerOrAdmin = MANAGER_OR_ADMIN_ROLES.includes(req.user!.role);

    // Non-managers may only submit requests for themselves.
    if (!isManagerOrAdmin && targetUser !== requestedBy) {
      res.status(403).json({ success: false, message: 'You may only submit a role change request for yourself' });
      return;
    }

    const request = await submitRoleChangeRequest({
      requestedBy,
      targetUser,
      toRole,
      reason,
      storeId: storeId ?? '',
    });
    res.status(201).json({ success: true, data: request });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/** GET /api/org/role-change-requests?storeId=&status=&page=&limit= */
router.get(
  '/role-change-requests',
  authMiddleware,
  managerOrAdminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const storeId = req.query.storeId ? String(req.query.storeId) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;
      const page = Math.max(1, parseInt(String(req.query.page ?? '1')) || 1);
      const limit = Math.min(100, parseInt(String(req.query.limit ?? '20')) || 20);

      const filter: Record<string, unknown> = {};
      if (storeId) filter.storeId = storeId;
      if (status) filter.status = status;

      const [total, items] = await Promise.all([
        RoleChangeRequest.countDocuments(filter),
        RoleChangeRequest.find(filter)
          .sort({ requestedAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('targetUser', 'name role')
          .populate('reviewedBy', 'name'),
      ]);

      res.json({
        success: true,
        data: items,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/** GET /api/org/role-change-requests/:requestId */
router.get(
  '/role-change-requests/:requestId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const requestId = String(req.params.requestId);
      const request = await RoleChangeRequest.findById(requestId)
        .populate('requestedBy', 'name role')
        .populate('targetUser', 'name role')
        .populate('reviewedBy', 'name');
      if (!request) {
        res.status(404).json({ success: false, message: 'Request not found' });
        return;
      }
      res.json({ success: true, data: request });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/** PATCH /api/org/role-change-requests/:requestId/review */
router.patch(
  '/role-change-requests/:requestId/review',
  authMiddleware,
  managerOrAdminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const requestId = String(req.params.requestId);
      if (!isValidObjectId(requestId)) {
        res.status(400).json({ success: false, message: 'Invalid requestId' });
        return;
      }
      const { decision, reviewNote } = req.body as {
        decision?: 'approved' | 'rejected';
        reviewNote?: string;
      };
      if (!decision || (decision !== 'approved' && decision !== 'rejected')) {
        res.status(400).json({ success: false, message: "decision must be 'approved' or 'rejected'" });
        return;
      }
      const reviewedBy = req.user!.userId;
      const request = await reviewRoleChangeRequest({
        requestId,
        reviewedBy,
        decision,
        reviewNote,
      });
      res.json({ success: true, data: request });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

/** DELETE /api/org/role-change-requests/:requestId */
router.delete(
  '/role-change-requests/:requestId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const requestId = String(req.params.requestId);
      const requestedBy = req.user!.userId;
      await withdrawRoleChangeRequest({ requestId, requestedBy });
      res.json({ success: true, message: 'Request withdrawn' });
    } catch (err: any) {
      const status =
        err.message === 'Only the original requester may withdraw this request' ? 403 : 400;
      res.status(status).json({ success: false, message: err.message });
    }
  }
);

export default router;
