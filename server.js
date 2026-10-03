const app = require('./src/app');
const { port, nodeEnv } = require('./src/config/env');
const { testDatabaseConnection } = require('./src/config/db');
const redisClient = require('./src/config/redis');
const { connectKafkaProducer } = require('./src/services/kafka.service');
const { connectKafkaConsumer } = require('./src/services/kafka.consumer.service');

async function startServer() {
  try {
    await testDatabaseConnection();

    try {
      await redisClient.connect();
    } catch (error) {
      console.error(
        'Redis connection failed:',
        error.message || error.code || error,
      );
      throw error;
    }

    await connectKafkaProducer();
    await connectKafkaConsumer();

    app.listen(port, () => {
      console.log(`StockVision V2 API running on port ${port}`);
      console.log(`Environment: ${nodeEnv}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message || error.code || error);
    process.exit(1);
  }
}

startServer();