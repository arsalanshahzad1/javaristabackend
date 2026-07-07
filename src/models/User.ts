import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { IEmployeeRole } from './EmployeeRole';

export type UserRole =
  | 'owner'
  | 'ceo'
  | 'coo'
  | 'cfo'
  | 'regional_manager'
  | 'area_manager'
  | 'store_manager'
  | 'assistant_manager'
  | 'shift_supervisor'
  | 'barista'
  | 'trainee'
  | 'investor'
  | 'hr_manager'
  | 'marketing_manager';

export interface IUser extends Document {
  name: string;
  nickName?: string;
  phone?: string;
  email: string;
  password: string;
  avatar?: string;
  bio?: string;
  wallet?: string;
  clabe?: string;
  role: UserRole;
  isVerified: boolean;
  isPremium: boolean;
  isActive: boolean;
  deactivatedAt?: Date;
  subscriptionStatus: 'none' | 'active' | 'expired';
  subscriptionExpiry?: Date;
  refreshToken?: string;
  followersCount: number;
  followingCount: number;
  storeId?: string;
  regionId?: string;
  department?: string;
  reportingTo?: string;
  promotionReadiness?: 'ready' | 'needs_training' | 'not_evaluated';
  javaRistaScore?: number;
  lastComputedAt?: Date;
  lastComputeReason?: string;
  investorAccessLevel?: 'shareholder' | 'major_investor' | 'board';
  source?: string;
  createdAt?: Date;
  updatedAt?: Date;
  reportsTo?: Types.ObjectId | null;
  directReports: Types.ObjectId[];
  hierarchyPath: Types.ObjectId[];
  hierarchyDepth: number;
  // Additive field for employee-tier users only. Corporate-tier users leave this null.
  employeeRoleId?: Types.ObjectId | IEmployeeRole | null;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const USER_ROLES: UserRole[] = [
  'owner',
  'ceo',
  'coo',
  'cfo',
  'regional_manager',
  'area_manager',
  'store_manager',
  'assistant_manager',
  'shift_supervisor',
  'barista',
  'trainee',
  'investor',
  'hr_manager',
  'marketing_manager',
];

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    nickName: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    avatar: { type: String },
    bio: { type: String, maxlength: 160 },
    wallet: { type: String },
    clabe: { type: String },
    role: { type: String, enum: USER_ROLES, default: 'trainee' },
    isVerified: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    deactivatedAt: { type: Date },
    subscriptionStatus: { type: String, enum: ['none', 'active', 'expired'], default: 'none' },
    subscriptionExpiry: { type: Date },
    refreshToken: { type: String, select: false },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    storeId: { type: String },
    regionId: { type: String },
    department: { type: String },
    reportingTo: { type: String },
    promotionReadiness: { type: String, enum: ['ready', 'needs_training', 'not_evaluated'] },
    javaRistaScore: { type: Number, default: 0, min: 0, max: 100 },
    lastComputedAt: { type: Date },
    lastComputeReason: { type: String },
    investorAccessLevel: {
      type: String,
      enum: ['shareholder', 'major_investor', 'board'],
    },
    source: { type: String, trim: true },
    reportsTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    directReports: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    hierarchyPath: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    hierarchyDepth: { type: Number, default: 0 },
    employeeRoleId: { type: Schema.Types.ObjectId, ref: 'EmployeeRole', default: null },
  },
  { timestamps: true }
);

UserSchema.index({ reportsTo: 1 });

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
export default User;
