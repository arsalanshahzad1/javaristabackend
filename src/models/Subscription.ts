import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface ISubscription extends Document {
  user: Types.ObjectId;
  platform?: 'ios' | 'android' | 'web';
  productId?: string;
  transactionId?: string;
  status: 'active' | 'expired' | 'cancelled';
  startDate?: Date;
  expiryDate?: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    platform: { type: String, enum: ['ios', 'android', 'web'] },
    productId: { type: String },
    transactionId: { type: String, unique: true },
    status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
    startDate: { type: Date },
    expiryDate: { type: Date },
  },
  { timestamps: true }
);

const Subscription: Model<ISubscription> = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
export default Subscription;
