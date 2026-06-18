import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IEspressoShot extends Document {
  user: Types.ObjectId;
  bean?: Types.ObjectId;
  doseIn: number;
  yieldOut: number;
  brewTime: number;
  ratio?: string;
  grindSetting?: string;
  tasteNotes: string[];
  tasteProfile: 'sour' | 'balanced' | 'bitter' | 'other';
  rating?: number;
  suggestion?: string;
}

const EspressoShotSchema = new Schema<IEspressoShot>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bean: { type: Schema.Types.ObjectId, ref: 'Bean' },
    doseIn: { type: Number, required: true },
    yieldOut: { type: Number, required: true },
    brewTime: { type: Number, required: true },
    ratio: { type: String },
    grindSetting: { type: String },
    tasteNotes: [{ type: String }],
    tasteProfile: {
      type: String,
      enum: ['sour', 'balanced', 'bitter', 'other'],
      required: true,
    },
    rating: { type: Number, min: 1, max: 5 },
    suggestion: { type: String },
  },
  { timestamps: true }
);

const EspressoShot: Model<IEspressoShot> = mongoose.model<IEspressoShot>('EspressoShot', EspressoShotSchema);
export default EspressoShot;
