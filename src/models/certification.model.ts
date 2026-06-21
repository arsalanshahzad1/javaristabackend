import mongoose, { Document, Schema, Types } from 'mongoose';

export type CertificationType =
  | 'javarista_level_1'
  | 'javarista_level_2'
  | 'javarista_level_3'
  | 'javarista_level_4'
  | 'javarista_level_5'
  | 'shift_leader'
  | 'store_leader'
  | 'java_champion';

export const CERTIFICATION_TYPES: CertificationType[] = [
  'javarista_level_1',
  'javarista_level_2',
  'javarista_level_3',
  'javarista_level_4',
  'javarista_level_5',
  'shift_leader',
  'store_leader',
  'java_champion',
];

export interface ICertification extends Document {
  user: Types.ObjectId;
  type: CertificationType;
  issuedAt: Date;
  issuedBy?: Types.ObjectId;
  notes?: string;
  certificateNumber: string;
  status: 'active' | 'revoked';
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
  },
  { timestamps: true }
);

CertificationSchema.pre('save', async function () {
  if (this.certificateNumber) return;

  let candidate = generateCertNumber();
  // Retry on the rare collision
  while (await mongoose.model('Certification').exists({ certificateNumber: candidate })) {
    candidate = generateCertNumber();
  }
  this.certificateNumber = candidate;
});

const Certification = mongoose.model<ICertification>('Certification', CertificationSchema);
export default Certification;
