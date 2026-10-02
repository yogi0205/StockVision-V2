const { pool } = require('../config/db');

const MAX_DECIMAL_CENTS = 999999999999n;

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function decimalToCents(value) {
  const decimal = typeof value === 'number' ? value.toFixed(2) : String(value);
  const match = decimal.match(/^(\d+)(?:\.(\d{1,2}))?$/);

  if (!match) {
    throw new Error(`Invalid DECIMAL value from database: ${decimal}`);
  }

  return BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0') || '0');
}

function centsToDecimal(cents) {
  const whole = cents / 100n;
  const fraction = String(cents % 100n).padStart(2, '0');
  return `${whole}.${fraction}`;
}

async function createShopOrder(userId, orderRequest) {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    // Keep profile checks, row locks, order records, and stock changes atomic.
    await connection.beginTransaction();
    transactionStarted = true;

    const [shops] = await connection.execute(
      'SELECT id FROM shops WHERE user_id = ? LIMIT 1',
      [userId],
    );

    if (shops.length === 0) {
      throw createHttpError(404, 'Shop profile not found');
    }

    const shopId = shops[0].id;
    const [suppliers] = await connection.execute(
      `SELECT suppliers.id
       FROM suppliers
       INNER JOIN users ON users.id = suppliers.user_id
       WHERE suppliers.id = ?
         AND users.role = 'SUPPLIER'
         AND users.is_active = TRUE
       LIMIT 1`,
      [orderRequest.supplierId],
    );

    if (suppliers.length === 0) {
      throw createHttpError(404, 'Supplier not found');
    }

    const supplierId = suppliers[0].id;
    const requestedQuantities = new Map();
    for (const item of orderRequest.items) {
      requestedQuantities.set(
        item.productId,
        (requestedQuantities.get(item.productId) || 0n) + BigInt(item.quantity),
      );
    }

    const products = new Map();
    const sortedProductIds = [...requestedQuantities.keys()].sort((a, b) => a - b);

    for (const productId of sortedProductIds) {
      // Lock products in a consistent ID order to prevent overselling and reduce deadlocks.
      const [rows] = await connection.execute(
        `SELECT id, name, price, stock, is_active
         FROM products
         WHERE id = ? AND supplier_id = ?
         LIMIT 1
         FOR UPDATE`,
        [productId, supplierId],
      );

      const product = rows[0];
      if (!product || !product.is_active) {
        throw createHttpError(404, 'Product not found');
      }

      const requestedQuantity = requestedQuantities.get(productId);
      if (BigInt(product.stock) < requestedQuantity) {
        throw createHttpError(
          409,
          `Insufficient stock for product ${productId}`,
        );
      }

      products.set(productId, product);
    }

    const orderItems = [];
    let totalCents = 0n;

    for (const item of orderRequest.items) {
      const product = products.get(item.productId);
      const unitPriceCents = decimalToCents(product.price);
      const lineTotalCents = unitPriceCents * BigInt(item.quantity);
      totalCents += lineTotalCents;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPriceCents,
        lineTotalCents,
      });
    }

    if (totalCents > MAX_DECIMAL_CENTS) {
      throw createHttpError(409, 'Order total exceeds the supported amount');
    }

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (shop_id, supplier_id, status, total_amount)
       VALUES (?, ?, 'PENDING', ?)`,
      [shopId, supplierId, centsToDecimal(totalCents)],
    );

    for (const item of orderItems) {
      await connection.execute(
        `INSERT INTO order_items
           (order_id, product_id, quantity, unit_price, line_total)
         VALUES (?, ?, ?, ?, ?)`,
        [
          orderResult.insertId,
          item.productId,
          item.quantity,
          centsToDecimal(item.unitPriceCents),
          centsToDecimal(item.lineTotalCents),
        ],
      );
    }

    for (const productId of sortedProductIds) {
      const product = products.get(productId);
      const oldStock = product.stock;
      const newStock = Number(
        BigInt(oldStock) - requestedQuantities.get(productId),
      );

      await connection.execute(
        `UPDATE products
         SET stock = ?, version = version + 1
         WHERE id = ? AND supplier_id = ?`,
        [newStock, productId, supplierId],
      );

      await connection.execute(
        `INSERT INTO stock_history
           (product_id, supplier_id, old_stock, new_stock, change_type, event_id)
         VALUES (?, ?, ?, ?, 'ORDER', NULL)`,
        [productId, supplierId, oldStock, newStock],
      );
    }

    await connection.commit();
    transactionStarted = false;

    return {
      id: orderResult.insertId,
      supplierId,
      status: 'PENDING',
      totalAmount: Number(centsToDecimal(totalCents)),
      items: orderItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(centsToDecimal(item.unitPriceCents)),
        lineTotal: Number(centsToDecimal(item.lineTotalCents)),
      })),
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          'Order creation failed and the transaction could not be rolled back',
        );
      }
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function listShopOrders(userId) {
  const [shops] = await pool.execute(
    'SELECT id FROM shops WHERE user_id = ? LIMIT 1',
    [userId],
  );

  if (shops.length === 0) {
    throw createHttpError(404, 'Shop profile not found');
  }

  const [rows] = await pool.execute(
    `SELECT orders.id,
            orders.supplier_id AS supplierId,
            suppliers.company_name AS supplierName,
            orders.status,
            orders.total_amount AS totalAmount,
            orders.created_at AS createdAt,
            orders.updated_at AS updatedAt
     FROM orders
     INNER JOIN suppliers ON suppliers.id = orders.supplier_id
     WHERE orders.shop_id = ?
     ORDER BY orders.created_at DESC`,
    [shops[0].id],
  );

  return rows.map((order) => ({
    ...order,
    totalAmount: Number(order.totalAmount),
  }));
}

module.exports = {
  createShopOrder,
  listShopOrders,
};
