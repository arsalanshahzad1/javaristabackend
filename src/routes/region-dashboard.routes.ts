import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import Store from '../models/Store';
import User from '../models/User';
import {
  getRegionOverview,
  getRegionStoreBreakdown,
  getRegionScoreTrend,
  getRegionTopPerformers,
  DateRange,
} from '../services/region-dashboard.service';

const router = Router();

/** Safely extracts a scalar string from an Express query param. */
function qs(val: unknown): string | undefined {
  return typeof val === 'string' ? val : undefined;
}

/** Parse optional from/to query params into a DateRange. */
function parseDateRange(from?: string, to?: string): DateRange | undefined {
  if (!from && !to) return undefined;
  const f = from ? new Date(from) : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();
  const t = to ? new Date(to) : new Date();
  if (isNaN(f.getTime()) || isNaN(t.getTime())) return undefined;
  return { from: f, to: t };
}

/**
 * Allows admins/owners unrestricted access.
 * Regional managers may only access the region their own store belongs to.
 */
async function requireRegionAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = req.user!;
  if (user.role === 'owner' || user.role === 'ceo') {
    return next();
  }

  const dbUser = await User.findById(user.userId).select('regionId storeId');
  if (!dbUser) {
    res.status(403).json({ message: 'Access denied to this region' });
    return;
  }

  // If the user has regionId set directly, compare it
  if (dbUser.regionId) {
    if (dbUser.regionId !== (req.params.regionId as string)) {
      res.status(403).json({ message: 'Access denied to this region' });
      return;
    }
    return next();
  }

  // Fall back to looking up the store's regionId
  if (!dbUser.storeId) {
    res.status(403).json({ message: 'Access denied to this region' });
    return;
  }

  const store = await Store.findById(dbUser.storeId).select('regionId');
  if (!store || store.regionId !== (req.params.regionId as string)) {
    res.status(403).json({ message: 'Access denied to this region' });
    return;
  }

  next();
}

/**
 * GET /api/regions
 * Returns all distinct non-null regionIds across stores.
 */
router.get('/', authMiddleware, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const regionIds = await Store.distinct('regionId', { regionId: { $ne: null } });
    res.json(regionIds);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/regions/:regionId/dashboard/overview
 * High-level rolled-up metrics for a region.
 */
router.get(
  '/:regionId/dashboard/overview',
  authMiddleware,
  requireRegionAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const regionId = (req.params.regionId as string) as string;
      const dateRange = parseDateRange(
        qs(req.query.from),
        qs(req.query.to)
      );
      const data = await getRegionOverview(regionId, dateRange);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/regions/:regionId/dashboard/stores
 * Per-store breakdown of all metrics for a region.
 */
router.get(
  '/:regionId/dashboard/stores',
  authMiddleware,
  requireRegionAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const regionId = (req.params.regionId as string) as string;
      const dateRange = parseDateRange(
        qs(req.query.from),
        qs(req.query.to)
      );
      const data = await getRegionStoreBreakdown(regionId, dateRange);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/regions/:regionId/dashboard/trend
 * Daily time-series of checklist compliance and learning completions.
 */
router.get(
  '/:regionId/dashboard/trend',
  authMiddleware,
  requireRegionAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const regionId = (req.params.regionId as string) as string;
      const dateRange = parseDateRange(
        qs(req.query.from),
        qs(req.query.to)
      );
      const data = await getRegionScoreTrend(regionId, dateRange);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/regions/:regionId/dashboard/top-performers
 * Top N employees in a region ranked by JavaRista score.
 * Query param: limit (default 10, max 50)
 */
router.get(
  '/:regionId/dashboard/top-performers',
  authMiddleware,
  requireRegionAccess,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const regionId = (req.params.regionId as string) as string;
      const rawLimit = parseInt(qs(req.query.limit) ?? '', 10);
      const limit = isNaN(rawLimit) ? 10 : Math.min(rawLimit, 50);
      const data = await getRegionTopPerformers(regionId, limit);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
