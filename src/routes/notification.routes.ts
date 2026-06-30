import { Router } from 'express';
import {
  getNotifications,
  getUnreadCountHandler,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Specific paths must appear before /:id wildcard routes.
router.get('/unread-count', authMiddleware, getUnreadCountHandler);
router.get('/', authMiddleware, getNotifications);
router.put('/read-all', authMiddleware, markAllNotificationsRead);
router.put('/:id/read', authMiddleware, markNotificationRead);
router.delete('/:id', authMiddleware, deleteNotification);

export default router;
