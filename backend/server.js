const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const WEB_ROOT = fs.existsSync(path.join(ROOT, 'dist'))
  ? path.join(ROOT, 'dist')
  : ROOT;

const PORT = Number(process.env.PORT || 3000);

// Fixed practice prices. These are not live exchange prices.
const DEMO_ASSETS = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 67482.3,
    change: 2.41,
    icon: '₿',
    className: 'btc',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    price: 3524.18,
    change: 1.82,
    icon: '◆',
    className: 'eth',
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    price: 184.62,
    change: 5.36,
    icon: '◎',
    className: 'sol',
  },
  {
    symbol: 'ADA',
    name: 'Cardano',
    price: 0.4821,
    change: -0.76,
    icon: '◉',
    className: 'ada',
  },
  {
    symbol: 'XRP',
    name: 'XRP',
    price: 0.6245,
    change: 0.93,
    icon: '✕',
    className: 'xrp',
  },
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    price: 0.1642,
    change: -1.24,
    icon: 'Ð',
    className: 'doge',
  },
];

const assets = DEMO_ASSETS.map((asset) => ({ ...asset }));

// All account funds and transactions are virtual and stored in memory.
const account = {
  cash: 10000,
  positions: {},
  orders: [],
};

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function send(res, status, payload, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...headers,
  });

  res.end(JSON.stringify(payload));
}

function snapshot() {
  return {
    cash: account.cash,
    positions: { ...account.positions },
    orders: [...account.orders],
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;

      if (body.length > 10000) {
        reject(new Error('Request body is too large.'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON request body.'));
      }
    });

    req.on('error', reject);
  });
}

function serveStatic(urlPath, res) {
  let requestedPath;

  try {
    requestedPath = decodeURIComponent(urlPath);
  } catch {
    res.writeHead(400);
    res.end('Invalid URL.');
    return;
  }

  if (requestedPath === '/') {
    requestedPath = '/index.html';
  }

  const filePath = path.resolve(WEB_ROOT, `.${requestedPath}`);

  // Prevent requests from escaping the public web directory.
  if (filePath !== WEB_ROOT && !filePath.startsWith(`${WEB_ROOT}${path.sep}`)) {
    res.writeHead(403);
    res.end('Forbidden.');
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end('Page or file not found.');
      return;
    }

    const contentType =
      contentTypes[path.extname(filePath).toLowerCase()] ||
      'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
    });

    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // Return fixed demo prices without contacting an external service.
  if (url.pathname === '/api/market' && req.method === 'GET') {
    return send(res, 200, {
      assets,
      updatedAt: 'demo',
      stale: false,
      demo: true,
    });
  }

  if (url.pathname === '/api/account' && req.method === 'GET') {
    return send(res, 200, snapshot());
  }

  if (url.pathname === '/api/orders' && req.method === 'POST') {
    let body;

    try {
      body = await readBody(req);
    } catch (error) {
      return send(res, 400, { error: error.message });
    }

    const { side, symbol } = body;
    const usdAmount = Number(body.usdAmount);
    const asset = assets.find((item) => item.symbol === symbol);

    if (!['buy', 'sell'].includes(side)) {
      return send(res, 400, {
        error: 'Choose buy or sell to place an order.',
      });
    }

    if (!asset || asset.price <= 0) {
      return send(res, 400, {
        error: 'Choose a valid cryptocurrency.',
      });
    }

    if (!Number.isFinite(usdAmount) || usdAmount < 1) {
      return send(res, 400, {
        error: 'Order amount must be at least $1.00.',
      });
    }

    const quantity = usdAmount / asset.price;
    const owned = account.positions[symbol] || 0;

    if (side === 'buy' && usdAmount > account.cash) {
      return send(res, 400, {
        error: `Insufficient demo balance. You have ${new Intl.NumberFormat(
          'en-US',
          {
            style: 'currency',
            currency: 'USD',
          },
        ).format(account.cash)} available.`,
      });
    }

    if (side === 'sell' && quantity > owned) {
      return send(res, 400, {
        error: `Not enough ${symbol} in your demo portfolio to sell that amount.`,
      });
    }

    if (side === 'buy') {
      account.cash -= usdAmount;
      account.positions[symbol] = owned + quantity;
    } else {
      account.cash += usdAmount;
      account.positions[symbol] = owned - quantity;
    }

    const order = {
      id: crypto.randomUUID(),
      side,
      symbol,
      usdAmount,
      quantity,
      price: asset.price,
      createdAt: new Date().toISOString(),
    };

    account.orders.unshift(order);
    account.orders = account.orders.slice(0, 30);

    return send(res, 201, {
      message: `${side === 'buy' ? 'Bought' : 'Sold'} ${quantity.toFixed(
        6,
      )} ${symbol} in demo mode.`,
      order,
      account: snapshot(),
    });
  }

  if (url.pathname === '/api/orders' && req.method === 'DELETE') {
    account.orders = [];
    return send(res, 200, snapshot());
  }

  if (url.pathname === '/api/wallet' && req.method === 'POST') {
    let body;

    try {
      body = await readBody(req);
    } catch (error) {
      return send(res, 400, { error: error.message });
    }

    const { action } = body;
    const usdAmount = Number(body.usdAmount);

    if (!['deposit', 'withdraw'].includes(action)) {
      return send(res, 400, {
        error: 'Choose add demo funds or withdraw demo funds.',
      });
    }

    if (!Number.isFinite(usdAmount) || usdAmount < 1) {
      return send(res, 400, {
        error: 'Amount must be at least $1.00.',
      });
    }

    if (action === 'withdraw' && usdAmount > account.cash) {
      return send(res, 400, {
        error: `Insufficient demo cash. You have ${new Intl.NumberFormat(
          'en-US',
          {
            style: 'currency',
            currency: 'USD',
          },
        ).format(account.cash)} available.`,
      });
    }

    account.cash += action === 'deposit' ? usdAmount : -usdAmount;

    const order = {
      id: crypto.randomUUID(),
      kind: 'wallet',
      side: action,
      symbol: 'USD',
      usdAmount,
      quantity: usdAmount,
      price: null,
      createdAt: new Date().toISOString(),
    };

    account.orders.unshift(order);
    account.orders = account.orders.slice(0, 50);

    return send(res, 201, {
      message:
        action === 'deposit'
          ? `Added ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(usdAmount)} in demo funds.`
          : `Withdrew ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(usdAmount)} from demo funds.`,
      order,
      account: snapshot(),
    });
  }

  if (url.pathname.startsWith('/api/')) {
    return send(res, 404, { error: 'API route not found.' });
  }

  serveStatic(url.pathname, res);
});

server.listen(PORT, () => {
  console.log(`Cryptora demo is running at http://localhost:${PORT}`);
  console.log(
    'Market prices are fixed demo values. No CoinGecko requests are made.',
  );
});
