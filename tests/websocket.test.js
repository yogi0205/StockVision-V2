const { randomUUID } = require('node:crypto');
const http = require('node:http');
const WebSocket = require('ws');
const request = require('supertest');
const { kafka } = require('../src/config/kafka');
const { pool } = require('../src/config/db');
const app = require('../src/app');
const { initializeWebSocketServer, broadcastToSupplier } = require('../src/services/websocket.service');

const EVENT_TIMEOUT_MS = 15000;

function waitForMessage(socket, expectedType, timeoutMs = EVENT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for WebSocket message: ${expectedType}`));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timeout);
      socket.off('message', onMessage);
      socket.off('close', onClose);
    }

    function onMessage(data) {
      let message;
      try {
        message = JSON.parse(data.toString());
      } catch (error) {
        cleanup();
        reject(error);
        return;
      }

      if (message.type === expectedType) {
        cleanup();
        resolve(message);
      } else if (message.type === 'auth.error' || message.type === 'subscription.error') {
        cleanup();
        reject(new Error(message.message));
      }
    }

    function onClose() {
      cleanup();
      reject(new Error(`WebSocket closed before receiving: ${expectedType}`));
    }

    socket.on('message', onMessage);
    socket.on('close', onClose);
  });
}

function waitForConsumerGroupJoin(consumer) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for Kafka consumer group assignment'));
    }, EVENT_TIMEOUT_MS);

    function cleanup() {
      clearTimeout(timeout);
    }

    function onGroupJoin() {
      cleanup();
      resolve();
    }

    consumer.on(consumer.events.GROUP_JOIN, onGroupJoin);
  });
}

describe('WebSocket inventory subscriptions', () => {
  let server;
  let webSocketServer;
  let consumer;
  let client;
  let webSocketUrl;

  beforeAll(async () => {
    server = http.createServer(app);
    webSocketServer = initializeWebSocketServer(server);
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, resolve);
    });
    const { port } = server.address();
    webSocketUrl = `ws://localhost:${port}/ws/inventory`;

    consumer = kafka.consumer({
      groupId: `stockvision-websocket-test-${randomUUID()}`,
    });
    await consumer.connect();
    await consumer.subscribe({
      topic: 'inventory.stock.updated',
      fromBeginning: false,
    });

    const groupJoin = waitForConsumerGroupJoin(consumer);
    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        const event = JSON.parse(message.value.toString());
        if (topic === 'inventory.stock.updated') {
          broadcastToSupplier(event.supplierId, {
            type: topic,
            data: event,
          });
        }
      },
    });
    await groupJoin;
  }, 60000);

  afterAll(async () => {
    if (client && client.readyState !== WebSocket.CLOSED) {
      await new Promise((resolve) => {
        let timeout;
        const finish = () => {
          clearTimeout(timeout);
          client.off('close', finish);
          client.off('error', finish);
          resolve();
        };

        client.once('close', finish);
        client.once('error', finish);
        timeout = setTimeout(finish, 4000);

        if (
          client.readyState === WebSocket.OPEN
          || client.readyState === WebSocket.CONNECTING
        ) {
          try {
            client.close();
          } catch (error) {
            console.error('WebSocket client close failed:', error.message);
            finish();
          }
        }
      });
    }

    if (consumer) {
      await consumer.stop();
      await consumer.disconnect();
    }

    if (webSocketServer) {
      await new Promise((resolve) => webSocketServer.close(resolve));
    }

    if (server && server.listening) {
      await new Promise((resolve) => server.close(resolve));
    }
  }, 30000);

  test(
    'authenticates a shop, subscribes to a supplier, and receives stock updates',
    async () => {
      const uniqueId = randomUUID();
      const supplierEmail = `jest-ws-supplier-${uniqueId}@example.com`;
      const shopEmail = `jest-ws-shop-${uniqueId}@example.com`;
      const password = 'TestPassword123!';

      const supplierRegistration = await request(app)
        .post('/auth/register')
        .send({
          name: 'WebSocket Test Supplier',
          email: supplierEmail,
          password,
          role: 'SUPPLIER',
          companyName: `WebSocket Supplier ${uniqueId}`,
        });
      expect(supplierRegistration.statusCode).toBe(201);

      const shopRegistration = await request(app)
        .post('/auth/register')
        .send({
          name: 'WebSocket Test Shop',
          email: shopEmail,
          password,
          role: 'SHOP',
          shopName: `WebSocket Shop ${uniqueId}`,
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
      const supplierToken = supplierLogin.body.token;
      const shopToken = shopLogin.body.token;

      const [supplierRows] = await pool.execute(
        `SELECT suppliers.id
         FROM suppliers
         INNER JOIN users ON users.id = suppliers.user_id
         WHERE users.email = ?
         LIMIT 1`,
        [supplierEmail],
      );
      expect(supplierRows).toHaveLength(1);
      const supplierId = supplierRows[0].id;

      const productResponse = await request(app)
        .post('/suppliers/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          name: `WebSocket Product ${uniqueId}`,
          category: 'Test',
          unit: 'item',
          price: 10,
          stock: 10,
        });
      expect(productResponse.statusCode).toBe(201);
      const productId = productResponse.body.product.id;

      client = new WebSocket(webSocketUrl);
      const connectionReady = waitForMessage(client, 'connection.ready');
      await new Promise((resolve, reject) => {
        client.once('open', resolve);
        client.once('error', reject);
      });
      await connectionReady;

      const authSuccess = waitForMessage(client, 'auth.success');
      client.send(JSON.stringify({
        type: 'auth',
        token: shopToken,
      }));
      await authSuccess;

      const subscriptionSuccess = waitForMessage(client, 'subscription.success');
      client.send(JSON.stringify({
        type: 'subscribe.supplier',
        supplierId,
      }));
      expect(await subscriptionSuccess).toMatchObject({
        type: 'subscription.success',
        supplierId,
      });

      const stockUpdateMessage = waitForMessage(client, 'inventory.stock.updated');
      const stockUpdateResponse = await request(app)
        .patch(`/suppliers/products/${productId}/stock`)
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({ stock: 5 });

      expect(stockUpdateResponse.statusCode).toBe(200);
      expect(stockUpdateResponse.body.product).toMatchObject({
        id: productId,
        stock: 5,
      });

      const receivedMessage = await stockUpdateMessage;
      expect(receivedMessage.data).toMatchObject({
        productId,
        supplierId,
        oldStock: 10,
        newStock: 5,
      });
    },
    60000,
  );
});
