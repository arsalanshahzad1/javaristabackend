import mongoose, { Document, Schema, Types } from 'mongoose';
import type { UserRole } from './User';

export type ChecklistCategory =
  | 'opening'
  | 'closing'
  | 'cleaning'
  | 'inventory'
  | 'product_quality'
  | 'drive_thru'
  | 'equipment_maintenance'
  | 'food_safety'
  | 'delivery_receiving';

export const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  'opening',
  'closing',
  'cleaning',
  'inventory',
  'product_quality',
  'drive_thru',
  'equipment_maintenance',
  'food_safety',
  'delivery_receiving',
];

export interface IChecklistItem {
  order: number;
  label: string;
  requiresPhoto: boolean;
  requiresNote: boolean;
}

export type ChecklistSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface IRecurrence {
  type: RecurrenceType;
  dayOfWeek?: number;
  dayOfMonth?: number;
  time?: string;
}

/** One step in the escalation ladder for missed checklists. */
export interface IEscalationStep {
  /** Minutes after the grace period ends before this step fires. */
  delayMinutes: number;
  /** Roles to notify at this step. */
  notifyRoles: string[];
  /** Optional override message; falls back to a generated message if omitted. */
  message?: string;
}

/** Configuration for automatic missed-checklist alerts. */
export interface IMissedNotification {
  /** When false the scheduler skips this template entirely. */
  enabled: boolean;
  /** Minutes after the due time before the first alert fires. */
  gracePeriodMinutes: number;
  /** Ordered list of escalation steps. */
  escalationSteps: IEscalationStep[];
}

export interface IChecklistTemplate extends Document {
  title: string;
  category: ChecklistCategory;
  items: IChecklistItem[];
  requiredRole: 'employee';
  isActive: boolean;
  assignedRoles: UserRole[];
  /**
   * Store types this template applies to.
   * An empty array means it applies to ALL store types.
   */
  storeTypes: string[];
  recurrence: IRecurrence;
  dueTime?: string;
  isScheduled: boolean;
  /** Default 'medium'. */
  severity?: ChecklistSeverity;
  requiresApproval: boolean;
  approvedBy?: Types.ObjectId;
  missedNotification: IMissedNotification;
  createdAt: Date;
  updatedAt: Date;
}

const ChecklistItemSchema = new Schema<IChecklistItem>(
  {
    order: { type: Number, required: true },
    label: { type: String, required: true, trim: true },
    requiresPhoto: { type: Boolean, default: false },
    requiresNote: { type: Boolean, default: false },
  },
  { _id: false }
);

const RecurrenceSchema = new Schema<IRecurrence>(
  {
    type: { type: String, enum: ['none', 'daily', 'weekly', 'monthly', 'quarterly'], default: 'none' },
    dayOfWeek: { type: Number, min: 0, max: 6 },
    dayOfMonth: { type: Number, min: 1, max: 31 },
    time: { type: String },
  },
  { _id: false }
);

const EscalationStepSchema = new Schema<IEscalationStep>(
  {
    delayMinutes: { type: Number, required: true, min: 0 },
    notifyRoles: { type: [String], default: [] },
    message: { type: String },
  },
  { _id: false }
);

const MissedNotificationSchema = new Schema<IMissedNotification>(
  {
    enabled: { type: Boolean, default: true },
    gracePeriodMinutes: { type: Number, default: 30 },
    escalationSteps: { type: [EscalationStepSchema], default: [] },
  },
  { _id: false }
);

const ChecklistTemplateSchema = new Schema<IChecklistTemplate>(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: CHECKLIST_CATEGORIES,
      required: true,
    },
    items: [ChecklistItemSchema],
    requiredRole: {
      type: String,
      enum: ['employee'],
      default: 'employee',
    },
    isActive: { type: Boolean, default: true },
    assignedRoles: { type: [String], default: [] },
    /** Empty array = applies to all store types. */
    storeTypes: { type: [String], default: [] },
    recurrence: { type: RecurrenceSchema, default: () => ({ type: 'none' }) },
    dueTime: { type: String },
    isScheduled: { type: Boolean, default: false },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    requiresApproval: { type: Boolean, default: false },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    missedNotification: {
      type: MissedNotificationSchema,
      default: () => ({ enabled: true, gracePeriodMinutes: 30, escalationSteps: [] }),
    },
  },
  { timestamps: true }
);

const ChecklistTemplate = mongoose.model<IChecklistTemplate>(
  'ChecklistTemplate',
  ChecklistTemplateSchema
);
export default ChecklistTemplate;
