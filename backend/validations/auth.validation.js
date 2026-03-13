const Joi = require('joi');

const googleLoginSchema = Joi.object({
  idToken: Joi.string().min(20).required(),
  device: Joi.object({
    platform: Joi.string().valid('web', 'ios', 'android').optional(),
    name: Joi.string().max(200).optional()
  }).optional()
});

module.exports = {
  googleLoginSchema
};