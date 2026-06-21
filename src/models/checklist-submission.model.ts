import mongoose, { Document, Schema, Types } from 'mongoose';

export type SubmissionStatus = 'in_progress' | 'submitted' | 'approved' | 'flagged';

export interface ICompletedItem {
  itemOrder: number;
  label: string;
  completed: boolean;
  photoUrl?: string;
  note?: string;
  completedAt?: Date;
}

export interface IChecklistSubmission extends Document {
  template: Types.ObjectId;
  submittedBy: Types.ObjectId;
  storeId?: string;
  completedItems: ICompletedItem[];
  status: SubmissionStatus;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  managerNote?: string;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CompletedItemSchema = new Schema<ICompletedItem>(
  {
    itemOrder: { type: Number, required: true },
    label: { type: String, required: true },
    completed: { type: Boolean, required: true },
    photoUrl: { type: String },
    note: { type: String },
    completedAt: { type: Date },
  },
  { _id: false }
);

const ChecklistSubmissionSchema = new Schema<IChecklistSubmission>(
  {
    template: { type: Schema.Types.ObjectId, ref: 'ChecklistTemplate', required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    storeId: { type: String },
    completedItems: [CompletedItemSchema],
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'approved', 'flagged'],
      default: 'in_progress',
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    managerNote: { type: String },
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

ChecklistSubmissionSchema.index({ submittedBy: 1, createdAt: -1 });
ChecklistSubmissionSchema.index({ template: 1, status: 1 });

const ChecklistSubmission = mongoose.model<IChecklistSubmission>(
  'ChecklistSubmission',
  ChecklistSubmissionSchema
);
export default ChecklistSubmission;
