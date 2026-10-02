const {
  createShopOrder,
  listShopOrders,
  getShopOrder,
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

async function getOrder(req, res) {
  const order = await getShopOrder(req.user.userId, req.params.id);

  if (!order) {
    return res.status(404).json({
      message: 'Order not found',
    });
  }

  return res.status(200).json({ order });
}

module.exports = {
  createOrder,
  getOrders,
  getOrder,
};
