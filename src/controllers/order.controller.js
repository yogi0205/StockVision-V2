const { createShopOrder } = require('../services/order.service');

async function createOrder(req, res) {
  const order = await createShopOrder(req.user.userId, req.body);

  return res.status(201).json({
    message: 'Order created successfully',
    order,
  });
}

module.exports = {
  createOrder,
};
