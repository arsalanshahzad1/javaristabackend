import mongoose, { Document, Schema, Types } from 'mongoose';
import type { UserRole } from './User';

export type LearningPathCategory = 'mandatory' | 'recommended' | 'leadership' | 'certification' | 'corporate';

/** Thresholds a learner must meet before the path is marked completed. */
export interface ICompletionRequirements {
  /** Total minimum seconds a learner must spend reading content items. */
  minReadingTimeSeconds: number;
  /** Minimum % of each video that must be watched (applied per video item). */
  minVideoCompletionPercent: number;
  /** Minimum quiz score (percentage) required to pass any quiz in this path. */
  minQuizScore: number;
  /** If true, every item in the path must meet its individual requirement. */
  requireAllItems: boolean;
}

export interface ILearningPath extends Document {
  title: string;
  description?: string;
  targetRoles: UserRole[];
  targetStores?: string[];
  targetRegions?: string[];
  courses: Types.ObjectId[];
  /** Learning paths that must be fully completed before enrollment is allowed. */
  prerequisites: Types.ObjectId[];
  category: LearningPathCategory;
  estimatedWeeks?: number;
  /** Total estimated reading + video duration in minutes. Informational only. */
  estimatedDurationMinutes: number;
  completionRequirements: ICompletionRequirements;
  isActive: boolean;
  createdBy: Types.ObjectId;
  enrollmentCount: number;
  completionRate: number;
  createdAt: Date;
  updatedAt: Date;
}

const LearningPathSchema = new Schema<ILearningPath>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    targetRoles: [{ type: String }],
    targetStores: [{ type: String }],
    targetRegions: [{ type: String }],
    courses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    prerequisites: [{ type: Schema.Types.ObjectId, ref: 'LearningPath' }],
    category: {
      type: String,
      enum: ['mandatory', 'recommended', 'leadership', 'certification', 'corporate'],
      required: true,
    },
    estimatedWeeks: { type: Number },
    /** Total estimated reading + video duration in minutes. Informational only. */
    estimatedDurationMinutes: { type: Number, default: 0 },
    completionRequirements: {
      minReadingTimeSeconds: { type: Number, default: 0 },
      minVideoCompletionPercent: { type: Number, default: 0, min: 0, max: 100 },
      minQuizScore: { type: Number, default: 0, min: 0, max: 100 },
      requireAllItems: { type: Boolean, default: true },
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    enrollmentCount: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

const LearningPath = mongoose.model<ILearningPath>('LearningPath', LearningPathSchema);
export default LearningPath;
