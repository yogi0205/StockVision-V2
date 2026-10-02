const express = require('express');
const {
  createOrder,
  getOrders,
} = require('../controllers/order.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const { validateCreateOrder } = require('../validators/order.validator');

const router = express.Router();

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
