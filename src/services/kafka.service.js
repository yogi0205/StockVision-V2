const { producer } = require('../config/kafka');

async function connectKafkaProducer() {
  await producer.connect();
}

async function publishStockUpdatedEvent(event) {
  await producer.send({
    topic: 'inventory.stock.updated',
    messages: [
      {
        key: event.eventId,
        value: JSON.stringify(event),
      },
    ],
  });
}

async function publishStockDepletedEvent(event) {
  await producer.send({
    topic: 'inventory.stock.depleted',
    messages: [
      {
        key: event.eventId,
        value: JSON.stringify(event),
      },
    ],
  });
}

async function publishOrderCreatedEvent(event) {
  await producer.send({
    topic: 'order.created',
    messages: [
      {
        key: event.eventId,
        value: JSON.stringify(event),
      },
    ],
  });
}

async function publishOrderStatusUpdatedEvent(event) {
  await producer.send({
    topic: 'order.status.updated',
    messages: [
      {
        key: event.eventId,
        value: JSON.stringify(event),
      },
    ],
  });
}

module.exports = {
  connectKafkaProducer,
  publishStockUpdatedEvent,
  publishStockDepletedEvent,
  publishOrderCreatedEvent,
  publishOrderStatusUpdatedEvent,
};
