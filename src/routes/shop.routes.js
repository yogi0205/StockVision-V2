const express = require('express');
const {
  getSuppliers,
  getSupplierProducts,
} = require('../controllers/shop.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');

const router = express.Router();

router.get(
  '/suppliers/:supplierId/products',
  authenticateToken,
  authorizeRoles('SHOP'),
  getSupplierProducts,
);
router.get(
  '/suppliers',
  authenticateToken,
  authorizeRoles('SHOP'),
  getSuppliers,
);

module.exports = router;
