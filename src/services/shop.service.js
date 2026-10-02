const { pool } = require('../config/db');

async function listSuppliersForShop(userId) {
  const [shops] = await pool.execute(
    'SELECT id FROM shops WHERE user_id = ? LIMIT 1',
    [userId],
  );

  if (shops.length === 0) {
    const error = new Error('Shop profile not found');
    error.status = 404;
    throw error;
  }

  const [suppliers] = await pool.execute(
    `SELECT suppliers.id, suppliers.company_name, suppliers.phone, suppliers.location
     FROM suppliers
     INNER JOIN users ON users.id = suppliers.user_id
     WHERE users.role = 'SUPPLIER'
       AND users.is_active = TRUE
     ORDER BY suppliers.company_name ASC`,
  );

  return suppliers;
}

async function getSupplierProductsForShop(userId, supplierId) {
  const [shops] = await pool.execute(
    'SELECT id FROM shops WHERE user_id = ? LIMIT 1',
    [userId],
  );

  if (shops.length === 0) {
    const error = new Error('Shop profile not found');
    error.status = 404;
    throw error;
  }

  const [suppliers] = await pool.execute(
    `SELECT suppliers.id, suppliers.company_name
     FROM suppliers
     INNER JOIN users ON users.id = suppliers.user_id
     WHERE suppliers.id = ?
       AND users.role = 'SUPPLIER'
       AND users.is_active = TRUE
     LIMIT 1`,
    [supplierId],
  );

  if (suppliers.length === 0) {
    const error = new Error('Supplier not found');
    error.status = 404;
    throw error;
  }

  const [products] = await pool.execute(
    `SELECT id, name, category, unit, price, stock, version, created_at, updated_at
     FROM products
     WHERE supplier_id = ? AND is_active = TRUE
     ORDER BY name ASC`,
    [suppliers[0].id],
  );

  return {
    supplier: suppliers[0],
    products,
  };
}

module.exports = {
  listSuppliersForShop,
  getSupplierProductsForShop,
};
