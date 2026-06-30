import mongoose, { Document, Schema, Model, Types } from 'mongoose';

import type { AccessLevel } from './exclusive-content.model';

export type PhotoStage = 'farm' | 'processing' | 'transport' | 'roasting' | 'cup';

export interface IStoryPhoto {
  url: string;
  publicId: string;
  caption?: string;
  stage?: PhotoStage;
}

export interface ISourcingStory extends Document {
  coffeeName: string;
  origin: {
    country: string;
    region: string;
    farm?: string;
    cooperative?: string;
    altitude?: string;
    process?: string;
    variety?: string;
  };
  producerName?: string;
  producerStory?: string;
  harvestSeason?: string;
  photos: IStoryPhoto[];
  videoUrl?: string;
  tastingNotes: string[];
  accessLevel: AccessLevel;
  isPublished: boolean;
  publishedAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StoryPhotoSchema = new Schema<IStoryPhoto>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    caption: { type: String },
    stage: { type: String, enum: ['farm', 'processing', 'transport', 'roasting', 'cup'] },
  },
  { _id: false },
);

const SourcingStorySchema = new Schema<ISourcingStory>(
  {
    coffeeName: { type: String, required: true, trim: true },
    origin: {
      country: { type: String, required: true, trim: true },
      region: { type: String, required: true, trim: true },
      farm: { type: String, trim: true },
      cooperative: { type: String, trim: true },
      altitude: { type: String, trim: true },
      process: { type: String, trim: true },
      variety: { type: String, trim: true },
    },
    producerName: { type: String, trim: true },
    producerStory: { type: String },
    harvestSeason: { type: String, trim: true },
    photos: { type: [StoryPhotoSchema], default: [] },
    videoUrl: { type: String },
    tastingNotes: [{ type: String, trim: true }],
    accessLevel: {
      type: String,
      enum: ['community', 'shareholder', 'major_investor', 'board', 'admin'],
      default: 'shareholder',
    },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

SourcingStorySchema.index({ isPublished: 1, createdAt: -1 });

const SourcingStory: Model<ISourcingStory> = mongoose.model<ISourcingStory>(
  'SourcingStory',
  SourcingStorySchema,
);
export default SourcingStory;
