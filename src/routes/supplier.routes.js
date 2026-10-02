const express = require('express');
const {
  createProduct,
  updateProductStock,
} = require('../controllers/product.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const {
  validateCreateProduct,
  validateUpdateStock,
} = require('../validators/product.validator');

const router = express.Router();

router.post(
  '/products',
  authenticateToken,
  authorizeRoles('SUPPLIER'),
  validateCreateProduct,
  createProduct,
);
router.patch(
  '/products/:id/stock',
  authenticateToken,
  authorizeRoles('SUPPLIER'),
  validateUpdateStock,
  updateProductStock,
);

module.exports = router;
