import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IFollow extends Document {
  follower: Types.ObjectId;
  following: Types.ObjectId;
  createdAt: Date;
}

const FollowSchema = new Schema<IFollow>(
  {
    follower: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    following: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

const Follow: Model<IFollow> = mongoose.model<IFollow>('Follow', FollowSchema);
export default Follow;
