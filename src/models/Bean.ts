import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IBean extends Document {
  user: Types.ObjectId;
  name: string;
  roaster?: string;
  origin?: string;
  country?: string;
  region?: string;
  processingMethod?: 'washed' | 'natural' | 'honey' | 'anaerobic';
  roastLevel?: 'light' | 'medium' | 'medium-dark' | 'dark';
  roastDate?: Date;
  purchaseDate?: Date;
  flavorNotes: string[];
  personalNotes?: string;
  status: 'active' | 'archived';
  image?: string;
}

const BeanSchema = new Schema<IBean>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    roaster: { type: String },
    origin: { type: String },
    country: { type: String },
    region: { type: String },
    processingMethod: { type: String, enum: ['washed', 'natural', 'honey', 'anaerobic'] },
    roastLevel: { type: String, enum: ['light', 'medium', 'medium-dark', 'dark'] },
    roastDate: { type: Date },
    purchaseDate: { type: Date },
    flavorNotes: [{ type: String }],
    personalNotes: { type: String },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    image: { type: String },
  },
  { timestamps: true }
);

const Bean: Model<IBean> = mongoose.model<IBean>('Bean', BeanSchema);
export default Bean;
