import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICourseEnrollment extends Document {
  user: Types.ObjectId;
  course: Types.ObjectId;
  enrolledAt: Date;
  completedLessons: Types.ObjectId[];
  completedAt?: Date | null;
  progressPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

const CourseEnrollmentSchema = new Schema<ICourseEnrollment>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    enrolledAt: { type: Date, default: Date.now },
    completedLessons: [{ type: Schema.Types.ObjectId }],
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// progressPercent is computed in controllers where course.lessons is populated
CourseEnrollmentSchema.virtual('progressPercent').get(function (this: ICourseEnrollment) {
  const course = this.course as unknown as { lessons?: unknown[] };
  if (!course || !course.lessons) return 0;
  const total = course.lessons.length;
  if (total === 0) return 0;
  return Math.round((this.completedLessons.length / total) * 100);
});

CourseEnrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

const CourseEnrollment = mongoose.model<ICourseEnrollment>('CourseEnrollment', CourseEnrollmentSchema);
export default CourseEnrollment;
