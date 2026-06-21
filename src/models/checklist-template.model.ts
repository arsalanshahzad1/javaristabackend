import mongoose, { Document, Schema } from 'mongoose';

export type ChecklistCategory =
  | 'opening'
  | 'closing'
  | 'cleaning'
  | 'inventory'
  | 'product_quality'
  | 'drive_thru'
  | 'equipment_maintenance'
  | 'food_safety'
  | 'delivery_receiving';

export const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  'opening',
  'closing',
  'cleaning',
  'inventory',
  'product_quality',
  'drive_thru',
  'equipment_maintenance',
  'food_safety',
  'delivery_receiving',
];

export interface IChecklistItem {
  order: number;
  label: string;
  requiresPhoto: boolean;
  requiresNote: boolean;
}

export interface IChecklistTemplate extends Document {
  title: string;
  category: ChecklistCategory;
  items: IChecklistItem[];
  requiredRole: 'employee';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChecklistItemSchema = new Schema<IChecklistItem>(
  {
    order: { type: Number, required: true },
    label: { type: String, required: true, trim: true },
    requiresPhoto: { type: Boolean, default: false },
    requiresNote: { type: Boolean, default: false },
  },
  { _id: false }
);

const ChecklistTemplateSchema = new Schema<IChecklistTemplate>(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: CHECKLIST_CATEGORIES,
      required: true,
    },
    items: [ChecklistItemSchema],
    requiredRole: {
      type: String,
      enum: ['employee'],
      default: 'employee',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ChecklistTemplate = mongoose.model<IChecklistTemplate>(
  'ChecklistTemplate',
  ChecklistTemplateSchema
);
export default ChecklistTemplate;
