import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { successResponse, errorResponse } from '../utils/response';
import Notification from '../models/Notification';
import { markAsRead, markAllAsRead, getUnreadCount } from '../services/notification.service';

// GET /api/notifications/unread-count
export const getUnreadCountHandler = asyncHandler(async (req: Request, res: Response) => {
  const count = await getUnreadCount(req.user!.userId);
  successResponse(res, 'Unread count fetched', { count });
});

// GET /api/notifications
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const unreadOnly = req.query['unreadOnly'] === 'true';
  const limit = Math.min(Number(req.query['limit']) || 20, 100);
  const page = Math.max(Number(req.query['page']) || 1, 1);

  const filter: Record<string, unknown> = { userId };
  if (unreadOnly) filter['isRead'] = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-__v'),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  successResponse(res, 'Notifications fetched', { notifications, unreadCount, total });
});

// PUT /api/notifications/read-all
export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  await markAllAsRead(req.user!.userId);
  successResponse(res, 'All notifications marked as read');
});

// PUT /api/notifications/:id/read
export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  await markAsRead(req.params['id'] as string, req.user!.userId);
  successResponse(res, 'Notification marked as read');
});

// DELETE /api/notifications/:id
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params['id'],
    userId: req.user!.userId,
  });
  if (!notification) {
    errorResponse(res, 'Notification not found', 404);
    return;
  }
  successResponse(res, 'Notification deleted');
});
