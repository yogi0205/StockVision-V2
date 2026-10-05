const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const redisClient = require('../src/config/redis');
const { createSupplierProduct } = require('../src/services/product.service');

describe('Supplier Product API', () => {
  let supplierToken;

  const supplierEmail = `jest-supplier-${Date.now()}@example.com`;

  afterEach(() => {
    jest.restoreAllMocks();
  });

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
    const [suppliers] = await pool.execute(
      `SELECT suppliers.id
       FROM suppliers
       INNER JOIN users ON users.id = suppliers.user_id
       WHERE users.email = ?
       LIMIT 1`,
      [supplierEmail],
    );
    const invalidateSpy = jest.spyOn(redisClient, 'del').mockResolvedValue(1);

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
    expect(invalidateSpy).toHaveBeenCalledWith(
      `supplier:${suppliers[0].id}:products`,
    );
  });

  test('failed product creation does not invalidate the supplier product cache', async () => {
    const invalidateSpy = jest.spyOn(redisClient, 'del').mockResolvedValue(1);
    const connection = {
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      execute: jest.fn()
        .mockResolvedValueOnce([[{ id: 123 }], []])
        .mockResolvedValueOnce([{ insertId: 456 }, []])
        .mockRejectedValueOnce(new Error('Stock history insert failed')),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      release: jest.fn(),
    };
    jest.spyOn(pool, 'getConnection').mockResolvedValue(connection);

    await expect(createSupplierProduct(789, {
      name: 'Failed Product',
      unit: 'piece',
      price: 10,
      stock: 5,
    })).rejects.toThrow('Stock history insert failed');

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalled();
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
    const [productRows] = await pool.execute(
      'SELECT supplier_id FROM products WHERE id = ? LIMIT 1',
      [product.id],
    );
    const invalidateSpy = jest.spyOn(redisClient, 'del').mockResolvedValue(1);

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
    expect(invalidateSpy).toHaveBeenCalledWith(
      `supplier:${productRows[0].supplier_id}:products`,
    );
  });
});