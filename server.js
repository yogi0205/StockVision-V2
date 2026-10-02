const app = require('./src/app');
const { port, nodeEnv } = require('./src/config/env');
const { testDatabaseConnection } = require('./src/config/db');

async function startServer() {
  try {
    await testDatabaseConnection();

    app.listen(port, () => {
      console.log(`StockVision V2 API running on port ${port}`);
      console.log(`Environment: ${nodeEnv}`);
    });
  } catch (error) {
    console.error('Server startup failed');
    process.exit(1);
  }
}

startServer();