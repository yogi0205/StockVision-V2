const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const redisClient = require('../src/config/redis');
const { producer } = require('../src/config/kafka');

describe('Order API', () => {
  let supplierToken;
  let shopToken;
  let productId;
  let orderId;
  let supplierId;
  let otherSupplierOrderId;

  const suffix = Date.now();

  const supplierEmail = `jest-order-supplier-${suffix}@example.com`;
  const shopEmail = `jest-order-shop-${suffix}@example.com`;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function createShopOrder(quantity) {
    const response = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${shopToken}`)
      .send({
        supplierId,
        items: [{ productId, quantity }],
      });

    expect(response.statusCode).toBe(201);
    return response.body.order.id;
  }

  async function getProductStock() {
    const [rows] = await pool.execute(
      'SELECT stock FROM products WHERE id = ?',
      [productId],
    );
    return Number(rows[0].stock);
  }

  async function getCancellationHistoryCount() {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS count
       FROM stock_history
       WHERE product_id = ? AND change_type = 'ORDER_CANCELLED'`,
      [productId],
    );
    return Number(rows[0].count);
  }

  test('Create supplier', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        name: 'Jest Order Supplier',
        email: supplierEmail,
        password: 'TestPassword123!',
        role: 'SUPPLIER',
        companyName: 'Jest Order Supplier Company',
        phone: '9876543212',
        location: 'Chennai',
      });

    expect(response.statusCode).toBe(201);

    const [suppliers] = await pool.execute(
      `SELECT suppliers.id
       FROM suppliers
       INNER JOIN users ON users.id = suppliers.user_id
       WHERE users.email = ?
       LIMIT 1`,
      [supplierEmail],
    );

    expect(suppliers).toHaveLength(1);

    supplierId = suppliers[0].id;
  });

  test('Login supplier', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: supplierEmail,
        password: 'TestPassword123!',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');

    supplierToken = response.body.token;
  });

  test('Create supplier product', async () => {
    const response = await request(app)
      .post('/suppliers/products')
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({
        name: 'Jest Order Product',
        category: 'Electronics',
        unit: 'piece',
        price: 100,
        stock: 20,
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.product).toHaveProperty('id');

    productId = response.body.product.id;
  });

  test('Create shop', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        name: 'Jest Order Shop',
        email: shopEmail,
        password: 'TestPassword123!',
        role: 'SHOP',
        shopName: 'Jest Order Shop',
        phone: '9876543213',
        location: 'Chennai',
      });

    expect(response.statusCode).toBe(201);
  });

  test('Login shop', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: shopEmail,
        password: 'TestPassword123!',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');

    shopToken = response.body.token;
  });

  test('Shop should create an order', async () => {
    const invalidateSpy = jest.spyOn(redisClient, 'del').mockResolvedValue(1);

    const response = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${shopToken}`)
      .send({
        supplierId,
        items: [
          {
            productId,
            quantity: 2,
          },
        ],
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('order');
    expect(response.body.order).toHaveProperty('id');

    expect(response.body.order).toMatchObject({
      supplierId,
      status: 'PENDING',
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      `supplier:${supplierId}:products`,
    );

    orderId = response.body.order.id;
  });

  test('Failed order creation does not invalidate the supplier product cache', async () => {
    const invalidateSpy = jest.spyOn(redisClient, 'del').mockResolvedValue(1);

    const response = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${shopToken}`)
      .send({
        supplierId,
        items: [{ productId, quantity: 1000 }],
      });

    expect(response.statusCode).toBe(409);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  test('Shop should view the created order', async () => {
    const response = await request(app)
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${shopToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('order');
    expect(response.body.order.id).toBe(orderId);
  });

  test('Supplier should list and view orders containing its products', async () => {
    const listResponse = await request(app)
      .get('/suppliers/orders')
      .set('Authorization', `Bearer ${supplierToken}`);

    expect(listResponse.statusCode).toBe(200);

    expect(listResponse.body.orders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: orderId,
          shopName: 'Jest Order Shop',
          customerName: 'Jest Order Shop',
          customerEmail: shopEmail,
          status: 'PENDING',
          totalAmount: 200,
          createdAt: expect.any(String),
          items: expect.arrayContaining([
            expect.objectContaining({
              productId,
              productName: 'Jest Order Product',
              quantity: 2,
              unitPrice: 100,
              lineTotal: 200,
            }),
          ]),
        }),
      ]),
    );

    const detailResponse = await request(app)
      .get(`/suppliers/orders/${orderId}`)
      .set('Authorization', `Bearer ${supplierToken}`);

    expect(detailResponse.statusCode).toBe(200);

    expect(detailResponse.body.order).toMatchObject({
      id: orderId,
      shopName: 'Jest Order Shop',
      customerEmail: shopEmail,
      status: 'PENDING',
      totalAmount: 200,
    });

    expect(detailResponse.body.order.items).toEqual([
      expect.objectContaining({
        productId,
        productName: 'Jest Order Product',
        quantity: 2,
        unitPrice: 100,
        lineTotal: 200,
      }),
    ]);
  });

  test('Supplier cannot list or view another supplier orders', async () => {
    const otherSupplierEmail = `jest-other-order-supplier-${suffix}@example.com`;

    const registration = await request(app)
      .post('/auth/register')
      .send({
        name: 'Other Jest Supplier',
        email: otherSupplierEmail,
        password: 'TestPassword123!',
        role: 'SUPPLIER',
        companyName: 'Other Jest Supplier Company',
      });

    expect(registration.statusCode).toBe(201);

    const login = await request(app)
      .post('/auth/login')
      .send({
        email: otherSupplierEmail,
        password: 'TestPassword123!',
      });

    expect(login.statusCode).toBe(200);

    const [otherSuppliers] = await pool.execute(
      `SELECT suppliers.id
       FROM suppliers
       INNER JOIN users ON users.id = suppliers.user_id
       WHERE users.email = ?
       LIMIT 1`,
      [otherSupplierEmail],
    );

    expect(otherSuppliers).toHaveLength(1);

    const productResponse = await request(app)
      .post('/suppliers/products')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({
        name: 'Other Jest Supplier Product',
        category: 'Electronics',
        unit: 'piece',
        price: 50,
        stock: 10,
      });

    expect(productResponse.statusCode).toBe(201);

    const orderResponse = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${shopToken}`)
      .send({
        supplierId: otherSuppliers[0].id,
        items: [
          {
            productId: productResponse.body.product.id,
            quantity: 1,
          },
        ],
      });

    expect(orderResponse.statusCode).toBe(201);

    otherSupplierOrderId = orderResponse.body.order.id;

    const listResponse = await request(app)
      .get('/suppliers/orders')
      .set('Authorization', `Bearer ${supplierToken}`);

    expect(listResponse.statusCode).toBe(200);

    expect(
      listResponse.body.orders.map((order) => order.id),
    ).not.toContain(otherSupplierOrderId);

    const detailResponse = await request(app)
      .get(`/suppliers/orders/${otherSupplierOrderId}`)
      .set('Authorization', `Bearer ${supplierToken}`);

    expect(detailResponse.statusCode).toBe(404);
  });

  test('Supplier should confirm the order', async () => {
    const invalidateSpy = jest.spyOn(redisClient, 'del').mockResolvedValue(1);

    const response = await request(app)
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({
        status: 'CONFIRMED',
      });

    expect(response.statusCode).toBe(200);

    expect(response.body.order).toMatchObject({
      id: orderId,
      status: 'CONFIRMED',
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  test('Shop should not be allowed to change order status', async () => {
    const response = await request(app)
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${shopToken}`)
      .send({
        status: 'PROCESSING',
      });

    expect(response.statusCode).toBe(403);
  });

  test('Invalid order status transition should be rejected', async () => {
    const response = await request(app)
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({
        status: 'COMPLETED',
      });

    expect(response.statusCode).toBe(409);
  });

  test('Cancelling a PENDING order restores stock and records stock history', async () => {
    const startingStock = await getProductStock();
    const cancelledOrderId = await createShopOrder(3);
    const reservedStock = await getProductStock();

    const invalidateSpy = jest.spyOn(redisClient, 'del').mockResolvedValue(1);

    const response = await request(app)
      .patch(`/orders/${cancelledOrderId}/status`)
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({ status: 'CANCELLED' });

    expect(response.statusCode).toBe(200);

    expect(response.body.order).toMatchObject({
      id: cancelledOrderId,
      status: 'CANCELLED',
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      `supplier:${supplierId}:products`,
    );

    expect(await getProductStock()).toBe(startingStock);

    const [historyRows] = await pool.execute(
      `SELECT old_stock AS oldStock,
              new_stock AS newStock,
              change_type AS changeType
       FROM stock_history
       WHERE product_id = ? AND change_type = 'ORDER_CANCELLED'
       ORDER BY id DESC
       LIMIT 1`,
      [productId],
    );

    expect(historyRows[0]).toMatchObject({
      oldStock: reservedStock,
      newStock: startingStock,
      changeType: 'ORDER_CANCELLED',
    });
  });

  test('Cancelling an already CANCELLED order is rejected without restoring stock again', async () => {
    const cancelledOrderId = await createShopOrder(2);

    const cancellation = await request(app)
      .patch(`/orders/${cancelledOrderId}/status`)
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({ status: 'CANCELLED' });

    expect(cancellation.statusCode).toBe(200);

    const stockAfterCancellation = await getProductStock();
    const historyCount = await getCancellationHistoryCount();

    const repeatedCancellation = await request(app)
      .patch(`/orders/${cancelledOrderId}/status`)
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({ status: 'CANCELLED' });

    expect(repeatedCancellation.statusCode).toBe(409);
    expect(await getProductStock()).toBe(stockAfterCancellation);
    expect(await getCancellationHistoryCount()).toBe(historyCount);
  });

  test('Cancelling a CONFIRMED order restores stock', async () => {
    const startingStock = await getProductStock();

    const confirmedOrderId = await createShopOrder(4);

    const confirmation = await request(app)
      .patch(`/orders/${confirmedOrderId}/status`)
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({ status: 'CONFIRMED' });

    expect(confirmation.statusCode).toBe(200);

    const response = await request(app)
      .patch(`/orders/${confirmedOrderId}/status`)
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({ status: 'CANCELLED' });

    expect(response.statusCode).toBe(200);
    expect(await getProductStock()).toBe(startingStock);
  });

  test('Cancelling a COMPLETED order is rejected without restoring stock', async () => {
    const completedOrderId = await createShopOrder(1);

    for (const status of ['CONFIRMED', 'PROCESSING', 'COMPLETED']) {
      const transition = await request(app)
        .patch(`/orders/${completedOrderId}/status`)
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({ status });

      expect(transition.statusCode).toBe(200);
    }

    const stockBeforeRejectedCancellation = await getProductStock();
    const historyCount = await getCancellationHistoryCount();

    const response = await request(app)
      .patch(`/orders/${completedOrderId}/status`)
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({ status: 'CANCELLED' });

    expect(response.statusCode).toBe(409);
    expect(await getProductStock()).toBe(stockBeforeRejectedCancellation);
    expect(await getCancellationHistoryCount()).toBe(historyCount);
  });

  test('A failed cancellation rolls back status, stock, and history and publishes no stock event', async () => {
    const pendingOrderId = await createShopOrder(2);
    const stockBeforeCancellation = await getProductStock();
    const historyCount = await getCancellationHistoryCount();
    const triggerName = `jest_reject_order_cancel_${suffix}`;
    const sendSpy = jest.spyOn(producer, 'send').mockResolvedValue([]);

    try {
      await pool.query(
        `CREATE TRIGGER \`${triggerName}\`
         BEFORE INSERT ON stock_history
         FOR EACH ROW
         BEGIN
           IF NEW.change_type = 'ORDER_CANCELLED' THEN
             SIGNAL SQLSTATE '45000'
               SET MESSAGE_TEXT = 'Forced order cancellation failure';
           END IF;
         END`,
      );

      const response = await request(app)
        .patch(`/orders/${pendingOrderId}/status`)
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({ status: 'CANCELLED' });

      expect(response.statusCode).toBe(500);
      expect(await getProductStock()).toBe(stockBeforeCancellation);
      expect(await getCancellationHistoryCount()).toBe(historyCount);

      const [orders] = await pool.execute(
        'SELECT status FROM orders WHERE id = ?',
        [pendingOrderId],
      );

      expect(orders[0].status).toBe('PENDING');
      expect(sendSpy).not.toHaveBeenCalled();
    } finally {
      sendSpy.mockRestore();
      await pool.query(
        `DROP TRIGGER IF EXISTS \`${triggerName}\``,
      );
    }
  });
});