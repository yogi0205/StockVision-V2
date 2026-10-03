const { kafka } = require('../config/kafka');

const consumer = kafka.consumer({
  groupId: 'stockvision-inventory-consumer',
});

async function connectKafkaConsumer() {
  await consumer.connect();
  await consumer.subscribe({
    topic: 'inventory.stock.updated',
    fromBeginning: false,
  });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      console.log('Stock updated event received:', event);
    },
  });
}

module.exports = {
  connectKafkaConsumer,
};
