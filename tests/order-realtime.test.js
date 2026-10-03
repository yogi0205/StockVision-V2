const { randomUUID } = require('node:crypto');
const http = require('node:http');
const WebSocket = require('ws');
const request = require('supertest');
const { kafka } = require('../src/config/kafka');
const { pool } = require('../src/config/db');
const app = require('../src/app');
const {
  initializeWebSocketServer,
  broadcastToSupplier,
} = require('../src/services/websocket.service');

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
      reject(new Error('Timed out waiting for Kafka consumer group assignment'));
    }, EVENT_TIMEOUT_MS);

    consumer.on(consumer.events.GROUP_JOIN, () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

describe('Order-created WebSocket event', () => {
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

    webSocketUrl = `ws://localhost:${server.address().port}/ws/inventory`;
    consumer = kafka.consumer({
      groupId: `stockvision-order-realtime-test-${randomUUID()}`,
    });
    await consumer.connect();
    await consumer.subscribe({
      topic: 'order.created',
      fromBeginning: false,
    });

    const groupJoin = waitForConsumerGroupJoin(consumer);
    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        const event = JSON.parse(message.value.toString());
        if (topic === 'order.created' && event.supplierId) {
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
    const cleanupWithTimeout = async (label, operation, timeoutMs = 4000) => {
      let timeout;
      try {
        await Promise.race([
          operation(),
          new Promise((resolve, reject) => {
            timeout = setTimeout(
              () => reject(new Error(`${label} cleanup timed out`)),
              timeoutMs,
            );
          }),
        ]);
      } catch (error) {
        console.error(`${label} cleanup failed:`, error.message);
      } finally {
        clearTimeout(timeout);
      }
    };

    if (client && client.readyState !== WebSocket.CLOSED) {
      await new Promise((resolve) => {
        let timeout;
        const finish = () => {
          clearTimeout(timeout);
          client.off('close', onClose);
          client.off('error', onError);
          resolve();
        };
        const onClose = finish;
        const onError = (error) => {
          console.error('WebSocket client cleanup error:', error.message);
        };

        client.once('close', onClose);
        client.on('error', onError);
        timeout = setTimeout(() => {
          console.error('WebSocket client cleanup timed out');
          finish();
        }, 4000);

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
      await cleanupWithTimeout('Kafka consumer stop', () => consumer.stop());
      await cleanupWithTimeout('Kafka consumer disconnect', () => consumer.disconnect());
    }

    if (webSocketServer) {
      await cleanupWithTimeout(
        'WebSocket server',
        () => new Promise((resolve, reject) => {
          webSocketServer.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        }),
      );
    }

    if (server && server.listening) {
      await cleanupWithTimeout(
        'HTTP server',
        () => new Promise((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        }),
      );
    }
  }, 30000);

  test(
    'delivers order.created to an authenticated SHOP subscriber',
    async () => {
      const uniqueId = randomUUID();
      const supplierEmail = `jest-order-ws-supplier-${uniqueId}@example.com`;
      const shopEmail = `jest-order-ws-shop-${uniqueId}@example.com`;
      const password = 'TestPassword123!';

      const supplierRegistration = await request(app)
        .post('/auth/register')
        .send({
          name: 'Order Event Test Supplier',
          email: supplierEmail,
          password,
          role: 'SUPPLIER',
          companyName: `Order Event Supplier ${uniqueId}`,
        });
      expect(supplierRegistration.statusCode).toBe(201);

      const shopRegistration = await request(app)
        .post('/auth/register')
        .send({
          name: 'Order Event Test Shop',
          email: shopEmail,
          password,
          role: 'SHOP',
          shopName: `Order Event Shop ${uniqueId}`,
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
      const [shopRows] = await pool.execute(
        `SELECT shops.id
         FROM shops
         INNER JOIN users ON users.id = shops.user_id
         WHERE users.email = ?
         LIMIT 1`,
        [shopEmail],
      );
      expect(supplierRows).toHaveLength(1);
      expect(shopRows).toHaveLength(1);
      const supplierId = supplierRows[0].id;
      const shopId = shopRows[0].id;

      const productResponse = await request(app)
        .post('/suppliers/products')
        .set('Authorization', `Bearer ${supplierToken}`)
        .send({
          name: `Order Event Product ${uniqueId}`,
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

      const orderCreatedMessage = waitForMessage(client, 'order.created');
      const orderResponse = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${shopToken}`)
        .send({
          supplierId,
          items: [{ productId, quantity: 2 }],
        });

      expect(orderResponse.statusCode).toBe(201);
      const receivedMessage = await orderCreatedMessage;
      expect(receivedMessage).toMatchObject({
        type: 'order.created',
        data: {
          orderId: orderResponse.body.order.id,
          shopId,
          supplierId,
          status: 'PENDING',
          totalAmount: 20,
        },
      });
    },
    60000,
  );
});
