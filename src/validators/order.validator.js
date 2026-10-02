const Joi = require('joi');

const createOrderSchema = Joi.object({
  supplierId: Joi.number().integer().positive().required(),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.number().integer().positive().required(),
        quantity: Joi.number().integer().positive().required(),
      }).unknown(false),
    )
    .min(1)
    .required(),
}).unknown(false).required();

function validateCreateOrder(req, res, next) {
  const { error, value } = createOrderSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    return res.status(400).json({
      message: 'Invalid order data',
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
  validateCreateOrder,
};
