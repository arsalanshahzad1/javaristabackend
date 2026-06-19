import Joi from 'joi';

const objectId = Joi.string().pattern(/^[a-f\d]{24}$/i, 'ObjectId');

const backendStepSchema = Joi.object({
  stepNumber: Joi.number().required(),
  title: Joi.string().required(),
  description: Joi.string().required(),
  timerSeconds: Joi.number(),
  waterAmount: Joi.number(),
});

const frontendStepSchema = Joi.object({
  order: Joi.number().required(),
  instruction: Joi.string().required(),
  duration: Joi.number(),
});

export const createRecipeSchema = Joi.object({
  name: Joi.string(),
  title: Joi.string(),
  description: Joi.string().allow(''),
  brewMethod: objectId.required().messages({ 'string.pattern.name': 'brewMethod must be a valid ObjectId' }),
  coffeeDose: Joi.number().required(),
  waterAmount: Joi.number().required(),
  ratio: Joi.string(),
  grindSize: Joi.string(),
  brewTime: Joi.number(),
  totalTime: Joi.number(),
  difficulty: Joi.string().valid('easy', 'medium', 'hard', 'beginner', 'intermediate', 'advanced'),
  steps: Joi.array().items(Joi.alternatives().try(backendStepSchema, frontendStepSchema)),
  tags: Joi.array().items(Joi.string()),
  image: Joi.string(),
  isPremium: Joi.boolean(),
  isPublished: Joi.boolean(),
  isFeatured: Joi.boolean(),
}).or('name', 'title');
