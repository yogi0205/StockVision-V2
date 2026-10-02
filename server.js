const app = require('./src/app');
const { port, nodeEnv } = require('./src/config/env');

app.listen(port, () => {
  console.log(`StockVision V2 API running on port ${port}`);
  console.log(`Environment: ${nodeEnv}`);
});