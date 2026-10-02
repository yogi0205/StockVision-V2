const {
  createSupplierProduct,
  updateSupplierProductStock,
} = require('../services/product.service');

async function createProduct(req, res) {
  const product = await createSupplierProduct(req.user.userId, req.body);

  return res.status(201).json({
    message: 'Product created successfully',
    product,
  });
}

async function updateProductStock(req, res) {
  const product = await updateSupplierProductStock(
    req.user.userId,
    req.params.id,
    req.body.stock,
  );

  return res.status(200).json({
    message: 'Stock updated successfully',
    product,
  });
}

module.exports = {
  createProduct,
  updateProductStock,
};
