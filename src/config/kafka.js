const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'stockvision-v2',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();

module.exports = {
  kafka,
  producer,
};
