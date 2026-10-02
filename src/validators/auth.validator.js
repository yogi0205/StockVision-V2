const Joi = require('joi');

const registrationSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  email: Joi.string().trim().email().max(255).required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('SUPPLIER', 'SHOP').required(),
  companyName: Joi.when('role', {
    is: 'SUPPLIER',
    then: Joi.string().trim().max(150).required(),
    otherwise: Joi.forbidden(),
  }),
  shopName: Joi.when('role', {
    is: 'SHOP',
    then: Joi.string().trim().max(150).required(),
    otherwise: Joi.forbidden(),
  }),
  phone: Joi.string().trim().max(20).allow(''),
  location: Joi.string().trim().max(255).allow(''),
}).unknown(false).required();

const loginSchema = Joi.object({
  email: Joi.string().trim().email().max(255).required(),
  password: Joi.string().required(),
}).unknown(false).required();

function validateRegistration(req, res, next) {
  const { error, value } = registrationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid registration data',
      errors: error.details.map(({ path, message }) => ({
        field: path.join('.'),
        message,
      })),
    });
  }

  req.body = value;
  return next();
}

function validateLogin(req, res, next) {
  const { error, value } = loginSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid login data',
      errors: error.details.map(({ path, message }) => ({
        field: path.join('.'),
        message,
      })),
    });
  }

  req.body = value;
  return next();
}

module.exports = {
  validateRegistration,
  validateLogin,
};
