import Joi from 'joi';

export const createBeanSchema = Joi.object({
  name: Joi.string().required(),
  roaster: Joi.string(),
  origin: Joi.string(),
  country: Joi.string(),
  region: Joi.string(),
  processingMethod: Joi.string().valid('washed', 'natural', 'honey', 'anaerobic'),
  roastLevel: Joi.string().valid('light', 'medium', 'medium-dark', 'dark'),
  roastDate: Joi.date(),
  purchaseDate: Joi.date(),
  flavorNotes: Joi.array().items(Joi.string()),
  personalNotes: Joi.string(),
  status: Joi.string().valid('active', 'archived'),
  image: Joi.string(),
});
