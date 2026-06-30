import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IRoleChangeRequest extends Document {
  requestedBy: Types.ObjectId;
  targetUser: Types.ObjectId;
  fromRole: string;
  toRole: string;
  requestedAt: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewNote?: string;
  storeId: Types.ObjectId;
  notified: boolean;
}

const RoleChangeRequestSchema = new Schema<IRoleChangeRequest>(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fromRole: { type: String, required: true },
    toRole: { type: String, required: true },
    requestedAt: { type: Date, default: Date.now },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'withdrawn'],
      default: 'pending',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNote: { type: String },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    notified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

RoleChangeRequestSchema.index({ targetUser: 1, status: 1 });
RoleChangeRequestSchema.index({ storeId: 1, status: 1 });
RoleChangeRequestSchema.index({ requestedAt: -1 });

const RoleChangeRequest: Model<IRoleChangeRequest> = mongoose.model<IRoleChangeRequest>(
  'RoleChangeRequest',
  RoleChangeRequestSchema
);
export default RoleChangeRequest;
