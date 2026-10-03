const { kafka } = require('../config/kafka');

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
      const event = JSON.parse(message.value.toString());
      console.log('Kafka event received:', { topic, event });
    },
  });
}

module.exports = {
  connectKafkaConsumer,
};
