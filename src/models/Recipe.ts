import mongoose, { Document, Schema, Model, Types } from 'mongoose';

interface IStep {
  stepNumber: number;
  title: string;
  description: string;
  timerSeconds?: number;
  waterAmount?: number;
}

export interface IRecipe extends Document {
  name: string;
  description?: string;
  brewMethod: Types.ObjectId;
  author: Types.ObjectId;
  coffeeDose: number;
  waterAmount: number;
  ratio?: string;
  grindSize?: string;
  brewTime?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  steps: IStep[];
  tags: string[];
  image?: string;
  isPremium: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  likesCount: number;
  brewCount: number;
}

const StepSchema = new Schema<IStep>(
  {
    stepNumber: { type: Number },
    title: { type: String },
    description: { type: String },
    timerSeconds: { type: Number },
    waterAmount: { type: Number },
  },
  { _id: false }
);

const RecipeSchema = new Schema<IRecipe>(
  {
    name: { type: String, required: true },
    description: { type: String },
    brewMethod: { type: Schema.Types.ObjectId, ref: 'BrewMethod', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coffeeDose: { type: Number, required: true },
    waterAmount: { type: Number, required: true },
    ratio: { type: String },
    grindSize: { type: String },
    brewTime: { type: Number },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
    steps: [StepSchema],
    tags: [{ type: String }],
    image: { type: String },
    isPremium: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    likesCount: { type: Number, default: 0 },
    brewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Recipe: Model<IRecipe> = mongoose.model<IRecipe>('Recipe', RecipeSchema);
export default Recipe;
