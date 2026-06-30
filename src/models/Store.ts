import mongoose, { Document, Schema, Types } from 'mongoose';

export type StoreStatus = 'planning' | 'construction' | 'open' | 'temporarily_closed' | 'closed';
export type StoreType = 'flagship' | 'kiosk' | 'drive-thru' | 'standard';

export interface IStore extends Document {
  name: string;
  storeNumber: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  regionId?: string;
  status: StoreStatus;
  openedAt?: Date;
  expectedOpenDate?: Date;
  managerId?: Types.ObjectId;
  photos: string[];
  coverPhoto?: string;
  phone?: string;
  email?: string;
  operatingHours?: {
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }[];
  /** Categorises the physical format of the store for dynamic checklist filtering. */
  storeType: StoreType;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const storeSchema = new Schema<IStore>(
  {
    name: { type: String, required: true, trim: true },
    storeNumber: { type: String, required: true, trim: true },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
      postalCode: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    regionId: { type: String },
    status: {
      type: String,
      enum: ['planning', 'construction', 'open', 'temporarily_closed', 'closed'],
      default: 'open',
    },
    openedAt: { type: Date },
    expectedOpenDate: { type: Date },
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    photos: [{ type: String }],
    coverPhoto: { type: String },
    phone: { type: String },
    email: { type: String },
    operatingHours: [
      {
        day: { type: String },
        open: { type: String },
        close: { type: String },
        isClosed: { type: Boolean, default: false },
      },
    ],
    storeType: {
      type: String,
      enum: ['flagship', 'kiosk', 'drive-thru', 'standard'],
      default: 'standard',
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

storeSchema.index({ storeNumber: 1 }, { unique: true });
storeSchema.index({ status: 1 });
storeSchema.index({ regionId: 1 });

export default mongoose.model<IStore>('Store', storeSchema);
