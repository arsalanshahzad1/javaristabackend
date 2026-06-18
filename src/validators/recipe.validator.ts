import Joi from 'joi';

const objectId = Joi.string().pattern(/^[a-f\d]{24}$/i, 'ObjectId');

const stepSchema = Joi.object({
  stepNumber: Joi.number().required(),
  title: Joi.string().required(),
  description: Joi.string().required(),
  timerSeconds: Joi.number(),
  waterAmount: Joi.number(),
});

export const createRecipeSchema = Joi.object({
  name: Joi.string().required(),
  brewMethod: objectId.required().messages({ 'string.pattern.name': 'brewMethod must be a valid ObjectId' }),
  coffeeDose: Joi.number().required(),
  waterAmount: Joi.number().required(),
  ratio: Joi.string(),
  grindSize: Joi.string(),
  brewTime: Joi.number(),
  difficulty: Joi.string().valid('easy', 'medium', 'hard'),
  steps: Joi.array().items(stepSchema),
  tags: Joi.array().items(Joi.string()),
  image: Joi.string(),
  isPremium: Joi.boolean(),
});
