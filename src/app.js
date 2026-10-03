const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const authRoutes = require('./routes/auth.routes');
const supplierRoutes = require('./routes/supplier.routes');
const shopRoutes = require('./routes/shop.routes');
const orderRoutes = require('./routes/order.routes');

const app = express();

// Parse JSON request bodies
app.use(express.json({ limit: '1mb' }));

app.use('/auth', authRoutes);
app.use('/suppliers', supplierRoutes);
app.use('/shops', shopRoutes);
app.use('/orders', orderRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'StockVision V2 API is running',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);

  // Malformed JSON request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON request body',
    });
  }

  const status = Number.isInteger(err.status) ? err.status : 500;

  return res.status(status).json({
    success: false,
    message: status >= 500
      ? 'Internal server error'
      : err.message || 'Request failed',
  });
});

module.exports = app;