# StockVision Shop Portal

A responsive React/Vite frontend for shop accounts using the existing StockVision V2 Express API.

## Run locally

1. Start the StockVision backend on port `5000`.
2. From this directory, install dependencies and start Vite:

   ```sh
   npm install
   npm run dev
   ```

   Vite forwards `/auth`, `/shops`, `/orders`, and `/ws` to `http://localhost:5000`, so the browser uses the same origin for API and WebSocket requests. Set `VITE_API_PROXY_TARGET` in `.env.local` if the backend listens elsewhere.
3. Open the local URL printed by Vite and sign in with an existing `SHOP` account.

For a deployed frontend, set `VITE_API_URL` to the API origin served through a same-origin reverse proxy, or to an API host configured to allow the frontend origin. Set `VITE_WS_URL` if the WebSocket endpoint is hosted at a different URL. The WebSocket URL defaults to `/ws/inventory` on the frontend origin.

Copy `.env.example` to `.env.local` to customize the local backend target.

## Features

- Shop-only login with profile verification through `/auth/me`; the JWT is kept in tab-scoped `sessionStorage`.
- Supplier directory and supplier product catalog, with supplier inventory changes delivered by authenticated WebSocket subscription.
- Single-supplier cart, quantity controls, order placement, order list and order details.
- Order status refresh on demand and every 30 seconds while viewing the order list.
- The dashboard profile displays the name, email, and role returned by the backend. The current API does not expose the shop profile's `shop_name` through `/auth/me`.
- Amounts are shown without a currency symbol because the API does not provide a currency code.

## Backend endpoints used

| Method | Path | Use |
|---|---|---|
| `POST` | `/auth/login` | Shop login |
| `GET` | `/auth/me` | Verify token and retrieve the current user |
| `GET` | `/shops/suppliers` | List active suppliers |
| `GET` | `/shops/suppliers/:supplierId/products` | Read a supplier's active products |
| `POST` | `/orders` | Place an order |
| `GET` | `/orders` | List the shop's orders |
| `GET` | `/orders/:id` | Read order details and items |

Inventory uses `ws(s)://<backend-host>/ws/inventory`. After connecting, the frontend sends `{"type":"auth","token":"<JWT>"}` and, after `auth.success`, subscribes using `{"type":"subscribe.supplier","supplierId":123}`. It sends `unsubscribe.supplier` when changing supplier or leaving the page.

## Scripts

- `npm run dev` — start the development server.
- `npm run build` — create the production bundle in `dist/`.
- `npm run preview` — preview a production build.
- `npm run lint` — lint the frontend source.
