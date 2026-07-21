import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface ICollection extends Document {
  user: Types.ObjectId;
  name: string;
  recipes: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const CollectionSchema = new Schema<ICollection>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    recipes: [{ type: Schema.Types.ObjectId, ref: 'Recipe' }],
  },
  { timestamps: true }
);

CollectionSchema.index({ user: 1, createdAt: -1 });

const Collection: Model<ICollection> = mongoose.model<ICollection>('Collection', CollectionSchema);
export default Collection;
