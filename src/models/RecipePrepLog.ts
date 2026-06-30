import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IRecipePrepLog extends Document {
  recipeId: Types.ObjectId;
  userId: Types.ObjectId;
  storeId: string;
  prepSeconds: number;
  size: string;
  notes?: string;
  loggedAt: Date;
}

const RecipePrepLogSchema = new Schema<IRecipePrepLog>(
  {
    recipeId: { type: Schema.Types.ObjectId, ref: 'StoreRecipe', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    storeId: { type: String, required: true },
    prepSeconds: { type: Number, required: true, min: 1 },
    size: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    loggedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

RecipePrepLogSchema.index({ recipeId: 1, storeId: 1 });
RecipePrepLogSchema.index({ userId: 1, loggedAt: -1 });

const RecipePrepLog = mongoose.model<IRecipePrepLog>('RecipePrepLog', RecipePrepLogSchema);
export default RecipePrepLog;
