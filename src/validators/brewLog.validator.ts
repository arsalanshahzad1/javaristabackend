import Joi from 'joi';

const objectId = Joi.string().pattern(/^[a-f\d]{24}$/i, 'ObjectId');

export const createBrewLogSchema = Joi.object({
  brewMethod: objectId.required().messages({ 'string.pattern.name': 'brewMethod must be a valid ObjectId' }),
  recipe: objectId.messages({ 'string.pattern.name': 'recipe must be a valid ObjectId' }),
  bean: objectId.messages({ 'string.pattern.name': 'bean must be a valid ObjectId' }),
  coffeeDose: Joi.number().required(),
  waterAmount: Joi.number().required(),
  brewDuration: Joi.number(),
  grindSize: Joi.string(),
  tasteNotes: Joi.array().items(Joi.string()),
  rating: Joi.number().min(1).max(5),
  comments: Joi.string(),
  completedAt: Joi.date(),
});
