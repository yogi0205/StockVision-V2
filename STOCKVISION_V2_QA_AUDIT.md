# StockVision-V2 QA Audit

**Audit date:** 2026-10-05  
**Scope:** Read-only inspection of the backend, schema, test suite, and container configuration. No source files, database contents, or deployment settings were changed. This report is the only requested file created.

## Executive summary

The repository contains a compact Express API backed by MySQL, Redis, Kafka, and WebSockets, with Jest/Supertest integration tests. Source inspection confirms transaction-based order creation and cancellation, row locking, role-scoped queries, and a basic event-driven inventory flow.

The test suite could not be executed in this environment: the available PowerShell runner failed to start. In addition, the tests connect to external MySQL, Redis, and Kafka services, retain fixture records, and create/drop a MySQL trigger; the existing ignored `.env` configuration could not be safely verified as a disposable test target. Therefore **no scenario is reported as PASS or FAIL**. Source/test inspection is not a substitute for execution.

Important issues found by inspection include stale cached inventory after order creation/cancellation, database commits that can succeed while a subsequent Kafka publish fails and produces an HTTP error, authenticated JWTs that are not revalidated against account activity, and unsafe deployment defaults. Runtime behavior and exploitability remain unconfirmed.

## Architecture summary

- **HTTP API:** Node.js / Express 5 application, with authentication, supplier, shop, and order routes; Joi validation; centralized error handling; health and Swagger endpoints.
- **Persistence:** MySQL tables for users, supplier/shop profiles, products, orders, order items, and stock history. Product and order workflows use transactions; order and stock row changes use `FOR UPDATE`.
- **Authentication/authorization:** bcrypt password hashes and JWT bearer tokens; role middleware gates supplier/shop routes.
- **Caching:** Redis caches supplier product responses for 60 seconds, keyed by supplier. Manual supplier stock changes invalidate that key.
- **Events/realtime:** Kafka producer publishes inventory and order topics. A Kafka consumer forwards relevant events through `/ws/inventory` to authenticated shop subscriptions.
- **Tests:** Eight Jest/Supertest test files. Test setup connects to Redis, Kafka, and a MySQL pool. Several tests create persistent fixture records; an order rollback test creates and drops a trigger.
- **Deployment:** Docker Compose defines MySQL, Redis, Kafka, and API services. The MySQL schema is present under `database/`; Compose does not mount it as an initialization script or define an explicit migration step.

## Test results

| Item | Result |
|---|---|
| Existing Jest/Supertest suite | **BLOCKED — not run** |
| Suites discovered by inspection | 8 |
| Test cases discovered by inspection | 32 |
| Passed / failed at runtime | 0 / 0 (no test process ran) |
| Execution blocker | PowerShell was unavailable; the available runner could not start. |
| Safety consideration | Tests use external services and mutate the configured database. `tests/order.test.js` creates and drops a MySQL trigger. The ignored `.env` target was not inspected, so it could not be established that the configured database is disposable. |

The 32-case estimate is a static count of test declarations, not a Jest result. No test command completed, and no database or infrastructure command was run.

## Scenario-by-scenario results

Statuses use the requested meanings: **PASS/FAIL** require actual execution; **CODE VERIFIED** means confirmed by source/test inspection only; **BLOCKED** means a local runtime test could not be performed.

