const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'stockvision-v2',
  brokers: [
    process.env.KAFKA_BROKER || 'localhost:9092',
  ],
});

const producer = kafka.producer();

module.exports = {
  kafka,
  producer,
};