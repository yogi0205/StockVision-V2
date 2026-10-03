const { pool } = require('../src/config/db');
const redisClient = require('../src/config/redis');
const { connectKafkaProducer } = require('../src/services/kafka.service');
const { producer } = require('../src/config/kafka');

beforeAll(async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  await connectKafkaProducer();
});

afterAll(async () => {
  if (producer) {
    try {
      await producer.disconnect();
    } catch (error) {
      console.error('Kafka producer disconnect failed:', error.message);
    }
  }

  if (redisClient.isOpen) {
    await redisClient.quit();
  }

  await pool.end();
});