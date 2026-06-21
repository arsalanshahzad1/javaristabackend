import mongoose, { Document, Schema } from 'mongoose';

export type StoreRecipeCategory = 'hot' | 'iced' | 'blended' | 'matcha' | 'hojicha' | 'food';

export const STORE_RECIPE_CATEGORIES: StoreRecipeCategory[] = [
  'hot',
  'iced',
  'blended',
  'matcha',
  'hojicha',
  'food',
];

interface IAdditionalIngredient {
  name: string;
  amount: string;
}

interface ISize {
  label: string;
  coffeeDose?: number;
  waterAmount?: number;
  milkAmount?: number;
  syrupAmount?: number;
  syrupType?: string;
  additionalIngredients: IAdditionalIngredient[];
}

interface ICostInfo {
  ingredientCost?: number;
  sellingPrice?: number;
  margin?: number;
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

const sizeSchema = new Schema<ISize>(
  {
    label: { type: String, trim: true },
    coffeeDose: { type: Number },
    waterAmount: { type: Number },
    milkAmount: { type: Number },
    syrupAmount: { type: Number },
    syrupType: { type: String, trim: true },
    additionalIngredients: { type: [additionalIngredientSchema], default: [] },
  },
  { _id: false }
);

const costInfoSchema = new Schema<ICostInfo>(
  {
    ingredientCost: { type: Number },
    sellingPrice: { type: Number },
  },
  { _id: false, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

costInfoSchema.virtual('margin').get(function (this: ICostInfo) {
  if (!this.sellingPrice || !this.ingredientCost) return undefined;
  return parseFloat((((this.sellingPrice - this.ingredientCost) / this.sellingPrice) * 100).toFixed(2));
});

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
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
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
