const express = require('express');
const { createProduct } = require('../controllers/product.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const { validateCreateProduct } = require('../validators/product.validator');

const router = express.Router();

router.post(
  '/products',
  authenticateToken,
  authorizeRoles('SUPPLIER'),
  validateCreateProduct,
  createProduct,
);

module.exports = router;
