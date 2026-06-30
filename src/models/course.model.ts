import mongoose, { Document, Schema, Types } from 'mongoose';
import type { UserRole } from './User';

export interface ICompletionRequirements {
  minReadingMinutes?: number;
  requiresVideoCompletion: boolean;
  minQuizScore?: number;
  requiresPractical: boolean;
}

export interface ICourse extends Document {
  title: string;
  slug: string;
  description?: string;
  category: 'coffee_foundations' | 'certification' | 'mandatory' | 'recommended' | 'leadership' | 'corporate';
  level?: number | null;
  order?: number;
  thumbnail?: string;
  requiredRole: 'community' | 'investor' | 'employee';
  isActive: boolean;
  lessons: Types.ObjectId[];
  prerequisites: Types.ObjectId[];
  assignedRoles: UserRole[];
  assignedStores: string[];
  completionRequirements: ICompletionRequirements;
  enrollmentCount: number;
  completionRate: number;
  createdAt: Date;
  updatedAt: Date;
}

const completionRequirementsSchema = new Schema<ICompletionRequirements>(
  {
    minReadingMinutes: { type: Number },
    requiresVideoCompletion: { type: Boolean, default: false },
    minQuizScore: { type: Number, min: 0, max: 100 },
    requiresPractical: { type: Boolean, default: false },
  },
  { _id: false }
);

const CourseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true },
    description: { type: String },
    category: {
      type: String,
      enum: ['coffee_foundations', 'certification', 'mandatory', 'recommended', 'leadership', 'corporate'],
      required: true,
    },
    level: { type: Number, min: 1, max: 5, default: null },
    order: { type: Number },
    thumbnail: { type: String },
    requiredRole: {
      type: String,
      enum: ['community', 'investor', 'employee'],
      default: 'community',
    },
    isActive: { type: Boolean, default: true },
    lessons: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }],
    prerequisites: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    assignedRoles: [{ type: String }],
    assignedStores: [{ type: String }],
    completionRequirements: { type: completionRequirementsSchema, default: () => ({ requiresVideoCompletion: false, requiresPractical: false }) },
    enrollmentCount: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

CourseSchema.pre('save', async function () {
  if (!this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
  }
});

const Course = mongoose.model<ICourse>('Course', CourseSchema);
export default Course;
