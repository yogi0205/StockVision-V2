const { randomUUID } = require('node:crypto');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const { producer } = require('../src/config/kafka');

describe('Real-time inventory events', () => {
  let sendSpy;

  beforeEach(() => {
    sendSpy = jest.spyOn(producer, 'send').mockResolvedValue([]);
  });

  afterEach(() => {
    sendSpy.mockRestore();
  });

  test('stock updates publish updated and depleted inventory events', async () => {
    const uniqueId = randomUUID();
    const email = `jest-realtime-${uniqueId}@example.com`;

    const registration = await request(app)
      .post('/auth/register')
      .send({
        name: 'Realtime Test Supplier',
        email,
        password: 'TestPassword123!',
        role: 'SUPPLIER',
        companyName: `Realtime Supplier ${uniqueId}`,
      });

    expect(registration.statusCode).toBe(201);

    const login = await request(app)
      .post('/auth/login')
      .send({
        email,
        password: 'TestPassword123!',
      });

    expect(login.statusCode).toBe(200);
    expect(login.body.token).toBeDefined();

    const token = login.body.token;
    const productResponse = await request(app)
      .post('/suppliers/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Realtime Product ${uniqueId}`,
        category: 'Test',
        unit: 'item',
        price: 10,
        stock: 10,
      });

    expect(productResponse.statusCode).toBe(201);
    const productId = productResponse.body.product.id;
    expect(productId).toBeDefined();

    const stockFiveResponse = await request(app)
      .patch(`/suppliers/products/${productId}/stock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stock: 5 });

    expect(stockFiveResponse.statusCode).toBe(200);
    expect(stockFiveResponse.body.product.stock).toBe(5);

    const updatedEventCall = sendSpy.mock.calls
      .map(([payload]) => payload)
      .find(({ topic }) => topic === 'inventory.stock.updated');
    expect(updatedEventCall).toBeDefined();

    const updatedEvent = JSON.parse(updatedEventCall.messages[0].value);
    expect(updatedEvent).toMatchObject({
      productId,
      supplierId: expect.any(Number),
      oldStock: 10,
      newStock: 5,
    });
    expect(updatedEvent.eventId).toEqual(expect.any(String));

    const stockZeroResponse = await request(app)
      .patch(`/suppliers/products/${productId}/stock`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stock: 0 });

    expect(stockZeroResponse.statusCode).toBe(200);
    expect(stockZeroResponse.body.product.stock).toBe(0);

    const depletedEventCall = sendSpy.mock.calls
      .map(([payload]) => payload)
      .find(({ topic }) => topic === 'inventory.stock.depleted');
    expect(depletedEventCall).toBeDefined();

    const depletedEvent = JSON.parse(depletedEventCall.messages[0].value);
    expect(depletedEvent).toMatchObject({
      productId,
      oldStock: 5,
      newStock: 0,
    });
    expect(depletedEvent.eventId).toEqual(expect.any(String));
  });

  test('order creation publishes inventory updates with the reduced stock', async () => {
    const uniqueId = randomUUID();
    const password = 'TestPassword123!';
    const supplierEmail = `jest-order-supplier-${uniqueId}@example.com`;
    const shopEmail = `jest-order-realtime-shop-${uniqueId}@example.com`;

    const supplierRegistration = await request(app)
      .post('/auth/register')
      .send({
        name: 'Jest Order Supplier',
        email: supplierEmail,
        password,
        role: 'SUPPLIER',
        companyName: 'Jest Order Supplier Company',
        phone: '9876543212',
        location: 'Chennai',
      });
    expect(supplierRegistration.statusCode).toBe(201);

    const shopRegistration = await request(app)
      .post('/auth/register')
      .send({
        name: 'Order Realtime Test Shop',
        email: shopEmail,
        password,
        role: 'SHOP',
        shopName: `Order Realtime Shop ${uniqueId}`,
        phone: '9876543215',
        location: 'Chennai',
      });
    expect(shopRegistration.statusCode).toBe(201);

    const supplierLogin = await request(app)
      .post('/auth/login')
      .send({ email: supplierEmail, password });
    const shopLogin = await request(app)
      .post('/auth/login')
      .send({ email: shopEmail, password });

    expect(supplierLogin.statusCode).toBe(200);
    expect(shopLogin.statusCode).toBe(200);

    const productResponse = await request(app)
      .post('/suppliers/products')
      .set('Authorization', `Bearer ${supplierLogin.body.token}`)
      .send({
        name: `Order Realtime Product ${uniqueId}`,
        category: 'Test',
        unit: 'item',
        price: 10,
        stock: 10,
      });
    expect(productResponse.statusCode).toBe(201);

    const [supplierRows] = await pool.execute(
      `SELECT id
       FROM suppliers
       WHERE user_id = (
         SELECT id FROM users WHERE email = ? LIMIT 1
       )
       LIMIT 1`,
      [supplierEmail],
    );
    expect(supplierRows).toHaveLength(1);
    const supplierId = supplierRows[0].id;
    const productId = productResponse.body.product.id;

    const orderResponse = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${shopLogin.body.token}`)
      .send({
        supplierId,
        items: [{ productId, quantity: 3 }],
      });

    expect(orderResponse.statusCode).toBe(201);

    const eventCalls = sendSpy.mock.calls.map(([payload]) => payload);
    expect(eventCalls.some(({ topic }) => topic === 'order.created')).toBe(true);

    const inventoryEventCall = eventCalls.find(
      ({ topic }) => topic === 'inventory.stock.updated',
    );
    expect(inventoryEventCall).toBeDefined();

    const inventoryEvent = JSON.parse(inventoryEventCall.messages[0].value);
    expect(inventoryEvent).toMatchObject({
      productId,
      supplierId,
      oldStock: 10,
      newStock: 7,
    });
    expect(inventoryEvent.eventId).toEqual(expect.any(String));

    sendSpy.mockClear();
    const failedOrderResponse = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${shopLogin.body.token}`)
      .send({
        supplierId,
        items: [{ productId, quantity: 8 }],
      });

    expect(failedOrderResponse.statusCode).toBe(409);
    expect(sendSpy).not.toHaveBeenCalled();
  });
});