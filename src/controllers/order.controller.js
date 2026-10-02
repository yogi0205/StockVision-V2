const {
  createShopOrder,
  listShopOrders,
} = require('../services/order.service');

async function createOrder(req, res) {
  const order = await createShopOrder(req.user.userId, req.body);

  return res.status(201).json({
    message: 'Order created successfully',
    order,
  });
}

async function getOrders(req, res) {
  const orders = await listShopOrders(req.user.userId);

  return res.status(200).json({ orders });
}

module.exports = {
  createOrder,
  getOrders,
};
