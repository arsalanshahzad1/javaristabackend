import mongoose, { Document, Schema, Types } from 'mongoose';
import type { UserRole } from './User';

export type CertificationType =
  | 'javarista_level_1'
  | 'javarista_level_2'
  | 'javarista_level_3'
  | 'javarista_level_4'
  | 'javarista_level_5'
  | 'shift_supervisor'
  | 'store_manager'
  | 'java_champion';

export const CERTIFICATION_TYPES: CertificationType[] = [
  'javarista_level_1',
  'javarista_level_2',
  'javarista_level_3',
  'javarista_level_4',
  'javarista_level_5',
  'shift_supervisor',
  'store_manager',
  'java_champion',
];

export type CertificationTrack =
  | 'coffee'
  | 'leadership'
  | 'operations'
  | 'specialty_beverage'
  | 'food_safety'
  | 'custom';

export const CERTIFICATION_TRACKS: CertificationTrack[] = [
  'coffee',
  'leadership',
  'operations',
  'specialty_beverage',
  'food_safety',
  'custom',
];

export interface ICertification extends Document {
  user: Types.ObjectId;
  type: CertificationType;
  issuedAt: Date;
  issuedBy?: Types.ObjectId;
  notes?: string;
  certificateNumber: string;
  status: 'active' | 'revoked';
  track?: CertificationTrack;
  requiredForRoles: UserRole[];
  prerequisites: Types.ObjectId[];
  expiresAfterDays?: number;
  renewalReminderDays?: number;
  requiresCourses: Types.ObjectId[];
  requiresManualRead: boolean;
  requiresPracticalAssessment: boolean;
  // Badge
  badgeUrl?: string;
  badgePublicId?: string;
  // Expiry
  expiresAt?: Date;
  renewalReminderSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

function generateCertNumber(): string {
  const year = new Date().getFullYear();
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `JT-${year}-${digits}`;
}

const CertificationSchema = new Schema<ICertification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: CERTIFICATION_TYPES, required: true },
    issuedAt: { type: Date, default: Date.now },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    certificateNumber: { type: String, unique: true },
    status: { type: String, enum: ['active', 'revoked'], default: 'active' },
    track: { type: String, enum: CERTIFICATION_TRACKS },
    requiredForRoles: { type: [String], default: [] },
    prerequisites: [{ type: Schema.Types.ObjectId, ref: 'Certification' }],
    expiresAfterDays: { type: Number },
    renewalReminderDays: { type: Number },
    requiresCourses: [{ type: Schema.Types.ObjectId }],
    requiresManualRead: { type: Boolean, default: false },
    requiresPracticalAssessment: { type: Boolean, default: false },
    // Badge
    badgeUrl: { type: String },
    badgePublicId: { type: String },
    // Expiry
    expiresAt: { type: Date },
    renewalReminderSentAt: { type: Date },
  },
  { timestamps: true }
);

CertificationSchema.pre('save', async function () {
  // Auto-generate certificate number on first save
  if (!this.certificateNumber) {
    let candidate = generateCertNumber();
    while (await mongoose.model('Certification').exists({ certificateNumber: candidate })) {
      candidate = generateCertNumber();
    }
    this.certificateNumber = candidate;
  }

  // Auto-compute expiresAt when issuedAt or expiresAfterDays changes
  if (this.isModified('issuedAt') || this.isModified('expiresAfterDays')) {
    if (this.expiresAfterDays != null && this.issuedAt) {
      this.expiresAt = new Date(
        this.issuedAt.getTime() + this.expiresAfterDays * 24 * 60 * 60 * 1000
      );
    } else {
      this.expiresAt = undefined;
    }
  }
});

const Certification = mongoose.model<ICertification>('Certification', CertificationSchema);
export default Certification;
