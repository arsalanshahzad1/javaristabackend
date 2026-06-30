import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import type { UserRole } from './User';

const USER_ROLES: UserRole[] = [
  'owner', 'ceo', 'coo', 'cfo', 'regional_manager', 'area_manager',
  'store_manager', 'assistant_manager', 'shift_supervisor', 'barista',
  'trainee', 'investor', 'hr_manager', 'marketing_manager',
];

export interface IRoleManualItem {
  _id: Types.ObjectId;
  type: 'document' | 'video' | 'checklist' | 'assessment' | 'certification' | 'reading';
  title: string;
  description?: string;
  contentUrl?: string;
  contentText?: string;
  isRequired: boolean;
  order: number;
  estimatedMinutes?: number;
}

export interface IRoleManualSection {
  _id: Types.ObjectId;
  title: string;
  order: number;
  items: Types.DocumentArray<IRoleManualItem & Document>;
}

export interface IRoleManual extends Document {
  targetRole: UserRole;
  title: string;
  description?: string;
  version: string;
  isActive: boolean;
  sections: Types.DocumentArray<IRoleManualSection & Document>;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RoleManualItemSchema = new Schema<IRoleManualItem>(
  {
    type: {
      type: String,
      enum: ['document', 'video', 'checklist', 'assessment', 'certification', 'reading'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    contentUrl: { type: String, trim: true },
    contentText: { type: String },
    isRequired: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    estimatedMinutes: { type: Number },
  },
  { _id: true }
);

const RoleManualSectionSchema = new Schema<IRoleManualSection>(
  {
    title: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    items: [RoleManualItemSchema],
  },
  { _id: true }
);

const RoleManualSchema = new Schema<IRoleManual>(
  {
    targetRole: { type: String, enum: USER_ROLES, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    version: { type: String, default: '1.0', trim: true },
    isActive: { type: Boolean, default: true },
    sections: [RoleManualSectionSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const RoleManual: Model<IRoleManual> = mongoose.model<IRoleManual>('RoleManual', RoleManualSchema);

export default RoleManual;
