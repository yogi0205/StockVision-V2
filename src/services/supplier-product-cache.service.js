const redisClient = require('../config/redis');

function getSupplierProductsCacheKey(supplierId) {
  return `supplier:${supplierId}:products`;
}

async function invalidateSupplierProductsCache(supplierId) {
  await redisClient.del(getSupplierProductsCacheKey(supplierId));
}

module.exports = {
  getSupplierProductsCacheKey,
  invalidateSupplierProductsCache,
};
