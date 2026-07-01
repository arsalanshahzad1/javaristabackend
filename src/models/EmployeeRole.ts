import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import { ALL_PERMISSION_KEYS, type EmployeePermissionKey } from '../constants/employeePermissions';

export interface IEmployeeRole extends Document {
  name: string;
  description?: string;
  permissions: EmployeePermissionKey[];
  storeId?: string;
  createdBy: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeRoleSchema = new Schema<IEmployeeRole>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    permissions: {
      type: [String],
      enum: ALL_PERMISSION_KEYS,
      default: [],
    },
    storeId: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unique name per store (null storeId = org-wide)
EmployeeRoleSchema.index({ name: 1, storeId: 1 }, { unique: true });

const EmployeeRole: Model<IEmployeeRole> = mongoose.model<IEmployeeRole>(
  'EmployeeRole',
  EmployeeRoleSchema
);

export default EmployeeRole;
