const request = require('supertest');
const app = require('../src/app');

describe('Supplier Product API', () => {
  let supplierToken;

  const supplierEmail = `jest-supplier-${Date.now()}@example.com`;

  test('POST /auth/register should create a supplier', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        name: 'Jest Supplier',
        email: supplierEmail,
        password: 'TestPassword123!',
        role: 'SUPPLIER',
        companyName: 'Jest Supplier Company',
        phone: '9876543211',
        location: 'Chennai',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe(supplierEmail);
  });

  test('POST /auth/login should return supplier JWT', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: supplierEmail,
        password: 'TestPassword123!',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');

    supplierToken = response.body.token;
  });

  test('POST /suppliers/products should create a product', async () => {
    const response = await request(app)
      .post('/suppliers/products')
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({
        name: 'Jest Test Product',
        category: 'Electronics',
        unit: 'piece',
        price: 150,
        stock: 25,
      });

    expect(response.statusCode).toBe(201);

    expect(response.body).toHaveProperty(
      'message',
      'Product created successfully',
    );

    expect(response.body).toHaveProperty('product');

    expect(response.body.product).toMatchObject({
      name: 'Jest Test Product',
      category: 'Electronics',
      unit: 'piece',
      price: 150,
      stock: 25,
      version: 1,
    });

    expect(response.body.product).toHaveProperty('id');
  });

  test('GET /suppliers/products should return the created product', async () => {
    const response = await request(app)
      .get('/suppliers/products')
      .set('Authorization', `Bearer ${supplierToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('products');

    expect(response.body.products).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Jest Test Product',
          category: 'Electronics',
          unit: 'piece',
          stock: 25,
          version: 1,
        }),
      ]),
    );
  });

  test('PATCH /suppliers/products/:id/stock should update stock', async () => {
    const productsResponse = await request(app)
      .get('/suppliers/products')
      .set('Authorization', `Bearer ${supplierToken}`);

    expect(productsResponse.statusCode).toBe(200);

    const product = productsResponse.body.products.find(
      (item) => item.name === 'Jest Test Product',
    );

    expect(product).toBeDefined();

    const response = await request(app)
      .patch(`/suppliers/products/${product.id}/stock`)
      .set('Authorization', `Bearer ${supplierToken}`)
      .send({
        stock: 40,
      });

    expect(response.statusCode).toBe(200);

    expect(response.body).toHaveProperty(
      'message',
      'Stock updated successfully',
    );

    expect(response.body.product).toMatchObject({
      id: product.id,
      name: 'Jest Test Product',
      stock: 40,
      version: 2,
    });
  });
});