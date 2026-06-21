import mongoose, { Document, Schema, Types } from 'mongoose';

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

export interface IPlaybook extends Document {
  title: string;
  slug: string;
  category: PlaybookCategory;
  tags: string[];
  body: string;
  mediaUrls: string[];
  requiredRole: 'community' | 'investor' | 'employee';
  relatedPlaybooks: Types.ObjectId[];
  createdBy?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
    mediaUrls: [{ type: String }],
    requiredRole: {
      type: String,
      enum: ['community', 'investor', 'employee'],
      default: 'employee',
    },
    relatedPlaybooks: [{ type: Schema.Types.ObjectId, ref: 'Playbook' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
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
