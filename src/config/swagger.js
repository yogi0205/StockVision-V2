const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'StockVision V2 API',
      version: '1.0.0',
      description: 'Authentication, supplier inventory, shop, and order APIs.',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local development server',
      },
    ],
    tags: [
      { name: 'Health' },
      { name: 'Authentication' },
      { name: 'Supplier inventory' },
      { name: 'Shop' },
      { name: 'Orders' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter the JWT returned by POST /auth/login.',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
          required: ['message'],
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
                required: ['field', 'message'],
              },
            },
          },
          required: ['success', 'message', 'errors'],
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', format: 'int64' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['SUPPLIER', 'SHOP'] },
          },
          required: ['id', 'name', 'email', 'role'],
        },
        AuthenticatedUser: {
          allOf: [
            { $ref: '#/components/schemas/User' },
            {
              type: 'object',
              properties: {
                is_active: { type: 'boolean' },
              },
              required: ['is_active'],
            },
          ],
        },
        RegistrationRequest: {
          oneOf: [
            {
              type: 'object',
              properties: {
                name: { type: 'string', maxLength: 100 },
                email: { type: 'string', format: 'email', maxLength: 255 },
                password: { type: 'string', minLength: 8 },
                role: { type: 'string', enum: ['SUPPLIER'] },
                companyName: { type: 'string', maxLength: 150 },
                phone: { type: 'string', maxLength: 20 },
                location: { type: 'string', maxLength: 255 },
              },
              required: ['name', 'email', 'password', 'role', 'companyName'],
              additionalProperties: false,
            },
            {
              type: 'object',
              properties: {
                name: { type: 'string', maxLength: 100 },
                email: { type: 'string', format: 'email', maxLength: 255 },
                password: { type: 'string', minLength: 8 },
                role: { type: 'string', enum: ['SHOP'] },
                shopName: { type: 'string', maxLength: 150 },
                phone: { type: 'string', maxLength: 20 },
                location: { type: 'string', maxLength: 255 },
              },
              required: ['name', 'email', 'password', 'role', 'shopName'],
              additionalProperties: false,
            },
          ],
        },
        LoginRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
          required: ['email', 'password'],
          additionalProperties: false,
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Login successful' },
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
          required: ['message', 'token', 'user'],
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer', format: 'int64' },
            name: { type: 'string' },
            category: { type: 'string', nullable: true },
            unit: { type: 'string' },
            price: { type: 'number', format: 'float' },
            stock: { type: 'integer' },
            version: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
          required: [
            'id', 'name', 'category', 'unit', 'price', 'stock',
            'version', 'created_at', 'updated_at',
          ],
        },
        CreateProductRequest: {
          type: 'object',
          properties: {
            name: { type: 'string', maxLength: 150 },
            category: { type: 'string', maxLength: 100 },
            unit: { type: 'string', maxLength: 50 },
            price: { type: 'number', exclusiveMinimum: 0 },
            stock: { type: 'integer', minimum: 0 },
          },
          required: ['name', 'unit', 'price', 'stock'],
          additionalProperties: false,
        },
        UpdateStockRequest: {
          type: 'object',
          properties: {
            stock: { type: 'integer', minimum: 0 },
          },
          required: ['stock'],
          additionalProperties: false,
        },
        StockUpdateResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Stock updated successfully' },
            product: {
              type: 'object',
              properties: {
                id: { type: 'integer', format: 'int64' },
                name: { type: 'string' },
                stock: { type: 'integer' },
                version: { type: 'integer' },
              },
              required: ['id', 'name', 'stock', 'version'],
            },
          },
          required: ['message', 'product'],
        },
        CreateProductResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Product created successfully' },
            product: { $ref: '#/components/schemas/Product' },
          },
          required: ['message', 'product'],
        },
        Supplier: {
          type: 'object',
          properties: {
            id: { type: 'integer', format: 'int64' },
            company_name: { type: 'string' },
            phone: { type: 'string', nullable: true },
            location: { type: 'string', nullable: true },
          },
          required: ['id', 'company_name', 'phone', 'location'],
        },
        OrderItemRequest: {
          type: 'object',
          properties: {
            productId: { type: 'integer', minimum: 1 },
            quantity: { type: 'integer', minimum: 1 },
          },
          required: ['productId', 'quantity'],
          additionalProperties: false,
        },
        CreateOrderRequest: {
          type: 'object',
          properties: {
            supplierId: { type: 'integer', minimum: 1 },
            items: {
              type: 'array',
              minItems: 1,
              items: { $ref: '#/components/schemas/OrderItemRequest' },
            },
          },
          required: ['supplierId', 'items'],
          additionalProperties: false,
        },
        OrderItem: {
          type: 'object',
          properties: {
            productId: { type: 'integer', format: 'int64' },
            productName: { type: 'string' },
            quantity: { type: 'integer' },
            unitPrice: { type: 'number', format: 'float' },
            lineTotal: { type: 'number', format: 'float' },
          },
          required: ['productId', 'productName', 'quantity', 'unitPrice', 'lineTotal'],
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'integer', format: 'int64' },
            supplierId: { type: 'integer', format: 'int64' },
            supplierName: { type: 'string' },
            status: {
              type: 'string',
              enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED'],
            },
            totalAmount: { type: 'number', format: 'float' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/OrderItem' },
            },
          },
          required: ['id', 'supplierId', 'status', 'totalAmount'],
        },
        CreateOrderResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Order created successfully' },
            order: {
              type: 'object',
              properties: {
                id: { type: 'integer', format: 'int64' },
                supplierId: { type: 'integer', format: 'int64' },
                status: { type: 'string', example: 'PENDING' },
                totalAmount: { type: 'number', format: 'float' },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      productId: { type: 'integer', format: 'int64' },
                      quantity: { type: 'integer' },
                      unitPrice: { type: 'number', format: 'float' },
                      lineTotal: { type: 'number', format: 'float' },
                    },
                    required: ['productId', 'quantity', 'unitPrice', 'lineTotal'],
                  },
                },
              },
              required: ['id', 'supplierId', 'status', 'totalAmount', 'items'],
            },
          },
          required: ['message', 'order'],
        },
        UpdateOrderStatusRequest: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED'],
            },
          },
          required: ['status'],
          additionalProperties: false,
        },
        UpdateOrderStatusResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Order status updated successfully' },
            order: {
              type: 'object',
              properties: {
                id: { type: 'integer', format: 'int64' },
                status: { type: 'string' },
              },
              required: ['id', 'status'],
            },
          },
          required: ['message', 'order'],
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Check API health',
          responses: {
            200: {
              description: 'API is running',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      message: { type: 'string' },
                    },
                    required: ['status', 'message'],
                  },
                },
              },
            },
          },
        },
      },
      '/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Register a supplier or shop user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegistrationRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'User registered',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      user: { $ref: '#/components/schemas/User' },
                    },
                    required: ['message', 'user'],
                  },
                },
              },
            },
            400: { description: 'Invalid registration data' },
            409: { description: 'Email already registered' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Log in and receive a JWT',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/LoginResponse' },
                },
              },
            },
            400: { description: 'Invalid login data' },
            401: { description: 'Invalid email or password' },
            403: { description: 'Account is inactive' },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Authentication'],
          summary: 'Get the authenticated user profile',
          description: 'Requires a valid JWT.',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Authenticated user',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      user: { $ref: '#/components/schemas/AuthenticatedUser' },
                    },
                    required: ['user'],
                  },
                },
              },
            },
            401: { description: 'Authentication required or token invalid' },
            403: { description: 'Account is inactive' },
            404: { description: 'User not found' },
          },
        },
      },
      '/suppliers/products': {
        get: {
          tags: ['Supplier inventory'],
          summary: 'List the authenticated supplier’s active products',
          description: 'Requires a valid JWT and the SUPPLIER role.',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Active products',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      products: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Product' },
                      },
                    },
                    required: ['products'],
                  },
                },
              },
            },
            401: { description: 'Authentication required or token invalid' },
            403: { description: 'SUPPLIER role required' },
            404: { description: 'Supplier profile not found' },
          },
        },
        post: {
          tags: ['Supplier inventory'],
          summary: 'Create a supplier product',
          description: 'Requires a valid JWT and the SUPPLIER role.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateProductRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Product created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CreateProductResponse' },
                },
              },
            },
            400: { description: 'Invalid product data' },
            401: { description: 'Authentication required or token invalid' },
            403: { description: 'SUPPLIER role required' },
            404: { description: 'Supplier profile not found' },
          },
        },
      },
      '/suppliers/products/{id}': {
        get: {
          tags: ['Supplier inventory'],
          summary: 'Get an active product belonging to the authenticated supplier',
          description: 'Requires a valid JWT and the SUPPLIER role.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          responses: {
            200: {
              description: 'Product details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      product: { $ref: '#/components/schemas/Product' },
                    },
                    required: ['product'],
                  },
                },
              },
            },
            401: { description: 'Authentication required or token invalid' },
            403: { description: 'SUPPLIER role required' },
            404: { description: 'Product not found' },
          },
        },
      },
      '/suppliers/products/{id}/stock': {
        patch: {
          tags: ['Supplier inventory'],
          summary: 'Update stock for a supplier-owned product',
          description: 'Requires a valid JWT and the SUPPLIER role.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateStockRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Stock updated',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/StockUpdateResponse' },
                },
              },
            },
            400: { description: 'Invalid stock data' },
            401: { description: 'Authentication required or token invalid' },
            403: { description: 'SUPPLIER role required' },
            404: { description: 'Supplier or product not found' },
          },
        },
      },
      '/shops/suppliers': {
        get: {
          tags: ['Shop'],
          summary: 'List active suppliers for an authenticated shop',
          description: 'Requires a valid JWT and the SHOP role.',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Active suppliers',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      suppliers: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Supplier' },
                      },
                    },
                    required: ['suppliers'],
                  },
                },
              },
            },
            401: { description: 'Authentication required or token invalid' },
            403: { description: 'SHOP role required' },
            404: { description: 'Shop profile not found' },
          },
        },
      },
      '/shops/suppliers/{supplierId}/products': {
        get: {
          tags: ['Shop'],
          summary: 'List active products for a supplier',
          description: 'Requires a valid JWT and the SHOP role.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'supplierId',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          responses: {
            200: {
              description: 'Supplier and active products',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      supplier: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer', format: 'int64' },
                          company_name: { type: 'string' },
                        },
                        required: ['id', 'company_name'],
                      },
                      products: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Product' },
                      },
                    },
                    required: ['supplier', 'products'],
                  },
                },
              },
            },
            401: { description: 'Authentication required or token invalid' },
            403: { description: 'SHOP role required' },
            404: { description: 'Shop or supplier not found' },
          },
        },
      },
      '/orders': {
        get: {
          tags: ['Orders'],
          summary: 'List orders for the authenticated shop',
          description: 'Requires a valid JWT and the SHOP role.',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Shop orders',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      orders: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Order' },
                      },
                    },
                    required: ['orders'],
                  },
                },
              },
            },
            401: { description: 'Authentication required or token invalid' },
            403: { description: 'SHOP role required' },
            404: { description: 'Shop profile not found' },
          },
        },
        post: {
          tags: ['Orders'],
          summary: 'Create an order',
          description: 'Requires a valid JWT and the SHOP role.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateOrderRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Order created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CreateOrderResponse' },
                },
              },
            },
            400: { description: 'Invalid order data' },
            401: { description: 'Authentication required or token invalid' },
            403: { description: 'SHOP role required' },
            404: { description: 'Shop, supplier, or product not found' },
            409: { description: 'Insufficient stock' },
          },
        },
      },
      '/orders/{id}': {
        get: {
          tags: ['Orders'],
          summary: 'Get an order belonging to the authenticated shop',
          description: 'Requires a valid JWT and the SHOP role.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          responses: {
            200: {
              description: 'Order details with items',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      order: { $ref: '#/components/schemas/Order' },
                    },
                    required: ['order'],
                  },
                },
              },
            },
            401: { description: 'Authentication required or token invalid' },
            403: { description: 'SHOP role required' },
            404: { description: 'Shop or order not found' },
          },
        },
      },
      '/orders/{id}/status': {
        patch: {
          tags: ['Orders'],
          summary: 'Update an order status',
          description: 'Requires a valid JWT and the SUPPLIER role. Allowed transitions depend on the current status.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateOrderStatusRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'Order status updated',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/UpdateOrderStatusResponse' },
                },
              },
            },
            400: { description: 'Invalid status data' },
            401: { description: 'Authentication required or token invalid' },
            403: { description: 'SUPPLIER role required' },
            404: { description: 'Supplier or order not found' },
            409: { description: 'Invalid status transition' },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
