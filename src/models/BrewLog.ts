import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IBrewLog extends Document {
  user: Types.ObjectId;
  recipe?: Types.ObjectId;
  brewMethod: Types.ObjectId;
  bean?: Types.ObjectId;
  coffeeDose: number;
  waterAmount: number;
  brewDuration?: number;
  grindSize?: string;
  tasteNotes: string[];
  rating?: number;
  comments?: string;
  completedAt: Date;
}

const BrewLogSchema = new Schema<IBrewLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipe: { type: Schema.Types.ObjectId, ref: 'Recipe' },
    brewMethod: { type: Schema.Types.ObjectId, ref: 'BrewMethod', required: true },
    bean: { type: Schema.Types.ObjectId, ref: 'Bean' },
    coffeeDose: { type: Number, required: true },
    waterAmount: { type: Number, required: true },
    brewDuration: { type: Number },
    grindSize: { type: String },
    tasteNotes: [{ type: String }],
    rating: { type: Number, min: 1, max: 5 },
    comments: { type: String },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const BrewLog: Model<IBrewLog> = mongoose.model<IBrewLog>('BrewLog', BrewLogSchema);
export default BrewLog;
