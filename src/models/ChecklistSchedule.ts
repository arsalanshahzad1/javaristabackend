import mongoose, { Document, Schema, Types } from 'mongoose';

export type ScheduleStatus = 'pending' | 'in_progress' | 'completed' | 'missed' | 'approved';

export interface IChecklistSchedule extends Document {
  checklistId: Types.ObjectId;
  assignedTo: Types.ObjectId;
  storeId?: string;
  scheduledFor: Date;
  status: ScheduleStatus;
  submissionId?: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  missedAt?: Date;
  createdAt: Date;
}

const ChecklistScheduleSchema = new Schema<IChecklistSchedule>(
  {
    checklistId: { type: Schema.Types.ObjectId, ref: 'ChecklistTemplate', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    storeId: { type: String },
    scheduledFor: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'missed', 'approved'],
      default: 'pending',
    },
    submissionId: { type: Schema.Types.ObjectId, ref: 'ChecklistSubmission' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    missedAt: { type: Date },
  },
  { timestamps: true }
);

ChecklistScheduleSchema.index({ checklistId: 1, assignedTo: 1, scheduledFor: 1 });
ChecklistScheduleSchema.index({ status: 1, scheduledFor: 1 });

const ChecklistSchedule = mongoose.model<IChecklistSchedule>('ChecklistSchedule', ChecklistScheduleSchema);
export default ChecklistSchedule;
