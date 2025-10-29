const Joi = require('joi');

const feedbackSchema = Joi.object({
  name: Joi.string().max(100).allow('', null),
  email: Joi.string().email().max(254).allow('', null),
  rating: Joi.number().integer().min(1).max(5).required(),
  message: Joi.string().min(1).max(2000).required(),
  metadata: Joi.object().optional()
});

module.exports = feedbackSchema;
