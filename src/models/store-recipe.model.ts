import mongoose, { Document, Schema, Types } from 'mongoose';
import type { UserRole } from './User';

export type StoreRecipeCategory = 'hot' | 'iced' | 'blended' | 'matcha' | 'hojicha' | 'food';

export const STORE_RECIPE_CATEGORIES: StoreRecipeCategory[] = [
  'hot',
  'iced',
  'blended',
  'matcha',
  'hojicha',
  'food',
];

export const INGREDIENT_UNITS = ['ml', 'g', 'oz', 'shots', 'pumps', 'leaves', 'scoops', 'pieces', 'tsp', 'tbsp'] as const;
export type IngredientUnit = typeof INGREDIENT_UNITS[number];

interface IAdditionalIngredient {
  name: string;
  amount: string;
}

export interface IIngredient {
  name: string;
  amount: number;
  unit: IngredientUnit;
  isOptional: boolean;
  notes?: string;
}

interface ISize {
  label: string;
  coffeeDose?: number;
  waterAmount?: number;
  milkAmount?: number;
  syrupAmount?: number;
  syrupType?: string;
  additionalIngredients: IAdditionalIngredient[];
  ingredients: IIngredient[];
}

export interface IQualityPhoto {
  _id: Types.ObjectId;
  type: 'correct' | 'incorrect';
  url: string;
  publicId: string;
  caption: string;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
}

interface ICostInfo {
  ingredientCost?: number;
  laborCost?: number;
  totalCost?: number;
  sellingPrice?: number;
  margin?: number;
}

export interface IStoreAverage {
  storeId: string;
  avgPrepSeconds: number;
  sampleCount: number;
  lastUpdated: Date;
}

interface IPerformanceData {
  targetPrepSeconds?: number;
  storeAverages: IStoreAverage[];
  companyAvgPrepSeconds?: number;
}

interface IRecipeChangeLogEntry {
  version: string;
  changedBy: Types.ObjectId;
  changedAt: Date;
  summary: string;
}

export interface IStoreRecipe extends Document {
  name: string;
  slug: string;
  category: StoreRecipeCategory;
  sizes: ISize[];
  buildOrder: string[];
  photos: string[];
  videoUrl?: string;
  targetPrepTimeSeconds?: number;
  costInfo: ICostInfo;
  qualityStandards?: string;
  commonMistakes: string[];
  requiredEquipment: string[];
  requiredRole: 'employee';
  isActive: boolean;
  visibilityRoles: UserRole[];
  performanceData: IPerformanceData;
  stationAssignment?: string;
  version: string;
  changeLog: IRecipeChangeLogEntry[];
  qualityPhotos: IQualityPhoto[];
  certificationRequired: boolean;
  requiredCertifications: string[];
  createdAt: Date;
  updatedAt: Date;
}

const additionalIngredientSchema = new Schema<IAdditionalIngredient>(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const ingredientSchema = new Schema<IIngredient>(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    unit: { type: String, enum: INGREDIENT_UNITS, required: true },
    isOptional: { type: Boolean, default: false },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const sizeSchema = new Schema<ISize>(
  {
    label: { type: String, trim: true },
    coffeeDose: { type: Number },
    waterAmount: { type: Number },
    milkAmount: { type: Number },
    syrupAmount: { type: Number },
    syrupType: { type: String, trim: true },
    additionalIngredients: { type: [additionalIngredientSchema], default: [] },
    ingredients: { type: [ingredientSchema], default: [] },
  },
  { _id: false }
);

const qualityPhotoSchema = new Schema<IQualityPhoto>(
  {
    type: { type: String, enum: ['correct', 'incorrect'], required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    caption: { type: String, required: true, trim: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
);

const costInfoSchema = new Schema<ICostInfo>(
  {
    ingredientCost: { type: Number },
    laborCost: { type: Number },
    totalCost: { type: Number },
    sellingPrice: { type: Number },
    margin: { type: Number },
  },
  { _id: false }
);

const storeAverageSchema = new Schema<IStoreAverage>(
  {
    storeId: { type: String, required: true },
    avgPrepSeconds: { type: Number, required: true },
    sampleCount: { type: Number, required: true, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { _id: false }
);

const performanceDataSchema = new Schema<IPerformanceData>(
  {
    targetPrepSeconds: { type: Number },
    storeAverages: { type: [storeAverageSchema], default: [] },
    companyAvgPrepSeconds: { type: Number },
  },
  { _id: false }
);

const recipeChangeLogSchema = new Schema<IRecipeChangeLogEntry>(
  {
    version: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
    summary: { type: String, required: true },
  },
  { _id: false }
);

const StoreRecipeSchema = new Schema<IStoreRecipe>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true },
    category: {
      type: String,
      enum: STORE_RECIPE_CATEGORIES,
      required: true,
    },
    sizes: { type: [sizeSchema], default: [] },
    buildOrder: [{ type: String }],
    photos: [{ type: String }],
    videoUrl: { type: String },
    targetPrepTimeSeconds: { type: Number },
    costInfo: { type: costInfoSchema, default: () => ({}) },
    qualityStandards: { type: String },
    commonMistakes: [{ type: String }],
    requiredEquipment: [{ type: String }],
    requiredRole: {
      type: String,
      enum: ['employee'],
      default: 'employee',
    },
    isActive: { type: Boolean, default: true },
    visibilityRoles: [{ type: String }],
    performanceData: { type: performanceDataSchema, default: () => ({ storeAverages: [] }) },
    stationAssignment: { type: String },
    version: { type: String, default: '1.0' },
    changeLog: { type: [recipeChangeLogSchema], default: [] },
    qualityPhotos: { type: [qualityPhotoSchema], default: [] },
    certificationRequired: { type: Boolean, default: false },
    requiredCertifications: [{ type: String }],
  },
  { timestamps: true }
);

StoreRecipeSchema.index({ name: 'text' });

StoreRecipeSchema.pre('save', function () {
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
  }
});

const StoreRecipe = mongoose.model<IStoreRecipe>('StoreRecipe', StoreRecipeSchema);
export default StoreRecipe;
