const {
  listSuppliersForShop,
  getSupplierProductsForShop,
} = require('../services/shop.service');

async function getSuppliers(req, res) {
  const suppliers = await listSuppliersForShop(req.user.userId);

  return res.status(200).json({ suppliers });
}

async function getSupplierProducts(req, res) {
  const result = await getSupplierProductsForShop(
    req.user.userId,
    req.params.supplierId,
  );

  return res.status(200).json(result);
}

module.exports = {
  getSuppliers,
  getSupplierProducts,
};