| # | Scenario | Result | Evidence / limitation |
|---:|---|---|---|
| 1 | Authentication and JWT | **CODE VERIFIED** | Registration, login, password hashing, JWT issuance and bearer verification are implemented. Tests cover the happy path only; invalid/expired tokens, duplicate accounts, inactive accounts, and JWT configuration failure are not exercised. |
| 2 | Supplier/shop role authorization and isolation | **CODE VERIFIED** | Role middleware and ownership-scoped service queries are present. Tests cover supplier order isolation and rejection of shop status changes, but not shop-to-shop order isolation or the full role matrix. |
| 3 | Product creation and stock updates | **CODE VERIFIED** | Supplier ownership is checked; product creation and manual stock changes write stock history. Product tests cover creation/list/update happy paths in source, but were not run. |
| 4 | Order creation | **CODE VERIFIED** | Product ownership/activity, stock, fixed unit prices, total calculation, order items, and stock changes are handled in a transaction. An order creation test exists but was not run. |
| 5 | Insufficient stock | **CODE VERIFIED** | The service rejects insufficient stock with HTTP 409 before commit. A realtime test contains a failed-order/no-event assertion; it was not run. |
| 6 | Transaction rollback | **CODE VERIFIED** | The service rolls back on pre-commit errors. A test forces cancellation-history insertion failure with a temporary trigger and asserts order/stock/history rollback; it was not run. |
| 7 | Concurrent orders and overselling | **CODE VERIFIED** | Product rows are locked in sorted ID order and stock is checked while locked. No test actually issues concurrent order requests, despite the README describing concurrent behavior as verified. |
| 8 | Order status transitions | **CODE VERIFIED** | The service implements a state-transition map and rejects invalid transitions. Tests contain confirmation and invalid-transition cases; no complete transition matrix was executed. |
| 9 | Order cancellation | **CODE VERIFIED** | Cancellation is allowed from PENDING and CONFIRMED; repeated cancellation and cancellation after COMPLETED are rejected. Source tests cover these cases but were not run. |
| 10 | Stock restoration after cancellation | **CODE VERIFIED** | Cancellation restores ordered quantities under row locks within the status transaction. Tests contain pending/confirmed cancellation assertions; runtime behavior remains unverified. |
| 11 | `ORDER_CANCELLED` stock history | **CODE VERIFIED** | Cancellation inserts a history row with the prior/new stock and `ORDER_CANCELLED`; the rollback test checks failure does not leave such rows. Neither test was run. |
| 12 | Kafka inventory/order events | **BLOCKED** | Source defines the producer topics and tests contain producer-spy assertions; WebSocket integration tests require a real Kafka broker. No broker-backed test ran. Publish failure handling is a code-inspection issue (see SV-2). |
| 13 | WebSocket inventory updates | **BLOCKED** | Authentication, shop-role enforcement, supplier subscription, and broadcast wiring are present, with real-broker integration tests. No WebSocket/Kafka test ran. |
| 14 | Redis caching and invalidation | **CODE VERIFIED** | Supplier product results are cached with a 60-second TTL. Manual stock updates invalidate the cache, but order stock deductions and cancellation restorations do not. No Redis-backed test ran. |
| 15 | API validation and error handling | **CODE VERIFIED** | Joi validators and global JSON/CORS/error handling are present. Existing tests do not meaningfully exercise malformed inputs, validation boundaries, or the error-handler matrix; suite execution was blocked. |
| 16 | Swagger/API documentation | **CODE VERIFIED** | Swagger UI route and OpenAPI definitions exist; a UI-serving test is present but not run. Product creation’s response does not meet the documented required timestamps (SV-7). |
| 17 | Security issues | **CODE VERIFIED** | Inspection found static deployment credentials, disabled MySQL certificate verification when TLS is enabled, and no account-activity recheck for existing JWTs. No dynamic security testing was performed. |
| 18 | Database/index/query issues | **CODE VERIFIED** | Schema constraints and basic indexes are present; SQL values are generally parameterized. No query-plan, load, migration, or live-schema tests were run. DECIMAL response types are inconsistent with the OpenAPI number schemas (SV-7). |
| 19 | Docker/deployment configuration | **CODE VERIFIED** | Compose and Dockerfile were inspected. Static secrets, absent health checks/schema initialization, and absent `.dockerignore` are noted under SV-4–SV-6. No image build or deployment was run. |

## Bugs / issues found

Severity reflects likely impact if the affected flow/configuration is used. All findings are inspection-only, not runtime-confirmed.

| ID | Severity | Finding | Impact |
|---|---|---|---|
| SV-1 | High | **Order mutations leave supplier-product Redis cache stale.** Order creation deducts stock and cancellation restores stock in MySQL, but neither path invalidates `supplier:<id>:products`. Only manual stock update invalidates it. | Shop browsing can show old availability/quantities for up to the cache TTL; users can be shown stock that is no longer available or miss restored stock. |
| SV-2 | High | **Kafka publishing occurs after the database commit without an outbox/retry boundary.** A producer error is returned as an HTTP 500 after the order/stock/status is already committed. Similar commit-then-publish behavior exists for manual stock updates. | Clients may retry a successful-but-reported-failed mutation, creating duplicate orders or leaving consumers without an event. |
| SV-3 | High | **Existing JWTs are not checked against current account activity.** REST authentication trusts token claims without loading the user; WebSocket auth does likewise. Login and `/auth/me` check activity, but later deactivation does not revoke an already issued token. | A disabled account can continue using an unexpired token to access protected routes and potentially keep a WebSocket session. |
| SV-4 | High (conditional) | **Deployment configuration contains shared default credentials/secrets.** Compose uses a fixed MySQL root password, and `.env.docker` contains a fixed JWT secret marked for change. The Dockerfile copies the entire build context and no `.dockerignore` was found; `.env.docker` is not excluded from that copy. | If these defaults are used or the image is distributed, database access and token forgery may be possible; copied configuration can expose the values in the image. |
| SV-5 | Medium | **MySQL TLS certificate verification is disabled.** When `DB_SSL=true`, the pool sets `rejectUnauthorized: false`. | TLS does not reliably authenticate the database endpoint, enabling interception in deployments that rely on TLS. |
| SV-6 | Medium | **Fresh Compose deployments do not initialize the schema or wait for healthy dependencies.** Compose creates the database but does not mount `database/schema.sql` into MySQL initialization or run migrations; `depends_on` has no health checks. | A newly created database volume has no application tables, and the API may start before dependencies are ready. Startup only tests the connection, not schema readiness. |
| SV-7 | Medium | **Response values and Swagger schemas are inconsistent.** Create-product responses omit `created_at` and `updated_at`, which Swagger marks required. Product list queries return MySQL DECIMAL columns without normalization while OpenAPI declares numeric values; `mysql2` normally exposes DECIMAL values as strings absent `decimalNumbers`. | Clients relying on the documented schema may reject responses or need inconsistent parsing between create and list endpoints. |
| SV-8 | Low | **No concurrent-order test exists despite the README’s verification claim.** Row-lock logic is present, but test sources contain no simultaneous order requests. | Regressions in locking/isolation behavior could pass the current test suite; the documented verification claim is stronger than the checked-in evidence. |
| SV-9 | Medium | **Local browser dashboard origins are not in the CORS allowlist.** The allowlist contains the two hosted dashboard origins; requests with another browser `Origin` are rejected. | Local dashboard development on a different origin cannot call the API unless the allowlist is adjusted. Requests without an Origin are allowed, but browsers send one. |

