# StockVision V2

A complete real-time supplier inventory and order management platform built with **Node.js, Express.js, MySQL, Redis, Apache Kafka, WebSockets, and React**.

StockVision V2 provides separate React dashboards and workflows for suppliers and shops, secure authentication, inventory management, transactional order processing, Redis caching, Kafka-based event communication, and real-time WebSocket updates.

---

## Features

- JWT-based authentication
- Role-based access control
- Supplier product management
- Real-time stock updates
- Stock history tracking
- Shop supplier/product browsing
- Order creation and management
- Transaction-safe stock deduction
- MySQL row-level locking for concurrent orders
- Redis caching for supplier product lists
- Redis cache invalidation after stock updates
- Apache Kafka event publishing
- Kafka event consumption
- Real-time WebSocket inventory notifications
- WebSocket supplier subscriptions
- Order status management
- Joi request validation
- Centralized error handling
- Swagger API documentation
- Jest + Supertest automated tests
- Docker Compose environment
- MySQL, Redis, Kafka, and API containers

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express.js | REST API |
| MySQL 8.4 | Relational database |
| Redis 7 | Caching |
| Apache Kafka 4.2.2 | Event streaming |
| KafkaJS | Kafka integration |
| WebSocket | Real-time communication |
| React | Shop and supplier dashboards |
| JWT | Authentication |
| bcryptjs | Password hashing |
| Joi | Request validation |
| Swagger | API documentation |
| Jest | Testing |
| Supertest | API testing |
| Docker | Containerization |
| Docker Compose | Local infrastructure |

---

## Frontend Dashboards

The React frontends are maintained in separate directories:

- `shop-dashboard/` — Shop users can browse suppliers and products, manage a cart, place orders, and view order details and status.
- `supplier-dashboard/` — Suppliers can view inventory summaries, manage products and stock, list orders containing their products, view order details, update order statuses, and view their profile.

---

## Architecture

```text
       ┌───────────────────────┐        ┌──────────────────────────┐
       │ Shop Dashboard        │        │ Supplier Dashboard       │
       │ React                 │        │ React                    │
       └───────────┬───────────┘        └────────────┬─────────────┘
                   │                                 │
                   └──────────── REST ───────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Express API       │
                         │   Node.js           │
                         └──────┬──────┬───────┘
                                │      │
                 ┌──────────────┘      └──────────────┐
                 │                                     │
                 ▼                                     ▼
        ┌─────────────────┐                    ┌───────────────┐
        │     MySQL       │                    │    Redis      │
        │                 │                    │               │
        │ Users           │                    │ Product List  │
        │ Suppliers       │                    │ Cache         │
        │ Shops           │                    │               │
        │ Products        │                    └───────────────┘
        │ Orders          │
        │ Order Items     │
        │ Stock History   │
        └────────┬────────┘
                 │
                 │ Events
                 ▼
        ┌─────────────────┐
        │     Kafka       │
        │                 │
        │ stock.updated   │
        │ stock.depleted  │
        │ order.created   │
        │ order.status    │
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ Kafka Consumer  │
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │   WebSocket     │
        │     Server      │
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ Shop Dashboard  │
        │ Real-time Data  │
        └─────────────────┘
```

---

# Project Structure

```text
StockVision-V2/
│
├── src/
│   ├── config/
│   │   ├── db.js
│   │   ├── env.js
│   │   ├── kafka.js
│   │   └── redis.js
│   │
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   │   ├── kafka.service.js
│   │   ├── websocket.service.js
│   │   └── ...
│   │
│   └── app.js
│
├── tests/
│   ├── jest-env.js
│   ├── setup.js
│   ├── order-realtime.test.js
│   ├── websocket.test.js
│   └── ...
│
├── Dockerfile
├── docker-compose.yml
├── package.json
├── package-lock.json
├── server.js
├── .gitignore
└── README.md
```

---

# Prerequisites

Install the following before running the project locally:

