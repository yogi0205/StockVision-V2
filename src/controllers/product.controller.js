const { createSupplierProduct } = require('../services/product.service');

async function createProduct(req, res) {
  const product = await createSupplierProduct(req.user.userId, req.body);

  return res.status(201).json({
    message: 'Product created successfully',
    product,
  });
}

module.exports = {
  createProduct,
};
