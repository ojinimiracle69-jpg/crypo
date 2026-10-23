import { useCallback, useEffect, useMemo, useState } from 'react';

// Navigation items displayed in the sidebar.
const NAV = [
  { id: 'overview', label: 'Overview', icon: '⌂' },
  { id: 'markets', label: 'Markets', icon: '⌁' },
  { id: 'trade', label: 'Trade', icon: '⇄' },
  { id: 'wallet', label: 'Wallet', icon: '▣' },
  { id: 'history', label: 'Activity', icon: '◷' },
  { id: 'membership', label: 'Membership', icon: '✦' },
];

const CURRENCY_API = 'https://open.er-api.com/v6/latest/USD';

const CURRENCY_LOCALES = {
  USD: 'en-US',
  NGN: 'en-NG',
  GBP: 'en-GB',
  EUR: 'de-DE',
  JPY: 'ja-JP',
  CNY: 'zh-CN',
  INR: 'en-IN',
  ZAR: 'en-ZA',
};

const CURRENCY_NAMES = {
  USD: 'US Dollar',
  NGN: 'Nigerian Naira',
  GBP: 'British Pound',
  EUR: 'Euro',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
  JPY: 'Japanese Yen',
  CNY: 'Chinese Yuan',
  INR: 'Indian Rupee',
  ZAR: 'South African Rand',
  GHS: 'Ghanaian Cedi',
  KES: 'Kenyan Shilling',
  XAF: 'Central African CFA Franc',
  XOF: 'West African CFA Franc',
  CHF: 'Swiss Franc',
  NZD: 'New Zealand Dollar',
  SGD: 'Singapore Dollar',
  HKD: 'Hong Kong Dollar',
  BRL: 'Brazilian Real',
  MXN: 'Mexican Peso',
  AED: 'UAE Dirham',
  SAR: 'Saudi Riyal',
  EGP: 'Egyptian Pound',
  PKR: 'Pakistani Rupee',
  BDT: 'Bangladeshi Taka',
  TRY: 'Turkish Lira',
  KRW: 'South Korean Won',
  SEK: 'Swedish Krona',
  NOK: 'Norwegian Krone',
  DKK: 'Danish Krone',
};

const currencyNameFormatter = new Intl.DisplayNames(['en'], {
  type: 'currency',
});

function getCurrencyName(code) {
  try {
    return CURRENCY_NAMES[code] || currencyNameFormatter.of(code) || code;
  } catch {
    return code;
  }
}

// Format a value that is already expressed in the selected currency.
function formatCurrency(amount, code) {
  return new Intl.NumberFormat(CURRENCY_LOCALES[code] || 'en-US', {
    style: 'currency',
    currency: code,
  }).format(Number.isFinite(amount) ? amount : 0);
}

// Format activity amounts without shortening millions.
function formatActivityAmount(amount, code, exchangeRates) {
  const value = Number(amount) || 0;
  const convertedValue = value * (exchangeRates[code] || 1);
  const locale = CURRENCY_LOCALES[code] || 'en-US';
  const symbol = getCurrencySymbol(code);

  if (convertedValue >= 1_000_000_000_000) {
    const shortened = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
    }).format(convertedValue / 1_000_000_000_000);

    return `${symbol}${shortened}T`;
  }

  if (convertedValue >= 1_000_000_000) {
    const shortened = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
    }).format(convertedValue / 1_000_000_000);

    return `${symbol}${shortened}B`;
  }

  if (convertedValue >= 1_000_000) {
    const shortened = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
    }).format(convertedValue / 1_000_000);

    return `${symbol}${shortened}M`;
  }

  return formatCurrency(convertedValue, code);
}

// Return the appropriate symbol for the selected display currency.
function getCurrencySymbol(code) {
  try {
    return (
      new Intl.NumberFormat(CURRENCY_LOCALES[code] || 'en-US', {
        style: 'currency',
        currency: code,
        currencyDisplay: 'narrowSymbol',
      })
        .formatToParts(0)
        .find((part) => part.type === 'currency')?.value || code
    );
  } catch {
    return code;
  }
}

