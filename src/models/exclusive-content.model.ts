import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IExclusiveContent extends Document {
  title: string;
  slug: string;
  contentType: 'article' | 'video' | 'event' | 'sourcing_story';
  body?: string;
  videoUrl?: string;
  mediaUrls: string[];
  requiredRole: 'investor';
  publishedAt?: Date;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExclusiveContentSchema = new Schema<IExclusiveContent>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true },
    contentType: {
      type: String,
      enum: ['article', 'video', 'event', 'sourcing_story'],
      required: true,
    },
    body: { type: String },
    videoUrl: { type: String },
    mediaUrls: [{ type: String }],
    requiredRole: { type: String, enum: ['investor'], default: 'investor' },
    publishedAt: { type: Date },
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ExclusiveContentSchema.pre('save', function () {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }
});

const ExclusiveContent: Model<IExclusiveContent> = mongoose.model<IExclusiveContent>(
  'ExclusiveContent',
  ExclusiveContentSchema
);
export default ExclusiveContent;
