import mongoose, { Document, Schema, Types } from 'mongoose';

export type EnrollmentStatus = 'enrolled' | 'in_progress' | 'completed' | 'failed' | 'withdrawn';

export interface IQuizScore {
  /** The learning path item this score belongs to. */
  itemId: Types.ObjectId;
  /** Score as a percentage 0–100. */
  score: number;
  /** Number of attempts taken. */
  attempts: number;
  /** Set when the learner first achieved a passing score. */
  passedAt?: Date;
}

export interface IVideoProgress {
  /** The learning path item (video) being tracked. */
  itemId: Types.ObjectId;
  /** Highest percentage of the video watched so far (0–100). */
  watchedPercent: number;
  lastWatchedAt?: Date;
}

export interface IEnrollmentProgress {
  /** Total number of items in the learning path at enrolment time. */
  totalItems: number;
  /** Number of items the learner has completed. */
  completedItems: number;
  /** Accumulated reading seconds across all content items. */
  totalReadingTimeSec: number;
  /**
   * Highest scroll depth reached across all reading sessions (0–100).
   * Only ever increases — never decreases on new sessions.
   */
  maxScrollDepthPercent: number;
  quizScores: IQuizScore[];
  videoProgress: IVideoProgress[];
}

export interface ILearningPathEnrollment extends Document {
  /** The learner. */
  userId: Types.ObjectId;
  learningPathId: Types.ObjectId;
  storeId: Types.ObjectId;
  /** The manager or admin who enrolled this user. */
  enrolledBy: Types.ObjectId;
  enrolledAt: Date;
  dueDate?: Date;
  status: EnrollmentStatus;
  completedAt?: Date;
  failedAt?: Date;
  progress: IEnrollmentProgress;
  lastActivityAt: Date;
}

const QuizScoreSchema = new Schema<IQuizScore>(
  {
    itemId: { type: Schema.Types.ObjectId, required: true },
    score: { type: Number, required: true },
    attempts: { type: Number, default: 1 },
    passedAt: { type: Date },
  },
  { _id: false }
);

const VideoProgressSchema = new Schema<IVideoProgress>(
  {
    itemId: { type: Schema.Types.ObjectId, required: true },
    watchedPercent: { type: Number, required: true },
    lastWatchedAt: { type: Date },
  },
  { _id: false }
);

const EnrollmentProgressSchema = new Schema<IEnrollmentProgress>(
  {
    totalItems: { type: Number, default: 0 },
    completedItems: { type: Number, default: 0 },
    totalReadingTimeSec: { type: Number, default: 0 },
    maxScrollDepthPercent: { type: Number, default: 0 },
    quizScores: { type: [QuizScoreSchema], default: [] },
    videoProgress: { type: [VideoProgressSchema], default: [] },
  },
  { _id: false }
);

const LearningPathEnrollmentSchema = new Schema<ILearningPathEnrollment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    learningPathId: { type: Schema.Types.ObjectId, ref: 'LearningPath', required: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    enrolledBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    enrolledAt: { type: Date, default: Date.now },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ['enrolled', 'in_progress', 'completed', 'failed', 'withdrawn'],
      default: 'enrolled',
    },
    completedAt: { type: Date },
    failedAt: { type: Date },
    progress: { type: EnrollmentProgressSchema, default: () => ({}) },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/** One enrollment per user per learning path. */
LearningPathEnrollmentSchema.index({ userId: 1, learningPathId: 1 }, { unique: true });
LearningPathEnrollmentSchema.index({ storeId: 1, status: 1 });
LearningPathEnrollmentSchema.index({ learningPathId: 1, status: 1 });

const LearningPathEnrollment = mongoose.model<ILearningPathEnrollment>(
  'LearningPathEnrollment',
  LearningPathEnrollmentSchema
);
export default LearningPathEnrollment;