- Node.js
- npm
- Docker Desktop
- Git

The project uses:

```text
Node.js 24
MySQL 8.4
Redis 7
Apache Kafka 4.2.2
```

---

# Installation

Clone the repository:

```bash
git clone https://github.com/yogi0205/StockVision-V2.git
```

Move into the project:

```bash
cd StockVision-V2
```

Install dependencies:

```bash
npm install
```

---

# Environment Configuration

Create a `.env` file in the project root.

Example:

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=stockvision_root
DB_NAME=stockvision_v2

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1h
```

For Docker, the project uses a separate `.env.docker` configuration.

Example Docker database configuration:

```env
PORT=5000
NODE_ENV=production

DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=stockvision_root
DB_NAME=stockvision_v2

REDIS_URL=redis://redis:6379

JWT_SECRET=your_docker_jwt_secret
JWT_EXPIRES_IN=1h

KAFKA_BROKER=kafka:9092
```

Do not commit `.env` or `.env.docker`.

---

# Running with Docker

The project includes Docker Compose for:

- API
- MySQL
- Redis
- Kafka

Start all services:

```bash
docker compose up -d
```

Check container status:

```bash
docker compose ps
```

Expected services:

```text
stockvision-api
stockvision-kafka
stockvision-mysql
stockvision-redis
```

Stop services:

```bash
docker compose down
```

View logs:

```bash
docker compose logs
```

View API logs:

```bash
docker compose logs api
```

View Kafka logs:

```bash
docker compose logs kafka
```

---

# API

The API runs on:

```text
http://localhost:5000
```

Health check:

```http
GET /health
```

Example:

```bash
curl http://localhost:5000/health
```

Response:

```json
{
  "status": "ok",
  "message": "StockVision V2 API is running"
}
```

---

# Swagger API Documentation

Swagger documentation is available at:

```text
http://localhost:5000/api-docs/
```

The Swagger interface provides documentation for the available REST APIs.

---

# Authentication

StockVision V2 uses **JWT authentication**.

Authentication flow:

```text
Register
   │
   ▼
Password hashed using bcrypt
   │
   ▼
User stored in MySQL
   │
   ▼
Login
   │
   ▼
JWT generated
   │
   ▼
JWT sent with protected requests
```

Protected APIs require a valid JWT.

The system also supports role-based access control.

Roles include:

```text
SUPPLIER
SHOP
```

Role middleware prevents users from accessing APIs that belong to another role.

---

# Supplier Workflow

Suppliers can manage their products and inventory.

Typical workflow:

```text
Supplier Login
      │
      ▼
Create Product
      │
      ▼
View Products
      │
      ▼
Update Stock
      │
      ├──────────────► MySQL
      │
      ├──────────────► Stock History
      │
      ├──────────────► Redis Cache Invalidation
      │
      └──────────────► Kafka Event
```

Supplier functionality includes:

- Create products
- List products
- Get product details
- Update stock
- Track stock history through backend inventory records

---

# Stock Management

Stock updates are persisted in MySQL.

Stock history is maintained so inventory changes can be tracked.

When stock changes:

```text
Stock Update
     │
     ├── MySQL update
     │
     ├── Stock history entry
     │
     ├── Redis cache invalidation
     │
     └── Kafka event
```

Kafka events include:

```text
inventory.stock.updated
inventory.stock.depleted
```

---

# Shop Workflow

Shops can browse suppliers and products.

Typical flow:

```text
Shop Login
    │
    ▼
Browse Suppliers
    │
    ▼
Browse Supplier Products
    │
    ▼
Create Order
```

The supplier/product browsing flow can use Redis caching to reduce repeated database reads.

---

# Redis Caching

Redis is used to cache supplier product lists.

Example flow:

```text
Shop requests supplier products
             │
             ▼
       Check Redis
        /       \\
      HIT       MISS
       │          │
       ▼          ▼
   Return      Query MySQL
   cached          │
   data            ▼
               Store in Redis
                   │
                   ▼
               Return data
