const app = require('./src/app');
const { port, nodeEnv } = require('./src/config/env');
const { testDatabaseConnection } = require('./src/config/db');
const redisClient = require('./src/config/redis');

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