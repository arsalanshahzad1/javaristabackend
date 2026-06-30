import { Types } from 'mongoose';
import Notification, { INotification } from '../models/Notification';
import User from '../models/User';
import { sendEmail } from '../config/mailer';

/**
 * Creates a notification document and optionally sends an email to the recipient.
 * Returns the saved document so callers (e.g. the missed-checklist job) can
 * inspect it or capture its _id.
 */
export async function createNotification(data: {
  userId: Types.ObjectId | string;
  type: INotification['type'];
  title: string;
  body: string;
  link?: string;
  relatedId?: Types.ObjectId;
  relatedType?: string;
  sendEmail?: boolean;
  emailHtml?: string;
  storeId?: Types.ObjectId;
  checklistId?: Types.ObjectId;
  submissionId?: Types.ObjectId;
  recipientRole?: string;
  severity?: INotification['severity'];
  dedupKey?: string;
}): Promise<INotification | null> {
  try {
    const doc = await Notification.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      link: data.link,
      relatedId: data.relatedId,
      relatedType: data.relatedType,
      storeId: data.storeId,
      checklistId: data.checklistId,
      submissionId: data.submissionId,
      recipientRole: data.recipientRole,
      severity: data.severity,
      dedupKey: data.dedupKey,
    });

    if (data.sendEmail && data.emailHtml) {
      const user = await User.findById(data.userId).select('email');
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: data.title,
          html: data.emailHtml,
        });
      }
    }

    return doc;
  } catch (err) {
    console.error('[notification.service] createNotification error:', err);
    return null;
  }
}

/** Returns the number of unread notifications for a user. */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    return await Notification.countDocuments({ userId, isRead: false });
  } catch (err) {
    console.error('[notification.service] getUnreadCount error:', err);
    return 0;
  }
}

/**
 * Returns paginated notifications for a user, newest first.
 * @param page  1-based page number (default 1)
 * @param limit Max records per page (default 20)
 */
export async function getUserNotifications(
  userId: string,
  page = 1,
  limit = 20,
): Promise<INotification[]> {
  try {
    return await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-__v');
  } catch (err) {
    console.error('[notification.service] getUserNotifications error:', err);
    return [];
  }
}

/** Marks a single notification as read, verifying ownership. */
export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  try {
    await Notification.updateOne(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
    );
  } catch (err) {
    console.error('[notification.service] markAsRead error:', err);
  }
}

/** Marks all unread notifications for a user as read. */
export async function markAllAsRead(userId: string): Promise<void> {
  try {
    const now = new Date();
    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: now },
    );
  } catch (err) {
    console.error('[notification.service] markAllAsRead error:', err);
  }
}
