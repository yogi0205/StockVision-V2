const request = require('supertest');
const app = require('../src/app');

describe('Authentication API', () => {
  const testEmail = `jest-${Date.now()}@example.com`;

  let token;

  test('POST /auth/register should create a user', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        name: 'Jest Test User',
        email: testEmail,
        password: 'TestPassword123!',
        role: 'SHOP',
        shopName: 'Jest Test Shop',
        phone: '9876543210',
        location: 'Chennai',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).not.toHaveProperty('password');
  });

  test('POST /auth/login should return a JWT', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: testEmail,
        password: 'TestPassword123!',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');

    token = response.body.token;
  });

  test('GET /auth/me should return the authenticated user', async () => {
    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe(testEmail);
  });
});