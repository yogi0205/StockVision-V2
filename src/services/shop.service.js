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

module.exports = {
  listSuppliersForShop,
};
