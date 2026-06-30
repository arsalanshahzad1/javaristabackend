import mongoose, { Document, Schema, Types } from 'mongoose';
import type { UserRole } from './User';

export interface ICertificationPath extends Document {
  title: string;
  description?: string;
  track: string;
  targetRoles: UserRole[];
  certifications: Types.ObjectId[];
  isActive: boolean;
  estimatedWeeks?: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CertificationPathSchema = new Schema<ICertificationPath>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    track: { type: String, required: true, trim: true },
    targetRoles: { type: [String], default: [] },
    certifications: [{ type: Schema.Types.ObjectId, ref: 'Certification' }],
    isActive: { type: Boolean, default: true },
    estimatedWeeks: { type: Number },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const CertificationPath = mongoose.model<ICertificationPath>('CertificationPath', CertificationPathSchema);
export default CertificationPath;
