import mongoose, { Document, Schema, Types } from 'mongoose';
import type { UserRole } from './User';

export type PlaybookCategory =
  | 'recipe'
  | 'procedure'
  | 'checklist_template'
  | 'troubleshooting'
  | 'standard'
  | 'training';

export const PLAYBOOK_CATEGORIES: PlaybookCategory[] = [
  'recipe',
  'procedure',
  'checklist_template',
  'troubleshooting',
  'standard',
  'training',
];

export type PlaybookStatus = 'draft' | 'review' | 'approved' | 'published' | 'archived';
export type PlaybookAccessLevel = 'barista' | 'shift_leader' | 'store_leader' | 'area_manager' | 'director' | 'corporate' | 'admin';
export type AttachmentType = 'image' | 'pdf' | 'video';

export interface IChangeLogEntry {
  version: string;
  changedBy: Types.ObjectId;
  changedAt: Date;
  summary: string;
}

export interface IPlaybookAttachment {
  _id: Types.ObjectId;
  type: AttachmentType;
  url: string;
  publicId?: string;
  title: string;
  description?: string;
  order: number;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
}

export interface IComplianceTracking {
  isRequired: boolean;
  requiredByDate?: Date;
  acknowledgeRequired: boolean;
}

export interface IPlaybook extends Document {
  title: string;
  slug: string;
  category: PlaybookCategory;
  tags: string[];
  body: string;
  attachments: IPlaybookAttachment[];
  requiredRole: 'community' | 'investor' | 'employee';
  relatedPlaybooks: Types.ObjectId[];
  createdBy?: Types.ObjectId;
  isActive: boolean;
  version: string;
  status: PlaybookStatus;
  publishedAt?: Date;
  archivedAt?: Date;
  reviewedBy?: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  changeLog: IChangeLogEntry[];
  assignedRoles: UserRole[];
  accessLevel?: PlaybookAccessLevel;
  complianceTracking: IComplianceTracking;
  readCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const changeLogEntrySchema = new Schema<IChangeLogEntry>(
  {
    version: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
    summary: { type: String, required: true },
  },
  { _id: false }
);

const attachmentSchema = new Schema<IPlaybookAttachment>(
  {
    type: { type: String, enum: ['image', 'pdf', 'video'], required: true },
    url: { type: String, required: true },
    publicId: { type: String },
    title: { type: String, required: true, default: 'Untitled' },
    description: { type: String },
    order: { type: Number, default: 0 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
);

const complianceTrackingSchema = new Schema<IComplianceTracking>(
  {
    isRequired: { type: Boolean, default: false },
    requiredByDate: { type: Date },
    acknowledgeRequired: { type: Boolean, default: false },
  },
  { _id: false }
);

const PlaybookSchema = new Schema<IPlaybook>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true },
    category: {
      type: String,
      enum: PLAYBOOK_CATEGORIES,
      required: true,
    },
    tags: [{ type: String, trim: true }],
    body: { type: String, default: '' },
    attachments: { type: [attachmentSchema], default: [] },
    requiredRole: {
      type: String,
      enum: ['community', 'investor', 'employee'],
      default: 'employee',
    },
    relatedPlaybooks: [{ type: Schema.Types.ObjectId, ref: 'Playbook' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    version: { type: String, default: '1.0' },
    status: {
      type: String,
      enum: ['draft', 'review', 'approved', 'published', 'archived'],
      default: 'draft',
    },
    publishedAt: { type: Date },
    archivedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    changeLog: { type: [changeLogEntrySchema], default: [] },
    assignedRoles: [{ type: String }],
    accessLevel: {
      type: String,
      enum: ['barista', 'shift_leader', 'store_leader', 'area_manager', 'director', 'corporate', 'admin'],
    },
    complianceTracking: { type: complianceTrackingSchema, default: () => ({ isRequired: false, acknowledgeRequired: false }) },
    readCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PlaybookSchema.index({ title: 'text', tags: 'text', body: 'text' });

PlaybookSchema.pre('save', async function () {
  if (!this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
  }
});

const Playbook = mongoose.model<IPlaybook>('Playbook', PlaybookSchema);
export default Playbook;