// Default market data used before the API returns its data.
const FALLBACK = [
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

// Format transaction dates consistently across screen sizes.
const shortDate = (value) => {
  const date = new Date(value);

  const formattedDate = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = date.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${formattedDate}, ${formattedTime}`;
};

// Return a greeting based on the visitor's local browser time.
function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';

  return 'Good Evening';
}

function getAutomaticTheme() {
  const hour = new Date().getHours();

  // Use light mode from 6 AM to 5:59 PM.
  return hour >= 6 && hour < 18 ? 'light' : 'dark';
}

// Reusable icon for cryptocurrency assets.
function Icon({ children, className = '' }) {
  return <span className={`asset-icon ${className}`}>{children}</span>;
}

// Send requests to the backend and handle unsuccessful responses.
async function api(path, options = {}) {
  const response = await fetch(
    `https://cryptora-backend-fuh1.onrender.com/api${path}`,
    {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Something went wrong.');
  }

  return result;
}

function App() {
  // Control the current page, animation, mobile navigation, and account.
  const validPages = [
    'overview',
    'markets',
    'trade',
    'wallet',
    'history',
    'membership',
  ];

  const [page, setPage] = useState(() => {
    const savedPage = localStorage.getItem('cryptora-current-page');

    return validPages.includes(savedPage) ? savedPage : 'overview';
  });

  useEffect(() => {
    localStorage.setItem('cryptora-current-page', page);
  }, [page]);

  const [pageAnimationKey, setPageAnimationKey] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);

  // Prevent background scrolling while the mobile sidebar is open.
  useEffect(() => {
    if (!mobileMenu) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [mobileMenu]);

  const [assets, setAssets] = useState(FALLBACK);
  const [account, setAccount] = useState({
    cash: 10000,
    positions: {},
    orders: [],
  });

  const [displayCurrency, setDisplayCurrency] = useState(() => {
    return localStorage.getItem('cryptora-display-currency') || 'USD';
  });

  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [chartMenuOpen, setChartMenuOpen] = useState(false);
  const [tradeAssetMenuOpen, setTradeAssetMenuOpen] = useState(false);
  const [exchangeRates, setExchangeRates] = useState({ USD: 1 });
  const [currencyCodes, setCurrencyCodes] = useState(['USD']);

  // Convert USD values into the selected display currency.
  const convertCurrency = (value) =>
    (value || 0) * (exchangeRates[displayCurrency] || 1);

  // Format USD-based monetary values in the selected display currency.
  const fmt = (value, digits = 2) =>
    new Intl.NumberFormat(CURRENCY_LOCALES[displayCurrency] || 'en-US', {
      style: 'currency',
      currency: displayCurrency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(convertCurrency(value));

  // Keep the existing formatting used by the Wallet page.
  const formatAvailableCash = (value) => {
    const convertedValue = convertCurrency(value);

    if (convertedValue < 1_000_000) {
      return fmt(value);
    }

    const compactValue = new Intl.NumberFormat(
      CURRENCY_LOCALES[displayCurrency] || 'en-US',
      {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 2,
      },
    ).format(convertedValue);

    const currencySymbol = getCurrencySymbol(displayCurrency);

    return `${currencySymbol}${compactValue}`;
  };
  // Format only the Overview page's Available to Trade amount.
  const formatAvailableTradeCash = (value) => {
    const convertedValue = convertCurrency(value);
    const locale = CURRENCY_LOCALES[displayCurrency] || 'en-US';
    const currencySymbol = getCurrencySymbol(displayCurrency);

    const formatNumber = (amount) =>
      amount.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    if (convertedValue >= 1_000_000_000_000) {
      return `${currencySymbol}${formatNumber(
        convertedValue / 1_000_000_000_000,
      )}T`;
    }

    if (convertedValue >= 1_000_000_000) {
      return `${currencySymbol}${formatNumber(
        convertedValue / 1_000_000_000,
      )}B`;
    }

    if (convertedValue >= 1_000_000) {
      return `${currencySymbol}${formatNumber(convertedValue / 1_000_000)}M`;
    }

    return `${currencySymbol}${formatNumber(convertedValue)}`;
  };

  // Format cryptocurrency prices with extra precision for low-value assets.
  const priceFmt = (value) => fmt(value, value < 1 ? 4 : 2);

  // Store the greeting and update it as the visitor's local time changes.
  const [greeting, setGreeting] = useState(getGreeting);

  useEffect(() => {
    const updateGreeting = () => setGreeting(getGreeting());
    const timer = window.setInterval(updateGreeting, 60000);

    return () => window.clearInterval(timer);
  }, []);

  // Remember the selected display currency.
  useEffect(() => {
    localStorage.setItem('cryptora-display-currency', displayCurrency);
  }, [displayCurrency]);

  // Load supported currencies and their latest USD exchange rates.
  useEffect(() => {
    let active = true;

    async function loadCurrencies() {
      try {
        const response = await fetch(CURRENCY_API);

        if (!response.ok) {
          throw new Error('Failed to load exchange rates.');
        }

        const data = await response.json();

        if (data.result !== 'success' || !data.rates) {
          throw new Error('Exchange rates are unavailable.');
        }

        if (active) {
          setExchangeRates({ ...data.rates, USD: 1 });
          setCurrencyCodes(
            [...new Set([...Object.keys(data.rates), 'USD'])].sort(),
          );
        }
      } catch (error) {
        console.error('Currency data could not be loaded:', error);
      }
    }

    loadCurrencies();

    return () => {
      active = false;
    };
  }, []);

  // Store the visitor's theme preference.
  // "auto" follows the visitor's local time.
  const [themeMode, setThemeMode] = useState(() => {
    const savedMode = window.localStorage.getItem('cryptora-theme-mode');

    return ['auto', 'light', 'dark'].includes(savedMode) ? savedMode : 'auto';
  });

  // Apply the selected theme and check automatic mode periodically.
  useEffect(() => {
    const applyTheme = () => {
      const activeTheme =
        themeMode === 'auto' ? getAutomaticTheme() : themeMode;

      document.documentElement.dataset.theme = activeTheme;
    };

    applyTheme();

    const timer = window.setInterval(applyTheme, 60000);

    return () => window.clearInterval(timer);
  }, [themeMode]);

  useEffect(() => {
    window.localStorage.setItem('cryptora-theme-mode', themeMode);
  }, [themeMode]);

  // Store search, trading, and wallet form values.
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('BTC');
  const [side, setSide] = useState('buy');
  const [amount, setAmount] = useState('');
  const [walletAction, setWalletAction] = useState('deposit');
  const [walletAmount, setWalletAmount] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  // Calculate the selected asset, open positions, and total portfolio value.
  const asset = assets.find((item) => item.symbol === selected) || assets[0];

  const positions = Object.entries(account.positions || {}).filter(
    ([, qty]) => qty > 0.00000001,
  );

  const invested = positions.reduce(
    (sum, [symbol, qty]) =>
      sum + qty * (assets.find((item) => item.symbol === symbol)?.price || 0),
    0,
  );

  const total = account.cash + invested;
  const convertedTotal = convertCurrency(total);

  // Filter the market list using the search field.
  const filteredAssets = useMemo(
    () =>
      assets.filter((item) =>
        `${item.name} ${item.symbol}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [assets, query],
  );

  // Display temporary notifications throughout the website.
  const notify = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 1000);
  }, []);

  // Refresh market and account data from the backend.
  const refresh = useCallback(async () => {
    try {
      const [marketData, accountData] = await Promise.all([
        api('/market'),
        api('/account'),
      ]);

      setAssets(marketData.assets);
      setAccount(accountData);

      return true;
    } catch (error) {
      notify(`${error.message} Start the local server to use trading.`);
      return false;
    }
  }, [notify]);

  // Load data at startup and refresh it every six seconds.
  useEffect(() => {
    refresh();

    const timer = window.setInterval(refresh, 6000);

    return () => window.clearInterval(timer);
  }, [refresh]);

  // Navigate between pages, replay the entrance animation, and close the mobile menu.
  const go = (id) => {
    setPage(id);
    setPageAnimationKey((key) => key + 1);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Convert a selected-currency amount back to USD for the backend.
  const toUsd = (value) =>
    Number(value) / (exchangeRates[displayCurrency] || 1);

  // Submit a simulated buy or sell order to the backend.
  async function submitOrder(event) {
    event.preventDefault();
    setBusy(true);

    try {
      const result = await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          side,
          symbol: selected,
          usdAmount: toUsd(amount),
        }),
      });

      setAccount(result.account);
      setAmount('');
      notify(result.message);
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  // Add or withdraw demo funds using USD-based backend calculations.
  async function submitWallet(event) {
    event.preventDefault();
    setBusy(true);

    try {
      const result = await api('/wallet', {
        method: 'POST',
        body: JSON.stringify({
          action: walletAction,
          usdAmount: toUsd(walletAmount),
        }),
      });

      setAccount(result.account);
      setWalletAmount('');
      notify(result.message);
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  // Shared props for transaction tables.
  const activityProps = {
    fmt,
    priceFmt,
    displayCurrency,
    exchangeRates,
  };

  // Top navigation bar shared by every page.
  const Header = () => (
    <header className="topbar">
      <button
        className="menu-toggle"
        onClick={() => setMobileMenu(!mobileMenu)}
        aria-label="Toggle navigation"
      >
        ☰
      </button>

      <div className="crumb">
        <button
          type="button"
          className="crumb-brand"
          onClick={() => go('overview')}
          aria-label="Go to Cryptora home"
          style={{
            background: 'none',
            border: 0,
            padding: 0,
            color: 'inherit',
            font: 'inherit',
            cursor: 'pointer',
          }}
        >
          Cryptora
        </button>

        <span className="crumb-separator">/</span>

        <strong className="crumb-page">
          {NAV.find((item) => item.id === page)?.label || 'Overview'}
        </strong>
      </div>

      <div className="top-actions">
        <span className="market-open">
          <i /> Markets open
        </span>

        <label className="theme-selector">
          <span className="theme-selector-label">Theme</span>
          <select
            value={themeMode}
            onChange={(event) => setThemeMode(event.target.value)}
            aria-label="Choose colour theme"
          >
            <option value="auto">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>

        <button className="icon-button" aria-label="Notifications">
          ♧<i />
        </button>

        <div className="user-avatar">JD</div>
      </div>
    </header>
  );

  // Reusable heading for each page.
  const PageHeading = ({ eyebrow, title, text, action }) => (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );

  // Reusable table for displaying cryptocurrency markets.
  const MarketTable = ({ rows = filteredAssets, compact = false }) => (
    <div className="table-scroll">
      <table className="data-table market-table">
        <thead>
          <tr>
            <th>ASSET</th>
            <th>PRICE</th>
            <th>24H CHANGE</th>
            {!compact && <th>MARKET TREND</th>}
            <th />
          </tr>
        </thead>

        <tbody>
          {rows.map((item) => (
            <tr key={item.symbol}>
              <td>
                <div className="coin-cell">
                  <Icon className={item.className}>{item.icon}</Icon>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.symbol}</small>
                  </div>
                </div>
              </td>

              <td className="strong-cell">{priceFmt(item.price)}</td>

              <td className={item.change >= 0 ? 'up' : 'down'}>
                {item.change >= 0 ? '+' : ''}
                {item.change.toFixed(2)}%
              </td>

              {!compact && (
                <td>
                  <Sparkline positive={item.change >= 0} seed={item.price} />
                </td>
              )}

              <td>
                <button
                  className="small-action"
                  onClick={() => {
                    setSelected(item.symbol);
                    go('trade');
                  }}
                >
                  Trade
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <div className="no-results">No assets match “{query}”.</div>
      )}
    </div>
  );

  // Reusable form for placing simulated buy and sell orders.
  const orderForm = () => (
    <section className="panel order-panel">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">QUICK TRADE</div>
          <h2>Place an order</h2>
        </div>
        <span className="demo-tag">DEMO</span>
      </div>

      <div className="segmented">
        <button
          type="button"
          className={side === 'buy' ? 'selected buy' : ''}
          onClick={() => setSide('buy')}
        >
          Buy
        </button>

        <button
          type="button"
          className={side === 'sell' ? 'selected sell' : ''}
          onClick={() => setSide('sell')}
        >
          Sell
        </button>
      </div>

      <form onSubmit={submitOrder}>
        <label className="field-label">Choose asset</label>

        {/* Quick Trade asset selector. */}
        <div className="select-control">
          <Icon className={asset.className}>{asset.icon}</Icon>

          <button
            type="button"
            className="asset-select-trigger"
            onClick={() => {
              setTradeAssetMenuOpen((isOpen) => !isOpen);
              setChartMenuOpen(false);
              setCurrencyMenuOpen(false);
            }}
            aria-expanded={tradeAssetMenuOpen}
            aria-haspopup="listbox"
          >
            <span>
              {asset.name} ({asset.symbol})
            </span>

            <svg
              className={`asset-picker-chevron ${
                tradeAssetMenuOpen ? 'is-open' : ''
              }`}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {tradeAssetMenuOpen && (
            <div className="asset-select-menu" role="listbox">
              {assets.map((item) => (
                <button
                  type="button"
                  key={item.symbol}
                  role="option"
                  aria-selected={selected === item.symbol}
                  className={`asset-select-option ${
                    selected === item.symbol ? 'selected' : ''
                  }`}
                  onClick={() => {
                    setSelected(item.symbol);
                    setTradeAssetMenuOpen(false);
                  }}
                >
                  <Icon className={item.className}>{item.icon}</Icon>

                  <span>
                    {item.name} ({item.symbol})
                  </span>

                  {selected === item.symbol && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="field-label gap-label">
          Amount in {displayCurrency}
        </label>

        <div className="amount-control">
          <span>{getCurrencySymbol(displayCurrency)}</span>

          <input
            type="number"
            min="1"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />

          <b>{displayCurrency}</b>
        </div>

        <div className="quick-amounts">
          {[25, 50, 100, 250].map((value) => (
            <button
              type="button"
              key={value}
              onClick={() => setAmount(String(value))}
            >
              {getCurrencySymbol(displayCurrency)}
              {value}
            </button>
          ))}
        </div>

        <div className="order-estimate">
          <span>Market price</span>
          <strong>{priceFmt(asset.price)}</strong>

          <span>Estimated quantity</span>
          <strong>
            {amount && Number(amount) > 0
              ? `${(toUsd(amount) / asset.price).toFixed(6)} ${asset.symbol}`
              : '—'}
          </strong>

          <span>Demo fee</span>
          <strong>Free</strong>
        </div>

        <button
          className={`primary-button ${side === 'sell' ? 'sell-button' : ''}`}
          disabled={busy}
        >
          {busy
            ? 'Processing…'
            : `${side === 'buy' ? 'Buy' : 'Sell'} ${asset.symbol}`}{' '}
          <span>→</span>
        </button>

        <p className="fine-print">ⓘ Simulated demo order · no real funds</p>
      </form>
    </section>
  );
  return (
    <div className="app-shell">
      {/* Close the mobile sidebar when the backdrop is clicked. */}
      {mobileMenu && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenu(false)}
        />
      )}

      {/* Sidebar navigation and demo account information. */}
      <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
        <a
          href="/"
          className="brand"
          onClick={(event) => {
            event.preventDefault();
            go('overview');
          }}
          aria-label="Go to Cryptora home"
        >
          <span className="brand-mark">c</span>cryptora
          <span className="brand-dot">.</span>
        </a>

        <div className="side-label">
          WORKSPACE <span className="live-dot" />
        </div>

        <nav>
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.id === 'trade' && <span className="nav-demo">DEMO</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sandbox-card">
            <strong>
              <span>✦</span> Sandbox mode
            </strong>
            <p>Practice with virtual funds. No real assets are involved.</p>
            <small>DEMO ACCOUNT</small>
          </div>

          <button
            className="nav-item help-link"
            onClick={() => notify('Help center coming soon.')}
          >
            <span className="nav-icon">?</span>
            Help center
          </button>

          <div className="profile">
            <div className="profile-avatar">JD</div>
            <div>
              <strong>Jordan Davis</strong>
              <small>Demo account</small>
            </div>
            <span className="profile-more">•••</span>
          </div>
        </div>
      </aside>

      {/* Main content changes according to the selected page. */}
      <main className="main-area">
        <Header />

        <div className="content">
          {/* Re-mount this wrapper whenever navigation or refresh requests animation. */}
          <div className="page-transition" key={`${page}-${pageAnimationKey}`}>
            {/* Overview dashboard. */}
            {page === 'overview' && (
              <>
                <PageHeading
                  eyebrow="TUESDAY, OCTOBER 20, 2026  ·  DEMO ENVIRONMENT"
                  title={`${greeting}, Jordan ✦`}
                  text="A clear view of your markets, all in one place."
                  action={
                    <button
                      className="outline-button"
                      onClick={async () => {
                        await refresh();
                        setPageAnimationKey((key) => key + 1);
                      }}
                    >
                      ↻ Refresh data
                    </button>
                  }
                />

                <div className="balance-amount">
                  {formatCurrency(convertedTotal, displayCurrency)}{' '}
                  <button
                    type="button"
                    className="currency-picker-trigger"
                    onClick={() => setCurrencyMenuOpen(!currencyMenuOpen)}
                    aria-expanded={currencyMenuOpen}
                    aria-label={`Display currency: ${displayCurrency}`}
                  >
                    {displayCurrency}
                    <svg
                      className={`currency-picker-chevron ${
                        currencyMenuOpen ? 'is-open' : ''
                      }`}
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </div>

                <div className="stats-grid">
                  <article
                    className="stat-card balance-card balance-card-clickable"
                    onClick={() => {
                      document
                        .getElementById('market-performance')
                        ?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        });
                    }}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        document
                          .getElementById('market-performance')
                          ?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                          });
                      }
                    }}
                  >
                    <div className="stat-label">
                      Total demo balance{' '}
                      <span title="Virtual demo account">ⓘ</span>
                    </div>

                    {currencyMenuOpen && (
                      <div className="currency-picker-menu">
                        <button
                          type="button"
                          className="currency-picker-option default-currency-option"
                          onClick={() => {
                            setDisplayCurrency('USD');
                            setCurrencyMenuOpen(false);
                            setCurrencySearch('');
                          }}
                        >
                          <span>
                            <strong>Default — USD</strong>
                            <small>Return to US dollars</small>
                          </span>

                          {displayCurrency === 'USD' && <span>✓</span>}
                        </button>

                        <input
                          type="text"
                          className="currency-picker-search"
                          placeholder="Search currencies..."
                          value={currencySearch}
                          onChange={(event) =>
                            setCurrencySearch(event.target.value)
                          }
                          autoComplete="off"
                        />

                        <div className="currency-picker-list">
                          {currencyCodes
                            .filter((code) =>
                              `${code} ${getCurrencyName(code)}`
                                .toLowerCase()
                                .includes(currencySearch.toLowerCase()),
                            )
                            .map((code) => (
                              <button
                                type="button"
                                className="currency-picker-option"
                                key={code}
                                onClick={() => {
                                  setDisplayCurrency(code);
                                  setCurrencyMenuOpen(false);
                                  setCurrencySearch('');
                                }}
                              >
                                <span>
                                  <strong>{code}</strong>
                                  <small>{getCurrencyName(code)}</small>
                                </span>

                                {displayCurrency === code && <span>✓</span>}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    <div className="stat-meta">
                      <span className="change-badge">↗ 2.41%</span>
                      <span
                        className="market-performance-text"
                        onClick={(event) => {
                          event.stopPropagation();
                          document
                            .getElementById('market-performance')
                            ?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'start',
                            });
                        }}
                      >
                        View Market Performance →
                      </span>
                    </div>
                    <svg
                      className="balance-zigzag"
                      viewBox="0 0 120 20"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <polyline
                        points="0,13 10,6 20,14 30,4 40,11 50,7 60,15 70,5 80,12 90,3 100,10 110,6 120,11"
                        fill="none"
                        stroke="#31966f"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </article>

                  <article className="stat-card">
                    <div className="stat-label">
                      Available to trade <span>ⓘ</span>
                    </div>
                    <div className="stat-amount available-trade-amount">
                      {formatAvailableTradeCash(account.cash)}
                    </div>

                    <div className="sub-meta">
                      <span
                        className={`cash-dot ${
                          /^[A-Z]{3}$/i.test(getCurrencySymbol(displayCurrency))
                            ? 'cash-dot-code'
                            : 'cash-dot-symbol'
                        }`}
                      >
                        {getCurrencySymbol(displayCurrency)}
                      </span>{' '}
                      {getCurrencyName(displayCurrency)}
                      <span className="right">{displayCurrency}</span>
                    </div>

                    <div className="allocation">
                      <span
                        style={{
                          width: `${total ? (account.cash / total) * 100 : 0}%`,
                        }}
                      />
                    </div>

                    <div className="allocation-note">
                      Cash allocation{' '}
                      <b>
                        {total ? Math.round((account.cash / total) * 100) : 0}%
                      </b>
                    </div>
                  </article>

                  <article className="stat-card">
                    <div className="stat-label">
                      Open positions <span>ⓘ</span>
                    </div>

                    <div className="stat-amount">
                      {positions.length} <small>assets</small>
                    </div>

                    <div className="position-list">
                      {positions.length ? (
                        positions.slice(0, 4).map(([symbol]) => {
                          const item = assets.find(
                            (entry) => entry.symbol === symbol,
                          );

                          return (
                            item && (
                              <Icon key={symbol} className={item.className}>
                                {item.icon}
                              </Icon>
                            )
                          );
                        })
                      ) : (
                        <span className="empty-position">◉</span>
                      )}

                      <span>
                        {positions.length
                          ? positions.map(([symbol]) => symbol).join(' · ')
                          : 'Your positions will appear here'}
                      </span>
                    </div>

                    <button
                      className="link-button position-link"
                      onClick={() => go('wallet')}
                    >
                      View portfolio →
                    </button>
                  </article>
                </div>

                {/* Market Performance panel. */}
                <section className="panel chart-panel" id="market-performance">
                  <div className="panel-heading">
                    <div>
                      <div className="eyebrow">MARKET OVERVIEW</div>
                      <h2>Market performance</h2>
                    </div>

                    {/* Market Performance asset selector. */}
                    <div className="chart-select-wrapper">
                      <button
                        type="button"
                        className="chart-select"
                        onClick={() => {
                          setChartMenuOpen(!chartMenuOpen);
                          setTradeAssetMenuOpen(false);
                          setCurrencyMenuOpen(false);
                        }}
                        aria-expanded={chartMenuOpen}
                        aria-haspopup="listbox"
                      >
                        {asset.name} · {selected}
                        <svg
                          className={`chart-dropdown-chevron ${
                            chartMenuOpen ? 'is-open' : ''
                          }`}
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>

                      {chartMenuOpen && (
                        <div className="chart-select-menu" role="listbox">
                          {assets.map((item) => (
                            <button
                              type="button"
                              key={item.symbol}
                              role="option"
                              aria-selected={selected === item.symbol}
                              className={`chart-select-option ${
                                selected === item.symbol ? 'selected' : ''
                              }`}
                              onClick={() => {
                                setSelected(item.symbol);
                                setChartMenuOpen(false);
                              }}
                            >
                              <Icon className={item.className}>
                                {item.icon}
                              </Icon>

                              <span>
                                {item.name} · {item.symbol}
                              </span>

                              {selected === item.symbol && <span>✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="chart-price">
                    {priceFmt(asset.price)}{' '}
                    <span className={asset.change >= 0 ? 'up' : 'down'}>
                      {asset.change >= 0 ? '+' : ''}
                      {asset.change.toFixed(2)}%
                    </span>
                    <small>past 24 hours</small>
                  </div>

                  <PriceChart seed={asset.price} priceFmt={priceFmt} />
                </section>

                <div className="dashboard-grid">
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <div className="eyebrow">MARKET WATCH</div>
                        <h2>Top markets</h2>
                      </div>

                      <button
                        className="link-button"
                        onClick={() => go('markets')}
                      >
                        All markets →
                      </button>
                    </div>

                    <MarketTable rows={assets.slice(0, 4)} compact />
                  </section>

                  {orderForm()}
                </div>

                <section className="panel recent-panel">
                  <div className="panel-heading">
                    <div>
                      <div className="eyebrow">YOUR ACCOUNT</div>
                      <h2>Recent activity</h2>
                    </div>

                    <button
                      className="link-button"
                      onClick={() => go('history')}
                    >
                      View history →
                    </button>
                  </div>

                  <Activity
                    orders={(account.orders || []).slice(0, 3)}
                    emptyText="Your demo orders will appear here."
                    {...activityProps}
                  />
                </section>
              </>
            )}
            {/* Markets page. */}
            {page === 'markets' && (
              <>
                <PageHeading
                  eyebrow="EXPLORE DIGITAL ASSETS"
                  title="Markets"
                  text="Follow prices and discover assets to trade."
                />

                <section className="panel market-page">
                  <div className="market-controls">
                    <div>
                      <div className="eyebrow">SPOT MARKETS</div>
                      <h2>All assets</h2>
                    </div>

                    <input
                      className="search-input"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="⌕  Search assets"
                      aria-label="Search assets"
                    />
                  </div>

                  <MarketTable />
                </section>
              </>
            )}
            {/* Trade page. */}
            {page === 'trade' && (
              <>
                <PageHeading
                  eyebrow="BUY AND SELL DIGITAL ASSETS"
                  title="Trade"
                  text="Place a simulated market order using your demo balance."
                />

                <div className="trade-layout">
                  {orderForm()}

                  <section className="panel trade-info">
                    <div className="eyebrow">MARKET PRICES</div>
                    <h2>Live demo prices</h2>

                    <p>
                      Prices update periodically and are generated for practice.
                      They are not exchange quotes.
                    </p>

                    {assets.map((item) => (
                      <button
                        type="button"
                        className={`price-row ${
                          selected === item.symbol ? 'chosen' : ''
                        }`}
                        key={item.symbol}
                        onClick={() => setSelected(item.symbol)}
                      >
                        <span className="coin-cell">
                          <Icon className={item.className}>{item.icon}</Icon>
                          <span>
                            <strong>{item.name}</strong>
                            <small>{item.symbol}</small>
                          </span>
                        </span>

                        <span>
                          <strong>{priceFmt(item.price)}</strong>
                          <small className={item.change >= 0 ? 'up' : 'down'}>
                            {item.change >= 0 ? '+' : ''}
                            {item.change.toFixed(2)}%
                          </small>
                        </span>
                      </button>
                    ))}
                  </section>
                </div>
              </>
            )}
            {/* Wallet page. */}
            {page === 'wallet' && (
              <>
                <PageHeading
                  eyebrow="YOUR FUNDS"
                  title="Wallet"
                  text="Manage your simulated cash and crypto holdings."
                  action={<span className="demo-tag">DEMO ACCOUNT</span>}
                />

                <div className="stats-grid wallet-stats">
                  <article className="stat-card">
                    <div className="stat-label">Total balance</div>
                    <div className="stat-amount">
                      {formatAvailableCash(total)}
                    </div>
                    <div className="sub-meta">Across cash and crypto</div>
                  </article>

                  <article className="stat-card">
                    <div className="stat-label">Cash balance</div>
                    <div className="stat-amount">
                      {formatAvailableCash(account.cash)}
                    </div>
                    <div className="sub-meta">Available for demo trading</div>
                  </article>

                  <article className="stat-card">
                    <div className="stat-label">Crypto value</div>
                    <div className="stat-amount">
                      {formatAvailableCash(invested)}
                    </div>
                    <div className="sub-meta">
                      {positions.length} open{' '}
                      {positions.length === 1 ? 'position' : 'positions'}
                    </div>
                  </article>
                </div>

                <div className="wallet-layout">
                  <section className="panel wallet-panel">
                    <div className="panel-heading">
                      <div>
                        <div className="eyebrow">DEMO WALLET</div>
                        <h2>Cash movements</h2>
                      </div>
                    </div>

                    <p className="muted-copy">
                      Add or remove demo funds using your selected display
                      currency. The practice account uses USD internally. No
                      card or bank details are requested.
                    </p>

                    <div className="segmented wallet-tabs">
                      <button
                        type="button"
                        className={
                          walletAction === 'deposit' ? 'selected buy' : ''
                        }
                        onClick={() => setWalletAction('deposit')}
                      >
                        ＋ Add demo funds
                      </button>

                      <button
                        type="button"
                        className={
                          walletAction === 'withdraw' ? 'selected sell' : ''
                        }
                        onClick={() => setWalletAction('withdraw')}
                      >
                        − Withdraw demo funds
                      </button>
                    </div>

                    <form onSubmit={submitWallet}>
                      <label className="field-label">
                        Amount in {displayCurrency}
                      </label>

                      <div className="amount-control">
                        <span>{getCurrencySymbol(displayCurrency)}</span>

                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          placeholder="0.00"
                          value={walletAmount}
                          onChange={(event) =>
                            setWalletAmount(event.target.value)
                          }
                          required
                        />

                        <b>{displayCurrency}</b>
                      </div>

                      <div className="quick-amounts">
                        {[100, 500, 1000].map((value) => (
                          <button
                            type="button"
                            key={value}
                            onClick={() => setWalletAmount(String(value))}
                          >
                            {getCurrencySymbol(displayCurrency)}
                            {value}
                          </button>
                        ))}
                      </div>

                      <button
                        className="primary-button wallet-submit"
                        disabled={busy}
                      >
                        {busy
                          ? 'Processing…'
                          : walletAction === 'deposit'
                            ? 'Add demo funds'
                            : 'Withdraw demo funds'}{' '}
                        →
                      </button>
                    </form>

                    <div className="payment-note">
                      <span>ⓘ</span>
                      <div>
                        <strong>Payment methods are not connected</strong>
                        <p>
                          These controls only change your virtual demo balance.
                          Real deposits and withdrawals require a payment
                          provider and verified account setup.
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="panel holdings-panel">
                    <div className="panel-heading">
                      <div>
                        <div className="eyebrow">ASSET BREAKDOWN</div>
                        <h2>Your holdings</h2>
                      </div>
                    </div>

                    {positions.length ? (
                      positions.map(([symbol, quantity]) => {
                        const item = assets.find(
                          (entry) => entry.symbol === symbol,
                        );

                        return (
                          item && (
                            <div className="holding-row" key={symbol}>
                              <span className="coin-cell">
                                <Icon className={item.className}>
                                  {item.icon}
                                </Icon>

                                <span>
                                  <strong>{item.name}</strong>
                                  <small>
                                    {quantity.toFixed(6)} {symbol}
                                  </small>
                                </span>
                              </span>

                              <strong>{fmt(quantity * item.price)}</strong>
                            </div>
                          )
                        );
                      })
                    ) : (
                      <div className="empty-state">
                        <span>◉</span>
                        <strong>No crypto holdings yet</strong>
                        <p>
                          Make a demo trade and your holdings will appear here.
                        </p>

                        <button
                          className="link-button"
                          onClick={() => go('trade')}
                        >
                          Go to trade →
                        </button>
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}{' '}
            {/* Activity history page. */}
            {page === 'history' && (
              <>
                <PageHeading
                  eyebrow="YOUR ACCOUNT RECORD"
                  title="Activity history"
                  text="Review your recent demo trades and wallet movements."
                  action={
                    <button
                      className="outline-button"
                      onClick={async () => {
                        setPageAnimationKey((key) => key + 1);

                        const refreshed = await refresh();

                        if (refreshed) {
                          notify('Activity history refreshed.');
                        }
                      }}
                    >
                      ↻ Refresh history
                    </button>
                  }
                />

                <section className="panel history-panel">
                  <div className="panel-heading">
                    <div>
                      <div className="eyebrow">ALL TRANSACTIONS</div>
                      <h2>Activity</h2>
                    </div>

                    <span className="activity-count">
                      {(account.orders || []).length} records
                    </span>
                  </div>

                  <Activity
                    orders={account.orders || []}
                    emptyText="Your trades and wallet activity will appear here."
                    {...activityProps}
                  />
                </section>
              </>
            )}
            {/* Membership page. */}
            {page === 'membership' && (
              <>
                <PageHeading
                  eyebrow="YOUR CRYPTORA ACCOUNT"
                  title="Membership"
                  text="A simple overview of your demo account and its current level."
                />

                <section className="membership-card">
                  <div className="membership-icon">✦</div>

                  <div className="membership-copy">
                    <span className="demo-tag">CURRENT PLAN</span>
                    <h2>Explorer</h2>

                    <p>
                      Your Cryptora demo membership is ready for practice.
                      Explore markets, try trades, and learn how the portfolio
                      works.
                    </p>

                    <div className="member-stats">
                      <div>
                        <small>ACCOUNT TYPE</small>
                        <strong>Demo</strong>
                      </div>

                      <div>
                        <small>MEMBER SINCE</small>
                        <strong>Today</strong>
                      </div>

                      <div>
                        <small>TRADES PLACED</small>
                        <strong>
                          {
                            (account.orders || []).filter(
                              (order) => order.kind !== 'wallet',
                            ).length
                          }
                        </strong>
                      </div>
                    </div>

                    <button
                      className="primary-button"
                      onClick={() => go('markets')}
                    >
                      Explore markets →
                    </button>
                  </div>
                </section>

                <div className="membership-grid">
                  <article className="panel member-feature">
                    <span>01</span>
                    <h3>Practice safely</h3>
                    <p>
                      Try the trading flow with virtual demo funds and simulated
                      fills.
                    </p>
                  </article>

                  <article className="panel member-feature">
                    <span>02</span>
                    <h3>Track your activity</h3>
                    <p>
                      Review demo orders and wallet movements in one history.
                    </p>
                  </article>

                  <article className="panel member-feature">
                    <span>03</span>
                    <h3>Learn the basics</h3>
                    <p>Follow asset prices and see how a portfolio changes.</p>
                  </article>
                </div>

                <p className="membership-footnote">
                  Membership tiers, subscriptions, and paid benefits are not
                  enabled in this demo.
                </p>
              </>
            )}
          </div>

          {/* Footer links and temporary support notification. */}
          <footer className="footer">
            <span>© 2026 Cryptora</span>

            <span>
              <i className="live-dot" /> Demo market data · Learning environment
            </span>

            <button
              onClick={() => notify('Support information will be added here.')}
            >
              Help &amp; support
            </button>
          </footer>
        </div>
      </main>

      {/* Display temporary success and error messages. */}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

// Draw the small price-trend charts used in market rows.
function Sparkline({ positive = true, seed = 1, large = false }) {
  const data = Array.from(
    { length: 26 },
    (_, index) =>
      Math.sin(index * 0.57 + seed / 23) * 7 +
      Math.sin(index * 1.3 + seed / 9) * 3 +
      index * (positive ? 0.49 : -0.31) +
      25,
  );

  const points = data
    .map((value, index) => `${(index / (data.length - 1)) * 100},${32 - value}`)
    .join(' ');

  return (
    <svg
      className={large ? 'sparkline large' : 'sparkline'}
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={positive ? '#31966f' : '#c94f5b'}
        strokeWidth="1.8"
        points={points}
      />
    </svg>
  );
}

// Draw the larger market-performance chart for the selected asset.
function PriceChart({ seed, priceFmt }) {
  const values = Array.from(
    { length: 72 },
    (_, i) =>
      Math.sin(i * 0.21 + seed / 17) * 0.32 +
      Math.sin(i * 0.49 + seed / 19) * 0.17 +
      Math.sin(i * 0.075 + seed / 13) * 0.35 +
      i * 0.009 +
      (i > 48 ? (i - 48) * 0.006 : 0),
  );

  const min = Math.min(...values) - 0.15;
  const max = Math.max(...values) + 0.15;

  const points = values
    .map(
      (value, i) =>
        `${(i / (values.length - 1)) * 100},${100 - ((value - min) / (max - min)) * 86 - 4}`,
    )
    .join(' ');

  // Display approximate levels around the selected asset's current price.
  const chartLabels = [1.02, 1.01, 1, 0.99].map((factor) =>
    priceFmt(seed * factor),
  );

  return (
    <div className="price-chart">
      <div className="chart-y-labels">
        {chartLabels.map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>

      <div className="chart-drawing">
        <div className="chart-gridlines">
          <i />
          <i />
          <i />
          <i />
        </div>

        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon points={`0,100 ${points} 100,100`} fill="url(#fill)" />

          <defs>
            <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--chart-fill)"
                stopOpacity=".23"
              />
              <stop
                offset="100%"
                stopColor="var(--chart-fill)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>

          <polyline
            points={points}
            fill="none"
            stroke="var(--chart-line)"
            strokeWidth=".7"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="chart-x-labels">
          <span>00:00</span>
          <span>04:00</span>
          <span>08:00</span>
          <span>12:00</span>
          <span>16:00</span>
          <span>20:00</span>
          <span>Now</span>
        </div>
      </div>
    </div>
  );
}

// Display transaction records or an empty-state message.
function Activity({
  orders,
  emptyText,
  priceFmt,
  displayCurrency,
  exchangeRates,
}) {
  if (!orders?.length) {
    return (
      <div className="empty-state">
        <span>◷</span>
        <strong>No activity yet</strong>
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="data-table activity-table">
        <thead>
          <tr>
            <th>TYPE</th>
            <th>AMOUNT</th>
            <th>PRICE</th>
            <th>DATE</th>
            <th>STATUS</th>
          </tr>
        </thead>

        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <span
                  className={`type-chip ${
                    order.kind === 'wallet' ? 'wallet-chip' : order.side
                  }`}
                >
                  {order.kind === 'wallet'
                    ? order.side === 'deposit'
                      ? 'Deposit'
                      : 'Withdrawal'
                    : order.side}
                </span>
              </td>

              <td>
                {formatActivityAmount(
                  order.usdAmount,
                  displayCurrency,
                  exchangeRates,
                )}
              </td>

              <td>{order.price ? priceFmt(order.price) : '—'}</td>

              <td className="activity-date">
                <span className="activity-date-full">
                  {new Date(order.createdAt).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </span>

                <span className="activity-date-compact">
                  {new Date(order.createdAt).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </span>
              </td>

              <td>
                <span className="complete-chip">Successful</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
