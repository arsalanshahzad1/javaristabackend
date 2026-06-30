import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type CommunityLevel =
  | 'explorer'
  | 'enthusiast'
  | 'brewer'
  | 'advanced_brewer'
  | 'coffee_expert'
  | 'master_javarista';

export type BadgeCategory =
  | 'brewing'
  | 'social'
  | 'learning'
  | 'exploration'
  | 'certification'
  | 'milestone';

export interface ICommunityBadge {
  badgeId: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
  category: BadgeCategory;
}

export interface IPassportStore {
  storeId: string;
  storeName: string;
  visitedAt: Date;
  checkInCount: number;
}

export interface IModeratorNote {
  note: string;
  addedBy: Types.ObjectId;
  addedAt: Date;
}

export interface ICommunityProfile extends Document {
  userId: Types.ObjectId;
  level: CommunityLevel;
  levelPoints: number;
  totalBrews: number;
  favoriteBrewMethod?: string;
  favoriteOrigin?: string;
  favoriteTastingNotes: string[];
  totalLikesReceived: number;
  totalLikesGiven: number;
  storesVisited: IPassportStore[];
  coffeesTriedIds: string[];
  coffeesTriedNames: string[];
  brewMethodsLearned: string[];
  eventsAttended: string[];
  badges: ICommunityBadge[];
  warningCount: number;
  isSuspended: boolean;
  suspendedUntil?: Date;
  suspendedReason?: string;
  moderatorNotes: IModeratorNote[];
  createdAt: Date;
  updatedAt: Date;
}

const PassportStoreSchema = new Schema<IPassportStore>(
  {
    storeId: { type: String, required: true },
    storeName: { type: String, required: true },
    visitedAt: { type: Date, default: Date.now },
    checkInCount: { type: Number, default: 1 },
  },
  { _id: false }
);

const BadgeSchema = new Schema<ICommunityBadge>(
  {
    badgeId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    earnedAt: { type: Date, default: Date.now },
    category: {
      type: String,
      enum: ['brewing', 'social', 'learning', 'exploration', 'certification', 'milestone'],
      required: true,
    },
  },
  { _id: false }
);

const ModeratorNoteSchema = new Schema<IModeratorNote>(
  {
    note: { type: String, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CommunityProfileSchema = new Schema<ICommunityProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    level: {
      type: String,
      enum: ['explorer', 'enthusiast', 'brewer', 'advanced_brewer', 'coffee_expert', 'master_javarista'],
      default: 'explorer',
    },
    levelPoints: { type: Number, default: 0 },
    totalBrews: { type: Number, default: 0 },
    favoriteBrewMethod: { type: String },
    favoriteOrigin: { type: String },
    favoriteTastingNotes: [{ type: String }],
    totalLikesReceived: { type: Number, default: 0 },
    totalLikesGiven: { type: Number, default: 0 },
    storesVisited: [PassportStoreSchema],
    coffeesTriedIds: [{ type: String }],
    coffeesTriedNames: [{ type: String }],
    brewMethodsLearned: [{ type: String }],
    eventsAttended: [{ type: String }],
    badges: [BadgeSchema],
    warningCount: { type: Number, default: 0 },
    isSuspended: { type: Boolean, default: false },
    suspendedUntil: { type: Date },
    suspendedReason: { type: String },
    moderatorNotes: [ModeratorNoteSchema],
  },
  { timestamps: true }
);

CommunityProfileSchema.index({ userId: 1 }, { unique: true });
CommunityProfileSchema.index({ level: 1, levelPoints: -1 });

const CommunityProfile: Model<ICommunityProfile> = mongoose.model<ICommunityProfile>(
  'CommunityProfile',
  CommunityProfileSchema
);

export default CommunityProfile;
