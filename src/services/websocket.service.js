const { WebSocket, WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

const supplierSubscriptions = new Map();

function sendJson(socket, message) {
  socket.send(JSON.stringify(message));
}

function rejectAuthentication(socket) {
  sendJson(socket, {
    type: 'auth.error',
    message: 'Invalid or expired token',
  });
  socket.close();
}

function sendSubscriptionError(socket, message) {
  sendJson(socket, {
    type: 'subscription.error',
    message,
  });
}

function broadcastToSupplier(supplierId, message) {
  const subscribers = supplierSubscriptions.get(supplierId);
  if (!subscribers) {
    return;
  }

  const serializedMessage = JSON.stringify(message);
  for (const socket of subscribers) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(serializedMessage);
    }
  }
}

function initializeWebSocketServer(server) {
  const webSocketServer = new WebSocketServer({
    server,
    path: '/ws/inventory',
  });

  webSocketServer.on('connection', (socket) => {
    console.log('WebSocket client connected');
    socket.send(
      JSON.stringify({
        type: 'connection.ready',
        message: 'Connected to StockVision inventory updates',
      }),
    );

    socket.on('message', (message) => {
      let clientMessage;
      try {
        clientMessage = JSON.parse(message.toString());
      } catch {
        if (socket.user) {
          sendSubscriptionError(socket, 'Invalid message');
        } else {
          rejectAuthentication(socket);
        }
        return;
      }

      if (!socket.user) {
        if (clientMessage?.type === 'subscribe.supplier') {
          sendSubscriptionError(socket, 'WebSocket authentication required');
          return;
        }

        if (
          !clientMessage
          || clientMessage.type !== 'auth'
          || typeof clientMessage.token !== 'string'
          || clientMessage.token.length === 0
        ) {
          rejectAuthentication(socket);
          return;
        }

        try {
          const payload = jwt.verify(clientMessage.token, jwtSecret);
          if (!payload || typeof payload !== 'object' || !payload.userId || !payload.role) {
            rejectAuthentication(socket);
            return;
          }

          socket.user = {
            userId: payload.userId,
            role: payload.role,
          };

          sendJson(socket, { type: 'auth.success' });
          console.log(
            `WebSocket user authenticated: userId=${socket.user.userId}, role=${socket.user.role}`,
          );
        } catch {
          rejectAuthentication(socket);
        }
        return;
      }

      if (clientMessage?.type !== 'subscribe.supplier') {
        return;
      }

      if (socket.user.role !== 'SHOP') {
        sendSubscriptionError(
          socket,
          'Only shop users can subscribe to supplier inventory',
        );
        return;
      }

      if (!Number.isSafeInteger(clientMessage.supplierId) || clientMessage.supplierId <= 0) {
        sendSubscriptionError(socket, 'Invalid supplierId');
        return;
      }

      let subscribers = supplierSubscriptions.get(clientMessage.supplierId);
      if (!subscribers) {
        subscribers = new Set();
        supplierSubscriptions.set(clientMessage.supplierId, subscribers);
      }
      subscribers.add(socket);

      sendJson(socket, {
        type: 'subscription.success',
        supplierId: clientMessage.supplierId,
      });
      console.log(
        `WebSocket user subscribed: userId=${socket.user.userId}, supplierId=${clientMessage.supplierId}`,
      );
    });

    socket.on('close', () => {
      for (const [supplierId, subscribers] of supplierSubscriptions) {
        subscribers.delete(socket);
        if (subscribers.size === 0) {
          supplierSubscriptions.delete(supplierId);
        }
      }
      console.log('WebSocket client disconnected');
    });
  });

  return webSocketServer;
}

module.exports = {
  initializeWebSocketServer,
  broadcastToSupplier,
};
