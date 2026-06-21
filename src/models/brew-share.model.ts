import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IBrewShare extends Document {
  user: Types.ObjectId;
  brewLog: Types.ObjectId;
  caption?: string;
  likes: Types.ObjectId[];
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const BrewShareSchema = new Schema<IBrewShare>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    brewLog: { type: Schema.Types.ObjectId, ref: 'BrewLog', required: true },
    caption: { type: String, maxlength: 280 },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

BrewShareSchema.index({ user: 1, createdAt: -1 });
BrewShareSchema.index({ createdAt: -1 });

const BrewShare: Model<IBrewShare> = mongoose.model<IBrewShare>('BrewShare', BrewShareSchema);
export default BrewShare;
