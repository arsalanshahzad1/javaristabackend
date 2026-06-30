import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type ContentType =
  | 'article'
  | 'video'
  | 'event'
  | 'sourcing_story'
  | 'financial_report'
  | 'construction_update'
  | 'ceo_update'
  | 'governance_update'
  | 'dividend_update'
  | 'expansion_update';

export type AccessLevel = 'community' | 'shareholder' | 'major_investor' | 'board' | 'admin';

const ACCESS_LEVEL_RANK: Record<AccessLevel, number> = {
  community: 0,
  shareholder: 1,
  major_investor: 2,
  board: 3,
  admin: 4,
};

export function canAccessInvestorContent(
  userRole: string,
  userInvestorLevel: string | undefined,
  contentAccessLevel: AccessLevel,
): boolean {
  if (userRole === 'owner') return true;
  if (contentAccessLevel === 'community') return true;
  if (userRole !== 'investor') return false;
  const userLevelRank = ACCESS_LEVEL_RANK[((userInvestorLevel ?? 'community') as AccessLevel)] ?? 0;
  const requiredRank = ACCESS_LEVEL_RANK[contentAccessLevel] ?? 0;
  return userLevelRank >= requiredRank;
}

export interface IContentAttachment {
  type: 'pdf' | 'image' | 'video';
  url: string;
  publicId?: string;
  title: string;
  description?: string;
}

export interface IExclusiveContent extends Document {
  title: string;
  slug: string;
  contentType: ContentType;
  body?: string;
  videoUrl?: string;
  mediaUrls: string[];
  /** @deprecated use accessLevel instead */
  requiredRole: 'investor';
  accessLevel: AccessLevel;
  publishedBy?: Types.ObjectId;
  featuredImage?: string;
  featuredImagePublicId?: string;
  isPinned: boolean;
  viewCount: number;
  attachments: IContentAttachment[];
  publishedAt?: Date;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IContentAttachment>(
  {
    type: { type: String, enum: ['pdf', 'image', 'video'], required: true },
    url: { type: String, required: true },
    publicId: { type: String },
    title: { type: String, required: true },
    description: { type: String },
  },
  { _id: false },
);

const ExclusiveContentSchema = new Schema<IExclusiveContent>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true },
    contentType: {
      type: String,
      enum: [
        'article',
        'video',
        'event',
        'sourcing_story',
        'financial_report',
        'construction_update',
        'ceo_update',
        'governance_update',
        'dividend_update',
        'expansion_update',
      ],
      required: true,
    },
    body: { type: String },
    videoUrl: { type: String },
    mediaUrls: [{ type: String }],
    requiredRole: { type: String, enum: ['investor'], default: 'investor' },
    accessLevel: {
      type: String,
      enum: ['community', 'shareholder', 'major_investor', 'board', 'admin'],
      default: 'shareholder',
    },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    featuredImage: { type: String },
    featuredImagePublicId: { type: String },
    isPinned: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    attachments: { type: [AttachmentSchema], default: [] },
    publishedAt: { type: Date },
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
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

ExclusiveContentSchema.index({ accessLevel: 1, isActive: 1, publishedAt: -1 });
ExclusiveContentSchema.index({ isPinned: -1, publishedAt: -1 });

const ExclusiveContent: Model<IExclusiveContent> = mongoose.model<IExclusiveContent>(
  'ExclusiveContent',
  ExclusiveContentSchema,
);
export default ExclusiveContent;
