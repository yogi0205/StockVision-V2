const Joi = require('joi');

const createProductSchema = Joi.object({
  name: Joi.string().trim().max(150).required(),
  category: Joi.string().trim().max(100),
  unit: Joi.string().trim().max(50).required(),
  price: Joi.number().positive().required(),
  stock: Joi.number().integer().min(0).required(),
}).unknown(false).required();

const updateStockSchema = Joi.object({
  stock: Joi.number().integer().min(0).required(),
}).unknown(false).required();

function validateCreateProduct(req, res, next) {
  const { error, value } = createProductSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    return res.status(400).json({
      message: 'Invalid product data',
      errors: error.details.map(({ path, message }) => ({
        field: path.join('.'),
        message,
      })),
    });
  }

  req.body = value;
  return next();
}

function validateUpdateStock(req, res, next) {
  const { error, value } = updateStockSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    return res.status(400).json({
      message: 'Invalid stock data',
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
  validateCreateProduct,
  validateUpdateStock,
};
