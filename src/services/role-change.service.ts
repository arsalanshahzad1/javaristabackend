import RoleChangeRequest, { IRoleChangeRequest } from '../models/RoleChangeRequest';
import User from '../models/User';
import { createNotification } from './notification.service';
import { triggerScoreRecompute } from './score-events.service';

/**
 * Creates a new role change request for a target user.
 * Notifies the target user's manager on submission.
 */
export async function submitRoleChangeRequest(params: {
  requestedBy: string;
  targetUser: string;
  toRole: string;
  reason: string;
  storeId: string;
}): Promise<IRoleChangeRequest> {
  try {
    const { requestedBy, targetUser, toRole, reason, storeId } = params;

    const target = await User.findById(targetUser);
    if (!target) throw new Error('Target user not found');

    const fromRole = target.role;
    if (toRole === fromRole) {
      throw new Error('Target role is the same as current role');
    }

    const existing = await RoleChangeRequest.findOne({ targetUser, status: 'pending' });
    if (existing) {
      throw new Error('A pending role change request already exists for this user');
    }

    const request = await RoleChangeRequest.create({
      requestedBy,
      targetUser,
      fromRole,
      toRole,
      reason,
      storeId,
    });

    // Notify the target user's manager if one exists
    if (target.reportsTo) {
      createNotification({
        userId: target.reportsTo,
        type: 'general',
        title: 'Role Change Request',
        body: `${target.name} has requested a role change to ${toRole}.`,
      }).catch(() => {});
    }

    return request;
  } catch (err) {
    console.error('[role-change.service] submitRoleChangeRequest error:', err);
    throw err;
  }
}

/**
 * Approves or rejects a pending role change request.
 * On approval: updates the user's role and triggers a score recompute.
 * In both cases: notifies the target user and marks the request as notified.
 */
export async function reviewRoleChangeRequest(params: {
  requestId: string;
  reviewedBy: string;
  decision: 'approved' | 'rejected';
  reviewNote?: string;
}): Promise<IRoleChangeRequest> {
  try {
    const { requestId, reviewedBy, decision, reviewNote } = params;

    const request = await RoleChangeRequest.findById(requestId);
    if (!request) throw new Error('Role change request not found');
    if (request.status !== 'pending') throw new Error('Request is no longer pending');

    request.status = decision;
    request.reviewedBy = reviewedBy as unknown as import('mongoose').Types.ObjectId;
    request.reviewedAt = new Date();
    if (reviewNote !== undefined) request.reviewNote = reviewNote;

    if (decision === 'approved') {
      const target = await User.findById(request.targetUser);
      if (target) {
        target.role = request.toRole as typeof target.role;
        await target.save();

        triggerScoreRecompute(target._id.toString(), 'role_changed').catch(() => {});

        createNotification({
          userId: target._id,
          type: 'role_changed',
          title: 'Role Change Approved',
          body: `Your role has been updated to ${request.toRole}.`,
        }).catch(() => {});
      }
    } else {
      createNotification({
        userId: request.targetUser,
        type: 'general',
        title: 'Role Change Not Approved',
        body: `Your request to change role to ${request.toRole} was not approved. Note: ${reviewNote ?? 'No reason provided.'}`,
      }).catch(() => {});
    }

    request.notified = true;
    await request.save();

    return request;
  } catch (err) {
    console.error('[role-change.service] reviewRoleChangeRequest error:', err);
    throw err;
  }
}

/**
 * Withdraws a pending role change request. Only the original requestedBy may withdraw.
 */
export async function withdrawRoleChangeRequest(params: {
  requestId: string;
  requestedBy: string;
}): Promise<void> {
  try {
    const { requestId, requestedBy } = params;

    const request = await RoleChangeRequest.findById(requestId);
    if (!request) throw new Error('Role change request not found');
    if (request.requestedBy.toString() !== requestedBy) {
      throw new Error('Only the original requester may withdraw this request');
    }
    if (request.status !== 'pending') {
      throw new Error('Only pending requests can be withdrawn');
    }

    request.status = 'withdrawn';
    await request.save();
  } catch (err) {
    console.error('[role-change.service] withdrawRoleChangeRequest error:', err);
    throw err;
  }
}
