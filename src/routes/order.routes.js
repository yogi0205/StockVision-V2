const express = require('express');
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
} = require('../controllers/order.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const {
  validateCreateOrder,
  validateUpdateOrderStatus,
} = require('../validators/order.validator');

const router = express.Router();

router.patch(
  '/:id/status',
  authenticateToken,
  authorizeRoles('SUPPLIER'),
  validateUpdateOrderStatus,
  updateOrderStatus,
);
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('SHOP'),
  getOrder,
);
router.get(
  '/',
  authenticateToken,
  authorizeRoles('SHOP'),
  getOrders,
);
router.post(
  '/',
  authenticateToken,
  authorizeRoles('SHOP'),
  validateCreateOrder,
  createOrder,
);

module.exports = router;