```

When supplier stock changes, the related cache is invalidated.

This prevents stale supplier product information from remaining in the cache.

Redis runs on:

```text
localhost:6379
```

Inside Docker:

```text
redis:6379
```

---

# Order Processing

Order creation uses a database transaction.

The main goal is to prevent multiple concurrent orders from incorrectly consuming the same inventory.

Order flow:

```text
Shop creates order
       │
       ▼
Begin MySQL transaction
       │
       ▼
Lock product stock row
       │
       ▼
Check available stock
       │
       ├── Insufficient
       │       │
       │       ▼
       │     Rollback
       │
       └── Available
               │
               ▼
          Deduct stock
               │
               ▼
          Create order
               │
               ▼
        Create order items
               │
               ▼
            Commit
               │
               ▼
        Publish Kafka event
```

Row-level locking ensures that concurrent orders are handled safely.

For example:

```text
Available stock = 5

Order A requests = 4
Order B requests = 4
```

Only one order can successfully consume the available stock.

The other order receives an insufficient-stock response.

This behavior was verified during integration testing.

---

# Order Status

Orders support controlled status transitions.

Invalid order status transitions are rejected by the API.

A successful order status change also produces a Kafka event:

```text
order.status.updated
```

---

# Kafka Event Architecture

Apache Kafka is used for asynchronous event communication.

Kafka runs on:

```text
Docker:
kafka:9092

Host:
localhost:29092
```

The application uses KafkaJS.

Configured topics include:

```text
inventory.stock.updated
inventory.stock.depleted
order.created
order.status.updated
```

---

# Kafka Producer

The API publishes events when important business operations occur.

Examples:

```text
Stock updated
      │
      ▼
inventory.stock.updated
```

```text
Stock reaches depleted state
      │
      ▼
inventory.stock.depleted
```

```text
Order created
      │
      ▼
order.created
```

```text
Order status updated
      │
      ▼
order.status.updated
```

---

# Kafka Consumer

The Kafka consumer listens to the application topics.

```text
Kafka
  │
  ├── inventory.stock.updated
  ├── inventory.stock.depleted
  ├── order.created
  └── order.status.updated
             │
             ▼
       Kafka Consumer
             │
             ▼
       WebSocket Server
```

Relevant events are then broadcast to connected WebSocket clients.

---

# WebSocket Real-Time Updates

StockVision V2 provides a WebSocket endpoint:

```text
ws://localhost:5000/ws/inventory
```

WebSocket clients authenticate using a JWT.

The WebSocket workflow is:

```text
Shop Client
    │
    │ Connect
    ▼
WebSocket Server
    │
    │ Authenticate
    ▼
JWT Validation
    │
    ▼
Shop Authorization
    │
    ▼
Subscribe to Supplier
```

A shop can subscribe to supplier inventory updates.

When supplier stock changes:

```text
Supplier updates stock
        │
        ▼
       MySQL
        │
        ▼
      Kafka
        │
        ▼
 Kafka Consumer
        │
        ▼
   WebSocket Server
        │
        ▼
