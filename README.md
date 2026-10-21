# Cryptora

Cryptora is a responsive React cryptocurrency exchange prototype. It includes market browsing and search, a simulated buy/sell flow, virtual wallet deposits and withdrawals, holdings, account activity history, and a membership overview.

## Run locally

1. Install Node.js 18 or newer.
2. Open a terminal in this folder and run `npm install`.
3. Run `npm run dev` and open the local URL printed by Vite.

Vite proxies API calls to `http://localhost:3000`, so in a second terminal run `npm start` to launch the backend. For a production preview, run `npm run build`, then `npm start` and open `http://localhost:3000`.

You can also open `index.html` directly in a browser to see the self-contained showcase screen. Its demo navigation, trade form, wallet controls, and history run locally in the browser. That showcase is separate from the React app, which should be run through Vite as described above.

The backend uses only Node's built-in modules. Balances, holdings, and order history are stored in server memory and reset when the server restarts. Prices are generated demo values and change slightly over time.

## Project files

- `index.html` — React page entry
- `src/main.jsx` — React bootstrap
- `src/App.jsx` — interactive site and page components
- `src/styles.css` — shared theme and component styles
- `src/mediaqueries.css` — tablet and mobile layouts
- `vite.config.js` — React/Vite setup and local API proxy
- `backend/server.js` — simulated market, account, order, and wallet API
- `package.json` — frontend dependencies and run scripts

## Demo API

- `GET /api/market` — demo assets and simulated prices
- `GET /api/account` — virtual cash, positions, and history
- `POST /api/orders` — simulate a buy or sell order
- `DELETE /api/orders` — clear activity history
- `POST /api/wallet` — add or withdraw virtual USD

Payment controls are only demo balance controls. No payment gateway, bank account, blockchain wallet, real exchange, authentication, or real-money transactions are connected. Those require separate provider choices and secure production setup.
