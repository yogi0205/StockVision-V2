const express = require('express');

const app = express();

// Parse JSON request bodies
app.use(express.json());

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