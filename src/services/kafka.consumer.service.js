const { kafka } = require('../config/kafka');
const { broadcastToSupplier } = require('./websocket.service');

const consumer = kafka.consumer({
  groupId: 'stockvision-inventory-consumer',
});

async function connectKafkaConsumer() {
  await consumer.connect();
  await consumer.subscribe({
    topics: [
      'inventory.stock.updated',
      'inventory.stock.depleted',
      'order.created',
      'order.status.updated',
    ],
    fromBeginning: false,
  });
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      let event;
      try {
        event = JSON.parse(message.value.toString());
      } catch (error) {
        console.error('Invalid Kafka message JSON:', { topic, error });
        return;
      }

      console.log('Kafka event received:', { topic, event });

      if (
        topic === 'inventory.stock.updated'
        || topic === 'inventory.stock.depleted'
      ) {
        broadcastToSupplier(event.supplierId, {
          type: topic,
          data: event,
        });
      }
    },
  });
}

module.exports = {
  connectKafkaConsumer,
};
