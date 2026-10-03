const request = require('supertest');
const app = require('../src/app');

describe('Swagger documentation', () => {
  test('GET /api-docs serves the Swagger UI', async () => {
    const response = await request(app).get('/api-docs').redirects(1);

    expect(response.statusCode).toBe(200);
    expect(response.text).toContain('swagger-ui');
  });
});
