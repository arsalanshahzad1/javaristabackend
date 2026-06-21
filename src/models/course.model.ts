import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  slug: string;
  description?: string;
  category: 'coffee_foundations' | 'certification';
  level?: number | null;
  order?: number;
  thumbnail?: string;
  requiredRole: 'community' | 'investor' | 'employee';
  isActive: boolean;
  lessons: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true },
    description: { type: String },
    category: {
      type: String,
      enum: ['coffee_foundations', 'certification'],
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
