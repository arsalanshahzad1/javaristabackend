import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IBrewMethod extends Document {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  requiredEquipment: string[];
  recommendedGrindSize?: string;
  ratio?: string;
  brewTime?: number;
  isActive: boolean;
  createdBy?: Types.ObjectId;
}

const BrewMethodSchema = new Schema<IBrewMethod>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String },
    icon: { type: String },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
    requiredEquipment: [{ type: String }],
    recommendedGrindSize: { type: String },
    ratio: { type: String },
    brewTime: { type: Number },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const BrewMethod: Model<IBrewMethod> = mongoose.model<IBrewMethod>('BrewMethod', BrewMethodSchema);
export default BrewMethod;
