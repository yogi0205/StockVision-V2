const express = require('express');
const { createOrder } = require('../controllers/order.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const { validateCreateOrder } = require('../validators/order.validator');

const router = express.Router();

router.post(
  '/',
  authenticateToken,
  authorizeRoles('SHOP'),
  validateCreateOrder,
  createOrder,
);

module.exports = router;
