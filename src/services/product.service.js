const { randomUUID } = require('node:crypto');
const { pool } = require('../config/db');
const redisClient = require('../config/redis');
const { publishStockUpdatedEvent } = require('./kafka.service');

function createNotFoundError() {
  const error = new Error('Supplier profile not found');
  error.status = 404;
  return error;
}

async function createSupplierProduct(userId, product) {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [suppliers] = await connection.execute(
      'SELECT id FROM suppliers WHERE user_id = ? LIMIT 1',
      [userId],
    );

    if (suppliers.length === 0) {
      throw createNotFoundError();
    }

    const supplierId = suppliers[0].id;
    const [result] = await connection.execute(
      `INSERT INTO products
         (supplier_id, name, category, unit, price, stock, version, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1, TRUE)`,
      [
        supplierId,
        product.name,
        product.category || null,
        product.unit,
        product.price,
        product.stock,
      ],
    );

    await connection.execute(
      `INSERT INTO stock_history
         (product_id, supplier_id, old_stock, new_stock, change_type, event_id)
       VALUES (?, ?, 0, ?, 'RESTOCK', NULL)`,
      [result.insertId, supplierId, product.stock],
    );

    await connection.commit();
    transactionStarted = false;

    return {
      id: result.insertId,
      name: product.name,
      category: product.category || null,
      unit: product.unit,
      price: product.price,
      stock: product.stock,
      version: 1,
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          'Product creation failed and the transaction could not be rolled back',
        );
      }
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function updateSupplierProductStock(userId, productId, newStock) {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [suppliers] = await connection.execute(
      'SELECT id FROM suppliers WHERE user_id = ? LIMIT 1',
      [userId],
    );

    if (suppliers.length === 0) {
      throw createNotFoundError();
    }

    const supplierId = suppliers[0].id;
    const [products] = await connection.execute(
      `SELECT id, name, stock, version
       FROM products
       WHERE id = ? AND supplier_id = ?
       LIMIT 1
       FOR UPDATE`,
      [productId, supplierId],
    );

    if (products.length === 0) {
      const error = new Error('Product not found');
      error.status = 404;
      throw error;
    }

    const product = products[0];
    const version = product.version + 1;

    await connection.execute(
      `UPDATE products
       SET stock = ?, version = version + 1
       WHERE id = ? AND supplier_id = ?`,
      [newStock, product.id, supplierId],
    );

    await connection.execute(
      `INSERT INTO stock_history
         (product_id, supplier_id, old_stock, new_stock, change_type, event_id)
       VALUES (?, ?, ?, ?, 'MANUAL_UPDATE', NULL)`,
      [product.id, supplierId, product.stock, newStock],
    );

    await connection.commit();
    transactionStarted = false;

    await redisClient.del(`supplier:${supplierId}:products`);

    const event = {
      eventId: randomUUID(),
      productId: product.id,
      supplierId,
      oldStock: product.stock,
      newStock,
    };
    await publishStockUpdatedEvent(event);

    return {
      id: product.id,
      name: product.name,
      stock: newStock,
      version,
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          'Stock update failed and the transaction could not be rolled back',
        );
      }
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function listSupplierProducts(userId) {
  const [suppliers] = await pool.execute(
    'SELECT id FROM suppliers WHERE user_id = ? LIMIT 1',
    [userId],
  );

  if (suppliers.length === 0) {
    throw createNotFoundError();
  }

  const [products] = await pool.execute(
    `SELECT id, name, category, unit, price, stock, version, created_at, updated_at
     FROM products
     WHERE supplier_id = ? AND is_active = TRUE
     ORDER BY created_at DESC`,
    [suppliers[0].id],
  );

  return products;
}

async function getSupplierProduct(userId, productId) {
  const [suppliers] = await pool.execute(
    'SELECT id FROM suppliers WHERE user_id = ? LIMIT 1',
    [userId],
  );

  if (suppliers.length === 0) {
    throw createNotFoundError();
  }

  const [products] = await pool.execute(
    `SELECT id, name, category, unit, price, stock, version, created_at, updated_at
     FROM products
     WHERE id = ? AND supplier_id = ? AND is_active = TRUE
     LIMIT 1`,
    [productId, suppliers[0].id],
  );

  if (products.length === 0) {
    const error = new Error('Product not found');
    error.status = 404;
    throw error;
  }

  return products[0];
}

module.exports = {
  createSupplierProduct,
  updateSupplierProductStock,
  listSupplierProducts,
  getSupplierProduct,
};
