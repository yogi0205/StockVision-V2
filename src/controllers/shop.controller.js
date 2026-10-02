const { listSuppliersForShop } = require('../services/shop.service');

async function getSuppliers(req, res) {
  const suppliers = await listSuppliersForShop(req.user.userId);

  return res.status(200).json({ suppliers });
}

module.exports = {
  getSuppliers,
};
