import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type FavoriteItemType = 'Recipe' | 'BrewMethod' | 'Bean';

export const FAVORITE_ITEM_TYPES: FavoriteItemType[] = ['Recipe', 'BrewMethod', 'Bean'];

export interface IFavorite extends Document {
  user: Types.ObjectId;
  itemType: FavoriteItemType;
  itemId: Types.ObjectId;
  createdAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    itemType: { type: String, enum: FAVORITE_ITEM_TYPES, required: true },
    itemId: { type: Schema.Types.ObjectId, required: true, refPath: 'itemType' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

FavoriteSchema.index({ user: 1, itemType: 1, itemId: 1 }, { unique: true });

const Favorite: Model<IFavorite> = mongoose.model<IFavorite>('Favorite', FavoriteSchema);
export default Favorite;
