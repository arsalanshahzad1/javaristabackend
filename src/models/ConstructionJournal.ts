import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IJournalPhoto {
  url: string;
  publicId: string;
  caption?: string;
}

export interface IConstructionJournal extends Document {
  storeId: Types.ObjectId;
  title: string;
  body: string;
  milestone?: string;
  progressPercent: number;
  photos: IJournalPhoto[];
  videoUrl?: string;
  isPublished: boolean;
  publishedAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const JournalPhotoSchema = new Schema<IJournalPhoto>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    caption: { type: String },
  },
  { _id: false },
);

const ConstructionJournalSchema = new Schema<IConstructionJournal>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    milestone: {
      type: String,
      enum: ['Structural', 'Interior', 'Equipment', 'Soft Opening', 'Grand Opening', 'Other'],
    },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    photos: { type: [JournalPhotoSchema], default: [] },
    videoUrl: { type: String },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

ConstructionJournalSchema.index({ storeId: 1, publishedAt: -1 });

const ConstructionJournal: Model<IConstructionJournal> = mongoose.model<IConstructionJournal>(
  'ConstructionJournal',
  ConstructionJournalSchema,
);
export default ConstructionJournal;
