// Lightweight local-file showcase. The React application replaces this view when served by Vite.
(() => {
  const assets = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: 67482.3,
      change: 2.41,
      icon: '₿',
      color: 'btc',
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      price: 3524.18,
      change: 1.82,
      icon: '◆',
      color: 'eth',
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      price: 184.62,
      change: 5.36,
      icon: '◎',
      color: 'sol',
    },
    {
      symbol: 'ADA',
      name: 'Cardano',
      price: 0.4821,
      change: -0.76,
      icon: '◉',
      color: 'ada',
    },
    {
      symbol: 'XRP',
      name: 'XRP',
      price: 0.6245,
      change: 0.93,
      icon: '✕',
      color: 'xrp',
    },
    {
      symbol: 'DOGE',
      name: 'Dogecoin',
      price: 0.1642,
      change: -1.24,
      icon: 'Ð',
      color: 'doge',
    },
  ];
  let state = {
    cash: 10000,
    positions: {},
    orders: [],
    side: 'buy',
    wallet: 'deposit',
  };
  const $ = (selector) => document.querySelector(selector);
  const fmt = (amount, digits = 2) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount || 0);
  const asset = (symbol) =>
    assets.find((item) => item.symbol === symbol) || assets[0];
  const toast = (message) => {
    const box = $('#showcaseToast');
    box.textContent = message;
    box.hidden = false;
    window.setTimeout(() => {
      box.hidden = true;
    }, 3000);
  };

  function paintMarkets(filter = '') {
    const matches = assets.filter((item) =>
      `${item.name} ${item.symbol}`
        .toLowerCase()
        .includes(filter.toLowerCase()),
    );
    document.querySelectorAll('.market-rows').forEach((body) => {
      body.innerHTML = matches
        .map(
          (item) =>
            `<tr><td><div class="coin-cell"><span class="asset-icon ${item.color}">${item.icon}</span><div><strong>${item.name}</strong><small>${item.symbol}</small></div></div></td><td class="strong-cell">${fmt(item.price, item.price < 1 ? 4 : 2)}</td><td class="${item.change >= 0 ? 'up' : 'down'}">${item.change >= 0 ? '+' : ''}${item.change.toFixed(2)}%</td><td><button class="small-action" data-trade-asset="${item.symbol}">Trade</button></td></tr>`,
        )
        .join('');
    });
  }
  function paint() {
    const total =
      state.cash +
      Object.entries(state.positions).reduce(
        (sum, [symbol, quantity]) => sum + quantity * asset(symbol).price,
        0,
      );
    const cash = fmt(state.cash);
    const totalText = fmt(total);
    $('#totalBalance').innerHTML = `${totalText} <small>USD</small>`;
    $('#cashBalance').textContent = cash;
    $('#walletCash').textContent = cash;
    $('#walletTotal').textContent = totalText;
    $('#cashPercent').textContent =
      `${total ? Math.round((state.cash / total) * 100) : 0}%`;
    $('#allocationBar').style.width =
      `${total ? (state.cash / total) * 100 : 0}%`;
    const positions = Object.entries(state.positions).filter(
      ([, quantity]) => quantity > 0.00000001,
    );
    $('#positionCount').textContent = String(positions.length);
    $('#positionText').textContent = positions.length
      ? positions.map(([symbol]) => symbol).join(' · ')
      : 'Your positions will appear here';
    $('#cryptoValue').textContent = fmt(total - state.cash);
    $('#holdings').innerHTML = positions.length
      ? positions
          .map(
            ([symbol, quantity]) =>
              `<div class="holding-row"><span class="coin-cell"><span class="asset-icon ${asset(symbol).color}">${asset(symbol).icon}</span><span><strong>${asset(symbol).name}</strong><small>${quantity.toFixed(6)} ${symbol}</small></span></span><strong>${fmt(quantity * asset(symbol).price)}</strong></div>`,
          )
          .join('')
      : '<span>◉</span><strong>No crypto holdings yet</strong><p>Make a demo trade and your holdings will appear here.</p>';
    const rows = state.orders
      .map(
        (order) =>
          `<tr><td><span class="type-chip ${order.side}">${order.side}</span></td><td><strong>${order.symbol}</strong>${order.quantity ? `<small> · ${order.quantity.toFixed(6)} ${order.symbol}</small>` : ''}</td><td>${fmt(order.amount)}</td><td>${order.price ? fmt(order.price, order.price < 1 ? 4 : 2) : '—'}</td><td>${new Date(order.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td><td><span class="complete-chip">Completed</span></td></tr>`,
      )
      .join('');
    $('#historyRows').innerHTML = rows;
    $('#historyCount').textContent = `${state.orders.length} records`;
    $('#historyEmpty').hidden = state.orders.length > 0;
    $('#recentActivity').innerHTML = state.orders.length
      ? `<div class="table-scroll"><table class="data-table activity-table"><thead><tr><th>TYPE</th><th>DETAIL</th><th>AMOUNT</th><th>STATUS</th></tr></thead><tbody>${state.orders
          .slice(0, 3)
          .map(
            (order) =>
              `<tr><td><span class="type-chip ${order.side}">${order.side}</span></td><td>${order.symbol}</td><td>${fmt(order.amount)}</td><td><span class="complete-chip">Completed</span></td></tr>`,
          )
          .join('')}</tbody></table></div>`
      : '<span>◷</span><strong>No activity yet</strong><p>Your demo orders and wallet movements will appear here.</p>';
    $('#tradeCount').textContent = String(
      state.orders.filter((order) => order.kind === 'trade').length,
    );
    updateEstimate();
  }
  function updateEstimate() {
    const symbol = $('#tradeCoin').value;
    const item = asset(symbol);
    const amount = Number($('#tradeAmount').value || 0);
    $('#orderPrice').textContent = fmt(item.price, item.price < 1 ? 4 : 2);
    $('#orderQuantity').textContent =
      amount > 0 ? `${(amount / item.price).toFixed(6)} ${symbol}` : '—';
    $('#placeOrder').innerHTML =
      `${state.side === 'buy' ? 'Buy' : 'Sell'} ${symbol} →`;
  }
  function go(page) {
    document
      .querySelectorAll('.static-page')
      .forEach((section) =>
        section.classList.toggle('hidden', section.dataset.page !== page),
      );
    document
      .querySelectorAll('.nav-item[data-go]')
      .forEach((button) =>
        button.classList.toggle('active', button.dataset.go === page),
      );
    $('#showcaseCrumb').textContent =
      page.charAt(0).toUpperCase() + page.slice(1);
    $('#showcaseSidebar').classList.remove('open');
    window.scrollTo(0, 0);
  }

  document.addEventListener('click', (event) => {
    const nav = event.target.closest('[data-go]');
    if (nav) {
      event.preventDefault();
      go(nav.dataset.go);
    }
    const quickAmount = event.target.closest('[data-amount]');
    if (quickAmount) {
      $('#tradeAmount').value = quickAmount.dataset.amount;
      updateEstimate();
    }
    const tradeButton = event.target.closest('[data-trade-asset]');
    if (tradeButton) {
      $('#tradeCoin').value = tradeButton.dataset.tradeAsset;
      updateEstimate();
      go('overview');
    }
    const side = event.target.closest('[data-side]');
    if (side) {
      state.side = side.dataset.side;
      document
        .querySelectorAll('[data-side]')
        .forEach((button) =>
          button.classList.toggle(
            'selected',
            button.dataset.side === state.side,
          ),
        );
      updateEstimate();
    }
    const wallet = event.target.closest('[data-wallet]');
    if (wallet) {
      state.wallet = wallet.dataset.wallet;
      document
        .querySelectorAll('[data-wallet]')
        .forEach((button) =>
          button.classList.toggle(
            'selected',
            button.dataset.wallet === state.wallet,
          ),
        );
      $('#walletSubmit').textContent =
        state.wallet === 'deposit'
          ? 'Add demo funds →'
          : 'Withdraw demo funds →';
    }
    const walletAmount = event.target.closest('[data-wallet-amount]');
    if (walletAmount)
      $('#walletAmount').value = walletAmount.dataset.walletAmount;
    if (event.target.closest('#showcaseMenu'))
      $('#showcaseSidebar').classList.toggle('open');
    if (event.target.closest('#clearHistory')) {
      state.orders = [];
      paint();
      toast('Demo history cleared.');
    }
  });
  document.addEventListener('input', (event) => {
    if (event.target.id === 'marketSearch') paintMarkets(event.target.value);
    if (event.target.id === 'tradeAmount' || event.target.id === 'tradeCoin')
      updateEstimate();
  });
  $('#tradeForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const amount = Number($('#tradeAmount').value);
    const symbol = $('#tradeCoin').value;
    const quantity = amount / asset(symbol).price;
    const owned = state.positions[symbol] || 0;
    if (!Number.isFinite(amount) || amount < 1)
      return toast('Enter an amount of at least $1.');
    if (state.side === 'buy' && amount > state.cash)
      return toast('There is not enough demo cash for this order.');
    if (state.side === 'sell' && quantity > owned)
      return toast(`There is not enough ${symbol} in your demo wallet.`);
    state.cash += state.side === 'buy' ? -amount : amount;
    state.positions[symbol] =
      owned + (state.side === 'buy' ? quantity : -quantity);
    state.orders.unshift({
      side: state.side,
      symbol,
      amount,
      quantity,
      price: asset(symbol).price,
      date: new Date().toISOString(),
      kind: 'trade',
    });
    $('#tradeAmount').value = '';
    paint();
    toast(
      `${state.side === 'buy' ? 'Bought' : 'Sold'} ${quantity.toFixed(6)} ${symbol} in demo mode.`,
    );
  });
  $('#walletForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const amount = Number($('#walletAmount').value);
    if (!Number.isFinite(amount) || amount < 1)
      return toast('Enter an amount of at least $1.');
    if (state.wallet === 'withdraw' && amount > state.cash)
      return toast('There is not enough demo cash to withdraw that amount.');
    state.cash += state.wallet === 'deposit' ? amount : -amount;
    state.orders.unshift({
      side: state.wallet,
      symbol: 'USD',
      amount,
      quantity: 0,
      price: null,
      date: new Date().toISOString(),
      kind: 'wallet',
    });
    $('#walletAmount').value = '';
    paint();
    toast(
      `${state.wallet === 'deposit' ? 'Added' : 'Withdrew'} ${fmt(amount)} in demo funds.`,
    );
  });
  $('#chartCoin').addEventListener('change', (event) => {
    const item =
      assets.find((entry) => event.target.value.includes(entry.symbol)) ||
      assets[0];
    $('#chartPrice').innerHTML =
      `${fmt(item.price, item.price < 1 ? 4 : 2)} <span class="${item.change >= 0 ? 'up' : 'down'}">${item.change >= 0 ? '+' : ''}${item.change.toFixed(2)}%</span><small>past 24 hours</small>`;
  });
  paintMarkets();
  paint();
})();
