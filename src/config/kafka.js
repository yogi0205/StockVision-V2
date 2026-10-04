const fs = require('node:fs');
const path = require('node:path');
const { Kafka } = require('kafkajs');

const kafkaConfig = {
  clientId: 'stockvision-v2',
  brokers: [
    process.env.KAFKA_BROKER || 'localhost:9092',
  ],
};

// Aiven Kafka: SASL_SSL + SCRAM-SHA-256
if (process.env.KAFKA_SASL_USERNAME && process.env.KAFKA_SASL_PASSWORD) {
  let caCertificate;

  if (process.env.KAFKA_CA_CERT) {
    caCertificate = process.env.KAFKA_CA_CERT;
  } else if (process.env.KAFKA_CA_CERT_PATH) {
    caCertificate = fs.readFileSync(
      path.resolve(process.env.KAFKA_CA_CERT_PATH),
      'utf8'
    );
  }

  kafkaConfig.ssl = caCertificate
    ? {
        rejectUnauthorized: true,
        ca: [caCertificate],
      }
    : true;

  kafkaConfig.sasl = {
    mechanism: 'scram-sha-256',
    username: process.env.KAFKA_SASL_USERNAME,
    password: process.env.KAFKA_SASL_PASSWORD,
  };
}

const kafka = new Kafka(kafkaConfig);

const producer = kafka.producer();

module.exports = {
  kafka,
  producer,
};