const express = require('express');
const authRoutes = require('./routes/auth.routes');
const supplierRoutes = require('./routes/supplier.routes');
const shopRoutes = require('./routes/shop.routes');

const app = express();

// Parse JSON request bodies
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/suppliers', supplierRoutes);
app.use('/shops', shopRoutes);

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

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

module.exports = app;