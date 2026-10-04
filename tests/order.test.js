const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

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

    orderId = response.body.order.id;
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
        items: [{ productId: productResponse.body.product.id, quantity: 1 }],
      });
    expect(orderResponse.statusCode).toBe(201);
    otherSupplierOrderId = orderResponse.body.order.id;

    const listResponse = await request(app)
      .get('/suppliers/orders')
      .set('Authorization', `Bearer ${supplierToken}`);
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.body.orders.map((order) => order.id))
      .not.toContain(otherSupplierOrderId);

    const detailResponse = await request(app)
      .get(`/suppliers/orders/${otherSupplierOrderId}`)
      .set('Authorization', `Bearer ${supplierToken}`);
    expect(detailResponse.statusCode).toBe(404);
  });

  test('Supplier should confirm the order', async () => {
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
});