process.env.KAFKA_BROKER = 'localhost:29092';

delete process.env.KAFKA_SASL_USERNAME;
delete process.env.KAFKA_SASL_PASSWORD;
delete process.env.KAFKA_CA_CERT;
delete process.env.KAFKA_CA_CERT_PATH;