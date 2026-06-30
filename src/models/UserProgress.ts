import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IUserProgress extends Document {
  userId: Types.ObjectId;
  entityType: 'manual' | 'course' | 'checklist' | 'certification';
  entityId: Types.ObjectId;
  status: 'not_started' | 'in_progress' | 'completed';
  progressPercent: number;
  completedAt?: Date;
  updatedAt: Date;
}

const UserProgressSchema = new Schema<IUserProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    entityType: {
      type: String,
      enum: ['manual', 'course', 'checklist', 'certification'],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

UserProgressSchema.index({ userId: 1, entityType: 1, entityId: 1 }, { unique: true });

const UserProgress = mongoose.model<IUserProgress>('UserProgress', UserProgressSchema);
export default UserProgress;
