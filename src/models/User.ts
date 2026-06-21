import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  bio?: string;
  role: 'community' | 'investor' | 'employee' | 'admin';
  isVerified: boolean;
  isPremium: boolean;
  isActive: boolean;
  deactivatedAt?: Date;
  subscriptionStatus: 'none' | 'active' | 'expired';
  subscriptionExpiry?: Date;
  refreshToken?: string;
  followersCount: number;
  followingCount: number;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    avatar: { type: String },
    bio: { type: String, maxlength: 160 },
    role: { type: String, enum: ['community', 'investor', 'employee', 'admin'], default: 'community' },
    isVerified: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    deactivatedAt: { type: Date },
    subscriptionStatus: { type: String, enum: ['none', 'active', 'expired'], default: 'none' },
    subscriptionExpiry: { type: Date },
    refreshToken: { type: String, select: false },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

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
