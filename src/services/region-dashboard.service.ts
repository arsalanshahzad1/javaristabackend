import { Types } from 'mongoose';
import Store from '../models/Store';
import User from '../models/User';
import ChecklistSubmission from '../models/checklist-submission.model';
import LearningPathEnrollment from '../models/LearningPathEnrollment';
import Certification from '../models/certification.model';
import RoleChangeRequest from '../models/RoleChangeRequest';

export interface DateRange {
  from: Date;
  to: Date;
}

function resolvedDateRange(dateRange?: DateRange): DateRange {
  if (dateRange) return dateRange;
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from, to };
}

export interface RegionOverview {
  regionId: string;
  storeCount: number;
  totalEmployees: number;
  avgJavaRistaScore: number;
  topStore: { storeId: string; name: string; avgScore: number } | null;
  bottomStore: { storeId: string; name: string; avgScore: number } | null;
  checklistComplianceRate: number;
  learningPathCompletionRate: number;
  activeCertifications: number;
  pendingRoleRequests: number;
}

export interface StoreBreakdown {
  storeId: string;
  storeName: string;
  storeType: string;
  employeeCount: number;
  avgJavaRistaScore: number | null;
  checklistComplianceRate: number;
  learningCompletionRate: number;
  activeCerts: number;
  pendingRoleRequests: number;
}

export interface RegionScorePoint {
  date: string;
  avgScore: number;
  checklistCompliance: number;
  learningCompletions: number;
}

export interface TopPerformer {
  userId: string;
  name: string;
  role: string;
  storeId: string;
  storeName: string;
  javaRistaScore: number;
  completedPaths: number;
  activeCerts: number;
}

/**
 * Returns high-level rolled-up metrics for all stores in a region.
 * Date range defaults to the last 30 days when omitted.
 */