Subscribed Shop
```

The client can also unsubscribe from a supplier.

---

# WebSocket Security

WebSocket connections require authentication.

The server validates:

- JWT
- User identity
- User role
- Supplier existence
- Supplier active status

Only authorized shop clients can subscribe to supplier inventory updates.

---

# Error Handling

The application uses centralized error handling.

Examples of handled errors include:

```text
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
```

Examples tested include:

```text
Invalid JWT
Unauthorized role
Invalid product
Insufficient stock
Invalid order status transition
```

---

# Validation

Request validation is implemented using Joi.

Invalid request data is rejected before reaching the relevant business logic.

This helps keep controllers and services focused on application behavior.

---

# Testing

The project uses:

- Jest
- Supertest

Run the complete test suite:

```bash
npm test -- --runInBand
```

Current verified result:

```text
Test Suites: 8 passed, 8 total
Tests:       24 passed, 24 total
Snapshots:   0 total
```

All 24 tests are currently passing.

---

# Test Environment

Jest uses:

```text
tests/jest-env.js
```

The test environment configures the Kafka broker for host-side testing:

```text
localhost:29092
```

This is different from the Docker API environment, where Kafka is reached using:

```text
kafka:9092
```

The environment can also be overridden using:

```text
JEST_KAFKA_BROKER
```

---

# Docker Services

The Docker Compose stack contains four services.

## MySQL

```text
Image: mysql:8.4
Port: 3306
Container: stockvision-mysql
```

## Redis

```text
Image: redis:7
Port: 6379
Container: stockvision-redis
```

## Kafka

```text
Image: apache/kafka:4.2.2
Ports: 9092, 29092
Container: stockvision-kafka
```

## API

```text
Port: 5000
Container: stockvision-api
```

---

# Verified System Status

The current implementation has been verified across the main application components.

| Component | Status |
|---|---|
| Express API | PASS |
| MySQL | PASS |
| Redis | PASS |
| Kafka | PASS |
| Authentication | PASS |
| Supplier workflow | PASS |
| Shop workflow | PASS |
| Order workflow | PASS |
| Kafka events | PASS |
| WebSocket | PASS |
| Concurrent order handling | PASS |
| Error handling | PASS |
| Jest tests | PASS |
| Docker services | PASS |
| Swagger | PASS |

---

# Concurrency Verification

Concurrent order handling was tested using a stock quantity of:

```text
5
```

Two simultaneous orders attempted to purchase:

```text
4 units
```

each.

Expected and verified behavior:

```text
Order A → Success
Order B → Insufficient Stock

Remaining stock → 1
```

This confirms that the database transaction and row-level locking prevent overselling.

---

# API Development

For local development without Docker, make sure MySQL, Redis, and Kafka are available and the appropriate `.env` configuration is present.

Start the API:

```bash
npm start
```

For development environments where a development script is configured:

```bash
npm run dev
```

---

# Useful Commands

## Install dependencies

```bash
npm install
```

## Start API

```bash
npm start
```

## Run tests

```bash
npm test -- --runInBand
```

## Start Docker

```bash
docker compose up -d
```

## Stop Docker

```bash
docker compose down
```

## Check Docker services

```bash
docker compose ps
```

## View API logs

```bash
docker compose logs api
```

## View Kafka logs

```bash
docker compose logs kafka
```

## Check API health

```bash
curl http://localhost:5000/health
```

---

# Git Workflow

The project is maintained using Git.

Current main branch:

```text
master
```

Repository:

```text
https://github.com/yogi0205/StockVision-V2
```

Latest verified implementation commit:

```text
7938568
```

Commit message:

```text
Fix order inventory realtime event
```

---

# Security Notes

The following files contain environment-specific configuration and should not be committed:

```text
.env
.env.docker
```

The `.gitignore` file excludes:

```text
node_modules/
.env
.env.docker
coverage/
*.log
.vscode/
Dockerfile.txt
```

Secrets such as database passwords and JWT secrets should be replaced with secure values when deploying outside a local development environment.

---

# Future Improvements

Potential future improvements include:

- Production Kafka cluster configuration
- Kafka schema management
- Refresh-token authentication
- API rate limiting
- Advanced monitoring and metrics
- Distributed tracing
- Production deployment configuration
- CI/CD pipeline
- Automated database migrations
- More extensive integration and load testing

---

# Project Status

StockVision V2 currently provides a complete real-time inventory and order management platform with:

```text
React Shop Dashboard
   +
React Supplier Dashboard
   +
REST API
   +
MySQL
   +
Redis
   +
Kafka
   +
WebSockets
   +
Docker
   +
Automated Testing
```

The current test suite passes:

```text
8 Test Suites
24 Tests
0 Failures
```

---

## License

This project is intended for development and demonstration purposes.
