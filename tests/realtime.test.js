const { randomUUID } = require('node:crypto');
const request = require('supertest');
const app = require('../src/app');
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
});