export async function getRegionOverview(
  regionId: string,
  dateRange?: DateRange
): Promise<RegionOverview> {
  const { from, to } = resolvedDateRange(dateRange);

  const stores = await Store.find({ regionId }).select('_id name');
  const zeroed: RegionOverview = {
    regionId,
    storeCount: 0,
    totalEmployees: 0,
    avgJavaRistaScore: 0,
    topStore: null,
    bottomStore: null,
    checklistComplianceRate: 0,
    learningPathCompletionRate: 0,
    activeCertifications: 0,
    pendingRoleRequests: 0,
  };

  if (!stores.length) return zeroed;

  const storeIdObjectIds = stores.map((s) => s._id as Types.ObjectId);
  const storeIdStrings = storeIdObjectIds.map((id) => id.toString());
  const storeNameMap = new Map(stores.map((s) => [s._id.toString(), s.name]));

  const [
    userAggResult,
    checklistAggResult,
    enrollmentAggResult,
    activeCertifications,
    pendingRoleRequests,
  ] = await Promise.all([
    // a. Employee count + avg score per store
    User.aggregate<{ _id: string; avgScore: number | null; employeeCount: number }>([
      { $match: { storeId: { $in: storeIdStrings }, isActive: true } },
      {
        $group: {
          _id: '$storeId',
          avgScore: { $avg: '$javaRistaScore' },
          employeeCount: { $sum: 1 },
        },
      },
    ]),

    // b. Checklist compliance across region
    ChecklistSubmission.aggregate<{ _id: null; total: number; approved: number }>([
      {
        $match: {
          storeId: { $in: storeIdStrings },
          submittedAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
          },
        },
      },
    ]),

    // c. Learning path completion rate
    LearningPathEnrollment.aggregate<{ _id: null; total: number; completed: number }>([
      { $match: { storeId: { $in: storeIdObjectIds } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
    ]),

    // d. Active certifications — Certification has no storeId, look up via users
    (async () => {
      const userIds = await User.find(
        { storeId: { $in: storeIdStrings }, isActive: true },
        '_id'
      ).then((users) => users.map((u) => u._id));
      return Certification.countDocuments({ user: { $in: userIds }, status: 'active' });
    })(),

    // e. Pending role change requests
    RoleChangeRequest.countDocuments({
      storeId: { $in: storeIdObjectIds },
      status: 'pending',
    }),
  ]);

  // Compute totals from user aggregation
  let totalEmployees = 0;
  let weightedScoreSum = 0;
  let scoredEmployeeCount = 0;
  let topStore: RegionOverview['topStore'] = null;
  let bottomStore: RegionOverview['bottomStore'] = null;

  for (const row of userAggResult) {
    totalEmployees += row.employeeCount;
    if (row.avgScore != null) {
      weightedScoreSum += row.avgScore * row.employeeCount;
      scoredEmployeeCount += row.employeeCount;

      const entry = { storeId: row._id, name: storeNameMap.get(row._id) ?? row._id, avgScore: row.avgScore };
      if (!topStore || row.avgScore > topStore.avgScore) topStore = entry;
      if (!bottomStore || row.avgScore < bottomStore.avgScore) bottomStore = entry;
    }
  }

  const avgJavaRistaScore = scoredEmployeeCount > 0 ? weightedScoreSum / scoredEmployeeCount : 0;

  const checkRow = checklistAggResult[0];
  const checklistComplianceRate =
    checkRow && checkRow.total > 0 ? (checkRow.approved / checkRow.total) * 100 : 0;

  const enrollRow = enrollmentAggResult[0];
  const learningPathCompletionRate =
    enrollRow && enrollRow.total > 0 ? (enrollRow.completed / enrollRow.total) * 100 : 0;

  return {
    regionId,
    storeCount: stores.length,
    totalEmployees,
    avgJavaRistaScore,
    topStore,
    bottomStore,
    checklistComplianceRate,
    learningPathCompletionRate,
    activeCertifications,
    pendingRoleRequests,
  };
}

/**
 * Returns per-store breakdown metrics for every store in a region.
 * Uses a single aggregation pass per metric across all stores, then groups in memory.
 * Date range defaults to the last 30 days when omitted.
 */
export async function getRegionStoreBreakdown(
  regionId: string,
  dateRange?: DateRange
): Promise<StoreBreakdown[]> {
  const { from, to } = resolvedDateRange(dateRange);

  const stores = await Store.find({ regionId }).select('_id name storeType');
  if (!stores.length) return [];

  const storeIdObjectIds = stores.map((s) => s._id as Types.ObjectId);
  const storeIdStrings = storeIdObjectIds.map((id) => id.toString());

  const [
    userRows,
    checklistRows,
    enrollmentRows,
    roleRequestRows,
    allUsers,
  ] = await Promise.all([
    // Users grouped by storeId
    User.aggregate<{ _id: string; avgScore: number | null; employeeCount: number }>([
      { $match: { storeId: { $in: storeIdStrings }, isActive: true } },
      {
        $group: {
          _id: '$storeId',
          avgScore: { $avg: '$javaRistaScore' },
          employeeCount: { $sum: 1 },
        },
      },
    ]),

    // Checklist submissions grouped by storeId
    ChecklistSubmission.aggregate<{ _id: string; total: number; approved: number }>([
      {
        $match: {
          storeId: { $in: storeIdStrings },
          submittedAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: '$storeId',
          total: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
          },
        },
      },
    ]),

    // Enrollments grouped by storeId (ObjectId stored as string key via $toString)
    LearningPathEnrollment.aggregate<{ _id: string; total: number; completed: number }>([
      { $match: { storeId: { $in: storeIdObjectIds } } },
      {
        $group: {
          _id: { $toString: '$storeId' },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
    ]),

    // Pending role requests grouped by storeId
    RoleChangeRequest.aggregate<{ _id: string; count: number }>([
      { $match: { storeId: { $in: storeIdObjectIds }, status: 'pending' } },
      {
        $group: {
          _id: { $toString: '$storeId' },
          count: { $sum: 1 },
        },
      },
    ]),

    // All active users in region (for cert lookup)
    User.find({ storeId: { $in: storeIdStrings }, isActive: true }, '_id storeId'),
  ]);

  // Build storeId → userIds map for cert lookup
  const storeUserMap = new Map<string, Types.ObjectId[]>();
  const allUserIds: Types.ObjectId[] = [];
  for (const u of allUsers) {
    const sid = u.storeId as string;
    if (!storeUserMap.has(sid)) storeUserMap.set(sid, []);
    storeUserMap.get(sid)!.push(u._id as Types.ObjectId);
    allUserIds.push(u._id as Types.ObjectId);
  }

  // Single cert query across all users, then group by user→store in memory
  const activeCertDocs = await Certification.find(
    { user: { $in: allUserIds }, status: 'active' },
    'user'
  );

  // Build userId → storeId map
  const userStoreMap = new Map<string, string>();
  for (const u of allUsers) {
    userStoreMap.set((u._id as Types.ObjectId).toString(), u.storeId as string);
  }

  const certByStore = new Map<string, number>();
  for (const cert of activeCertDocs) {
    const uid = (cert.user as Types.ObjectId).toString();
    const sid = userStoreMap.get(uid);
    if (sid) certByStore.set(sid, (certByStore.get(sid) ?? 0) + 1);
  }

  // Index all aggregation results by storeId string
  const userByStore = new Map(userRows.map((r) => [r._id, r]));
  const checkByStore = new Map(checklistRows.map((r) => [r._id, r]));
  const enrollByStore = new Map(enrollmentRows.map((r) => [r._id, r]));
  const roleByStore = new Map(roleRequestRows.map((r) => [r._id, r]));

  const breakdown: StoreBreakdown[] = stores.map((store) => {
    const sid = store._id.toString();
    const userRow = userByStore.get(sid);
    const checkRow = checkByStore.get(sid);
    const enrollRow = enrollByStore.get(sid);
    const roleRow = roleByStore.get(sid);

    return {
      storeId: sid,
      storeName: store.name,
      storeType: store.storeType,
      employeeCount: userRow?.employeeCount ?? 0,
      avgJavaRistaScore: userRow?.avgScore ?? null,
      checklistComplianceRate:
        checkRow && checkRow.total > 0 ? (checkRow.approved / checkRow.total) * 100 : 0,
      learningCompletionRate:
        enrollRow && enrollRow.total > 0 ? (enrollRow.completed / enrollRow.total) * 100 : 0,
      activeCerts: certByStore.get(sid) ?? 0,
      pendingRoleRequests: roleRow?.count ?? 0,
    };
  });

  return breakdown.sort((a, b) => {
    if (a.avgJavaRistaScore === null && b.avgJavaRistaScore === null) return 0;
    if (a.avgJavaRistaScore === null) return 1;
    if (b.avgJavaRistaScore === null) return -1;
    return b.avgJavaRistaScore - a.avgJavaRistaScore;
  });
}

/**
 * Returns a daily time series of checklist compliance and learning completions
 * for all stores in a region. Missing dates are forward-filled.
 * The avgScore column uses the static region-wide average (no per-day score history).
 * Date range defaults to the last 30 days when omitted.
 */
export async function getRegionScoreTrend(
  regionId: string,
  dateRange?: DateRange
): Promise<RegionScorePoint[]> {
  const { from, to } = resolvedDateRange(dateRange);

  const stores = await Store.find({ regionId }).select('_id');
  if (!stores.length) return [];

  const storeIdObjectIds = stores.map((s) => s._id as Types.ObjectId);
  const storeIdStrings = storeIdObjectIds.map((id) => id.toString());

  const [checklistDays, learningDays, userAgg] = await Promise.all([
    ChecklistSubmission.aggregate<{ _id: string; total: number; approved: number }>([
      {
        $match: {
          storeId: { $in: storeIdStrings },
          submittedAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } },
          total: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    LearningPathEnrollment.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          storeId: { $in: storeIdObjectIds },
          status: 'completed',
          completedAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          count: { $sum: 1 },
        },
      },
    ]),

    User.aggregate<{ _id: null; avgScore: number }>([
      { $match: { storeId: { $in: storeIdStrings }, isActive: true, javaRistaScore: { $ne: null } } },
      { $group: { _id: null, avgScore: { $avg: '$javaRistaScore' } } },
    ]),
  ]);

  const regionAvgScore = userAgg[0]?.avgScore ?? 0;

  // Index by date string
  const checkMap = new Map(
    checklistDays.map((r) => [
      r._id,
      r.total > 0 ? (r.approved / r.total) * 100 : 0,
    ])
  );
  const learningMap = new Map(learningDays.map((r) => [r._id, r.count]));

  // Build complete date sequence
  const days: RegionScorePoint[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(23, 59, 59, 999);

  let prevCompliance = 0;
  let prevCompletions = 0;

  while (cursor <= end) {
    const dateStr = cursor.toISOString().slice(0, 10);
    const compliance = checkMap.has(dateStr) ? checkMap.get(dateStr)! : prevCompliance;
    const completions = learningMap.has(dateStr) ? learningMap.get(dateStr)! : prevCompletions;

    days.push({ date: dateStr, avgScore: regionAvgScore, checklistCompliance: compliance, learningCompletions: completions });

    prevCompliance = compliance;
    prevCompletions = completions;
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

/**
 * Returns the top N performers in a region ranked by JavaRista score.
 */
export async function getRegionTopPerformers(
  regionId: string,
  limit = 10
): Promise<TopPerformer[]> {
  const stores = await Store.find({ regionId }).select('_id name');
  if (!stores.length) return [];

  const storeIdObjectIds = stores.map((s) => s._id as Types.ObjectId);
  const storeIdStrings = storeIdObjectIds.map((id) => id.toString());
  const storeNameMap = new Map(stores.map((s) => [s._id.toString(), s.name]));

  const topUsers = await User.find(
    { storeId: { $in: storeIdStrings }, isActive: true, javaRistaScore: { $ne: null } },
    '_id name role storeId javaRistaScore'
  )
    .sort({ javaRistaScore: -1 })
    .limit(limit)
    .lean();

  const performers = await Promise.all(
    topUsers.map(async (u) => {
      const userId = (u._id as Types.ObjectId);
      const [completedPaths, activeCerts] = await Promise.all([
        LearningPathEnrollment.countDocuments({ userId, status: 'completed' }),
        Certification.countDocuments({ user: userId, status: 'active' }),
      ]);

      const sid = u.storeId as string;
      return {
        userId: userId.toString(),
        name: u.name,
        role: u.role,
        storeId: sid,
        storeName: storeNameMap.get(sid) ?? sid,
        javaRistaScore: u.javaRistaScore as number,
        completedPaths,
        activeCerts,
      };
    })
  );

  return performers;
}
