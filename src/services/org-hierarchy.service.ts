import mongoose, { Types } from 'mongoose';
import User, { IUser } from '../models/User';

export interface SubtreeNode {
  user: Partial<IUser>;
  directReports: SubtreeNode[];
}

/**
 * Sets the reporting manager for a user and cascades hierarchy updates to all
 * descendants using BFS to avoid stack overflow on deep trees.
 */
export async function setManager(params: {
  userId: string;
  managerId: string | null;
}): Promise<void> {
  try {
    const { userId, managerId } = params;

    const user = await User.findById(userId);
    if (!user) throw new Error(`User ${userId} not found`);

    let manager: IUser | null = null;
    if (managerId) {
      manager = await User.findById(managerId);
      if (!manager) throw new Error(`Manager ${managerId} not found`);

      // Circular reference guard: userId must not appear in manager's hierarchyPath
      const managerPathIds = manager.hierarchyPath.map((id) => id.toString());
      if (managerPathIds.includes(userId) || manager._id.toString() === userId) {
        throw new Error('Circular reporting structure detected');
      }
    }

    // Remove userId from old manager's directReports
    if (user.reportsTo) {
      await User.updateOne(
        { _id: user.reportsTo },
        { $pull: { directReports: new Types.ObjectId(userId) } }
      );
    }

    // Update reporting fields on the user
    user.reportsTo = managerId ? new Types.ObjectId(managerId) : null;

    if (!managerId || !manager) {
      user.hierarchyPath = [];
      user.hierarchyDepth = 0;
    } else {
      user.hierarchyPath = [...manager.hierarchyPath, manager._id as Types.ObjectId];
      user.hierarchyDepth = manager.hierarchyDepth + 1;

      // Add userId to new manager's directReports (idempotent)
      const alreadyListed = manager.directReports
        .map((id) => id.toString())
        .includes(userId);
      if (!alreadyListed) {
        manager.directReports.push(new Types.ObjectId(userId));
        await manager.save();
      }
    }

    await user.save();

    // BFS cascade: update hierarchyPath/depth for all descendants
    const queue: Types.ObjectId[] = [...user.directReports];
    while (queue.length > 0) {
      const childId = queue.shift()!;
      const child = await User.findById(childId);
      if (!child) continue;

      const parent = await User.findById(child.reportsTo);
      if (parent) {
        child.hierarchyPath = [...parent.hierarchyPath, parent._id as Types.ObjectId];
        child.hierarchyDepth = parent.hierarchyDepth + 1;
        await child.save();
      }

      for (const grandchildId of child.directReports) {
        queue.push(grandchildId);
      }
    }
  } catch (err) {
    console.error('[org-hierarchy.service] setManager error:', err);
    throw err;
  }
}

/**
 * Returns all users who directly report to the given userId.
 */
export async function getDirectReports(userId: string): Promise<IUser[]> {
  try {
    return await User.find({ reportsTo: new Types.ObjectId(userId) }).select(
      'name role storeId javaRistaScore lastComputedAt'
    );
  } catch (err) {
    console.error('[org-hierarchy.service] getDirectReports error:', err);
    throw err;
  }
}

/**
 * Returns the full reporting tree beneath userId as a nested structure.
 * Uses hierarchyPath index for a single DB call; builds tree in memory.
 */
export async function getFullSubtree(userId: string): Promise<SubtreeNode[]> {
  try {
    const root = await User.findById(userId).select(
      '_id name role storeId javaRistaScore reportsTo directReports hierarchyDepth'
    );
    if (!root) return [];

    const descendants = await User.find({
      hierarchyPath: new Types.ObjectId(userId),
    }).select('_id name role storeId javaRistaScore reportsTo');

    const nodeMap = new Map<string, SubtreeNode>();
    nodeMap.set(userId, { user: root, directReports: [] });

    for (const desc of descendants) {
      nodeMap.set(desc._id.toString(), { user: desc, directReports: [] });
    }

    for (const desc of descendants) {
      const parentId = desc.reportsTo?.toString();
      if (parentId && nodeMap.has(parentId)) {
        nodeMap.get(parentId)!.directReports.push(nodeMap.get(desc._id.toString())!);
      }
    }

    // Sort each level by role then name
    for (const node of nodeMap.values()) {
      node.directReports.sort((a, b) => {
        const roleComp = ((a.user as IUser).role ?? '').localeCompare(
          (b.user as IUser).role ?? ''
        );
        if (roleComp !== 0) return roleComp;
        return ((a.user as IUser).name ?? '').localeCompare((b.user as IUser).name ?? '');
      });
    }

    return [nodeMap.get(userId)!];
  } catch (err) {
    console.error('[org-hierarchy.service] getFullSubtree error:', err);
    throw err;
  }
}

/**
 * Returns the ordered chain of ancestors from root to the user's direct manager.
 * Uses hierarchyPath for a single DB call.
 */
export async function getAncestors(userId: string): Promise<IUser[]> {
  try {
    const user = await User.findById(userId).select('hierarchyPath');
    if (!user || user.hierarchyPath.length === 0) return [];

    const ancestorDocs = await User.find({
      _id: { $in: user.hierarchyPath },
    }).select('name role storeId');

    // Restore the order defined by hierarchyPath
    const idOrder = user.hierarchyPath.map((id) => id.toString());
    const docMap = new Map(ancestorDocs.map((u) => [u._id.toString(), u]));
    const ordered: IUser[] = [];
    for (const id of idOrder) {
      const doc = docMap.get(id);
      if (doc) ordered.push(doc);
    }
    return ordered;
  } catch (err) {
    console.error('[org-hierarchy.service] getAncestors error:', err);
    throw err;
  }
}

/**
 * Returns the org chart data as a nested tree.
 * If rootUserId is given, returns the subtree from that user.
 * Otherwise builds the full org tree in a single DB call.
 */
export async function getOrgChartData(rootUserId?: string): Promise<SubtreeNode[]> {
  try {
    if (rootUserId) {
      return getFullSubtree(rootUserId);
    }

    // Load all users in one query and build the full tree in memory
    const allUsers = await User.find({}).select(
      '_id name role storeId javaRistaScore reportsTo hierarchyDepth'
    );

    const nodeMap = new Map<string, SubtreeNode>();
    for (const u of allUsers) {
      nodeMap.set(u._id.toString(), { user: u, directReports: [] });
    }

    const roots: SubtreeNode[] = [];
    for (const u of allUsers) {
      const parentId = (u as IUser).reportsTo?.toString();
      if (parentId && nodeMap.has(parentId)) {
        nodeMap.get(parentId)!.directReports.push(nodeMap.get(u._id.toString())!);
      } else {
        roots.push(nodeMap.get(u._id.toString())!);
      }
    }

    // Sort each level by role then name
    for (const node of nodeMap.values()) {
      node.directReports.sort((a, b) => {
        const roleComp = ((a.user as IUser).role ?? '').localeCompare(
          (b.user as IUser).role ?? ''
        );
        if (roleComp !== 0) return roleComp;
        return ((a.user as IUser).name ?? '').localeCompare((b.user as IUser).name ?? '');
      });
    }

    return roots;
  } catch (err) {
    console.error('[org-hierarchy.service] getOrgChartData error:', err);
    throw err;
  }
}
