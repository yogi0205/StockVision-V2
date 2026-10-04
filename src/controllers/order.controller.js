const {
  createShopOrder,
  listShopOrders,
  getShopOrder,
  listSupplierOrders,
  getSupplierOrder,
  updateSupplierOrderStatus,
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

async function getSupplierOrders(req, res) {
  const orders = await listSupplierOrders(req.user.userId);

  return res.status(200).json({ orders });
}

async function getSupplierOrderDetails(req, res) {
  const order = await getSupplierOrder(req.user.userId, req.params.id);

  if (!order) {
    return res.status(404).json({
      message: 'Order not found',
    });
  }

  return res.status(200).json({ order });
}

async function updateOrderStatus(req, res) {
  const order = await updateSupplierOrderStatus(
    req.user.userId,
    req.params.id,
    req.body.status,
  );

  return res.status(200).json({
    message: 'Order status updated successfully',
    order,
  });
}

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  getSupplierOrders,
  getSupplierOrderDetails,
  updateOrderStatus,
};
