import mongoose, { Document, Schema, Types } from 'mongoose';

export type SubmissionStatus = 'in_progress' | 'submitted' | 'approved' | 'flagged';

/** GPS coordinates captured at photo time. */
export interface IGpsCoords {
  latitude?: number;
  longitude?: number;
  /** Accuracy radius in metres reported by the device. */
  accuracy?: number;
}

/** A single photo attached to a checklist item. */
export interface IPhotoEntry {
  /** Cloudinary delivery URL. */
  url: string;
  /** Cloudinary public ID for future deletion. */
  publicId?: string;
  /** Client-side timestamp when the photo was taken. */
  capturedAt: Date;
  /** Server-side timestamp when the photo was received. */
  uploadedAt?: Date;
  gps?: IGpsCoords;
}

export interface ICompletedItem {
  itemOrder: number;
  label: string;
  completed: boolean;
  /** @deprecated Use `photos` array for new submissions. */
  photoUrl?: string;
  /** Photos with full GPS and timestamp metadata. */
  photos?: IPhotoEntry[];
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
  /** True when every photo across all items carries valid GPS coordinates. */
  overallGpsVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GpsSchema = new Schema<IGpsCoords>(
  {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number },
  },
  { _id: false }
);

const PhotoEntrySchema = new Schema<IPhotoEntry>(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    capturedAt: { type: Date, required: true },
    uploadedAt: { type: Date, default: Date.now },
    gps: { type: GpsSchema },
  },
  { _id: false }
);

const CompletedItemSchema = new Schema<ICompletedItem>(
  {
    itemOrder: { type: Number, required: true },
    label: { type: String, required: true },
    completed: { type: Boolean, required: true },
    photoUrl: { type: String },
    photos: { type: [PhotoEntrySchema], default: undefined },
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
    overallGpsVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ChecklistSubmissionSchema.index({ submittedBy: 1, createdAt: -1 });
ChecklistSubmissionSchema.index({ template: 1, status: 1 });
ChecklistSubmissionSchema.index({ storeId: 1, submittedAt: -1 });

const ChecklistSubmission = mongoose.model<IChecklistSubmission>(
  'ChecklistSubmission',
  ChecklistSubmissionSchema
);
export default ChecklistSubmission;
