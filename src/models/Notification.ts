import mongoose, { Document, Schema, Types } from 'mongoose';

export type NotificationType =
  | 'checklist_due'
  | 'checklist_missed'
  | 'checklist_approved'
  | 'certification_expiring'
  | 'certification_issued'
  | 'role_changed'
  | 'manual_assigned'
  | 'course_assigned'
  | 'general'
  | 'missed_checklist'
  | 'escalation';

export type NotificationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  readAt?: Date;
  link?: string;
  relatedId?: Types.ObjectId;
  relatedType?: string;
  /** ObjectId of the store this notification relates to (missed-checklist alerts). */
  storeId?: Types.ObjectId;
  /** ObjectId of the ChecklistTemplate this notification relates to. */
  checklistId?: Types.ObjectId;
  /** ObjectId of the ChecklistSubmission, present for approval/rejection alerts. */
  submissionId?: Types.ObjectId;
  /** Role of the recipient at the time the notification was sent. */
  recipientRole?: string;
  /** Visual priority level for the notification. */
  severity?: NotificationSeverity;
  /**
   * Deduplication key for scheduled jobs.
   * Format: `missed-{checklistId}-{storeId}-{YYYY-MM-DD}-step{N}`
   */
  dedupKey?: string;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'checklist_due',
        'checklist_missed',
        'checklist_approved',
        'certification_expiring',
        'certification_issued',
        'role_changed',
        'manual_assigned',
        'course_assigned',
        'general',
        'missed_checklist',
        'escalation',
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    link: { type: String },
    relatedId: { type: Schema.Types.ObjectId },
    relatedType: { type: String },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    checklistId: { type: Schema.Types.ObjectId, ref: 'ChecklistTemplate' },
    submissionId: { type: Schema.Types.ObjectId, ref: 'ChecklistSubmission' },
    recipientRole: { type: String },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    dedupKey: { type: String },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ dedupKey: 1 }, { sparse: true });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

export default mongoose.model<INotification>('Notification', notificationSchema);
