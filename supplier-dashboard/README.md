# StockVision Supplier Dashboard

A responsive React/Vite portal for supplier accounts. It uses the existing StockVision V2 APIs to authenticate supplier users, view and create active products, update stock, and submit supplier order-status transitions.

## Setup and run

1. Start the StockVision backend at `http://localhost:5000`.
2. From this directory, install dependencies:

   ```sh
   npm install
   ```

3. Optional: copy `.env.example` to `.env.local` and set `VITE_API_PROXY_TARGET` if the backend is not at `http://localhost:5000`.
4. Start the dashboard:

   ```sh
   npm run dev
   ```

5. Open the Vite URL and sign in with an existing supplier account.

For production, set `VITE_API_URL` to the API origin (preferably served through a same-origin reverse proxy, or configured with the correct CORS policy).

## Scripts

- `npm run dev` — start the Vite development server.
- `npm run lint` — run ESLint.
- `npm run build` — build the production frontend into `dist/`.
- `npm run preview` — preview the production build.

## Supplier sign-in

The login form calls `POST /auth/login` and accepts only a user whose returned role is `SUPPLIER`. It verifies the token with `GET /auth/me` before saving the JWT in tab-scoped `sessionStorage`. On refresh the token is checked again. Logout removes the token; protected routes redirect to login when there is no valid supplier session.

## Features

- Supplier-only sign-in, session restoration, protected routes, and logout.
- Overview of active products and low-stock products (five units or fewer), calculated from the supplier product response.
- Active product catalog with price, unit, stock, creation/update details where provided.
- Create products and update stock through the existing supplier APIs.
- Profile displays the user data returned by `/auth/me`.
- Order-status updates by order ID with server-side ownership and transition validation.
- Responsive layouts, loading indicators, empty states, and API/network error feedback.

## Backend API paths used

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth/login` | Authenticate; the frontend accepts supplier role only |
| `GET` | `/auth/me` | Verify JWT and display available user profile fields |
| `GET` | `/suppliers/products` | List the authenticated supplier's active products |
| `POST` | `/suppliers/products` | Create a product |
| `PATCH` | `/suppliers/products/:id/stock` | Update product stock |
| `PATCH` | `/orders/:id/status` | Update an order status; backend validates ownership and allowed transition |

The Vite development server proxies `/auth`, `/suppliers`, and `/orders` to `VITE_API_PROXY_TARGET`.

## Current backend limitations

- The current API exposes no supplier stock-history read endpoint, so no stock-history page is provided.
- `GET /orders` and `GET /orders/:id` are shop-role-only. The supplier UI therefore does not fabricate supplier order lists, details, counts, shop information, or pending-order metrics. Suppliers can submit a status update when they already know an order ID; the backend enforces valid transitions and ownership.
- `GET /auth/me` returns user fields, but not the supplier company profile/name, phone, or location.
- The supplier products endpoint returns active products only and does not include an explicit active flag.
- The API does not provide a currency code; monetary values are formatted without assuming a currency.