## Missing tests

- Run all eight suites against a verified disposable MySQL/Redis/Kafka environment and record actual Jest output.
- Concurrent orders competing for the final available units, including repeated product IDs and multi-product lock ordering.
- Cache contents after order deduction and cancellation restoration; verify both updated and depleted stock behavior.
- Kafka publish failure after commit, duplicate/retry behavior, and event delivery guarantees.
- REST and WebSocket access after account deactivation, token expiry, malformed claims, and role changes.
- Full authentication and authorization matrix, including cross-shop order access and supplier product ownership.
- Validation/error boundary tests: malformed JSON, unknown fields, unsafe/oversized numeric values, duplicate email races, missing JWT configuration, and rejected CORS origins.
- Full order-transition matrix, stock/history assertions for every cancellation state, and rollback failures across order creation/status updates.
- Redis outage behavior and cache expiration/invalidation.
- API response contract tests comparing representative payloads against OpenAPI schemas.
- Fresh-volume Compose startup, schema/migration readiness, dependency restart behavior, and production-secret validation.
- Database query-plan/load checks for product/order listing at expected data volumes.

## Recommended fixes

1. Invalidate or update the supplier product cache on every committed stock mutation, including order creation and cancellation; add integration coverage for both directions.
2. Introduce a transactional outbox (or an explicitly durable retry/reconciliation mechanism) for Kafka events so database commits cannot silently diverge from published events.
3. Revalidate account status for REST and WebSocket credentials, and define revocation/role-change behavior for issued tokens.
4. Remove hard-coded deployment secrets, require deployment-provided secrets, enable verified TLS, and add a `.dockerignore` that excludes credentials, certificates where inappropriate, local dependencies, and generated artifacts.
5. Initialize/migrate the schema deterministically and use health checks/readiness conditions for MySQL, Redis, and Kafka before the API starts.
6. Align product response shapes and numeric types with the OpenAPI contract; add response-schema tests.
7. Add true concurrent-order tests and amend the README claim so it matches executable evidence.
8. Allow configured local dashboard origins for development without broadening production CORS.

## Optional enhancements

- Add rate limiting and monitoring for login/register endpoints.
- Add pagination and composite indexes based on observed query plans and expected data volume.
- Add consistent structured logs, correlation IDs, and metrics for transaction and event failures.
- Add an explicit test database configuration guard so integration tests refuse to run against non-test databases.
- Separate liveness and dependency-aware readiness checks.

## Final readiness verdict

**Not ready for production approval based on this audit alone.** Core transaction and ownership patterns are promising, but the suite has not been executed, order-driven cache invalidation is missing, event publication is not atomic with database commits, account deactivation does not revoke active JWT access, and deployment defaults need hardening. Treat the runtime scenarios as unverified until the suite is run in a confirmed disposable environment and the high-severity items are addressed.

## Required summary

- **Total scenarios:** 19
- **Passed:** 0
- **Failed:** 0
- **Blocked:** 2 (Kafka broker-backed checks and WebSocket/Kafka integration; the full Jest run was blocked)
- **Code verified:** 17
- **Critical issues:** 0
- **High issues:** 4 (SV-1 through SV-4; SV-4 is conditional on using/distributing the provided defaults)
- **Medium issues:** 4 (SV-5, SV-6, SV-7, SV-9)
- **Low issues:** 1 (SV-8)

### Top 5 recommended fixes

1. Invalidate supplier product cache after order stock deduction and cancellation restoration.
2. Make event delivery durable across database commits (transactional outbox/retry).
3. Enforce account deactivation/revocation for REST and WebSocket JWT sessions.
4. Remove fixed secrets, verify database TLS certificates, and exclude secrets/artifacts from Docker images.
5. Initialize the schema and gate API startup on healthy dependencies.
