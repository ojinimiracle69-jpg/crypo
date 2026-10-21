import { useCallback, useEffect, useMemo, useState } from 'react';

const NAV = [
  { id: 'overview', label: 'Overview', icon: '⌂' },
  { id: 'markets', label: 'Markets', icon: '⌁' },
  { id: 'trade', label: 'Trade', icon: '⇄' },
  { id: 'wallet', label: 'Wallet', icon: '▣' },
  { id: 'history', label: 'Activity', icon: '◷' },
  { id: 'membership', label: 'Membership', icon: '✦' },
];
const FALLBACK = [
  { symbol: 'BTC', name: 'Bitcoin', price: 67482.3, change: 2.41, icon: '₿', className: 'btc' },
  { symbol: 'ETH', name: 'Ethereum', price: 3524.18, change: 1.82, icon: '◆', className: 'eth' },
  { symbol: 'SOL', name: 'Solana', price: 184.62, change: 5.36, icon: '◎', className: 'sol' },
  { symbol: 'ADA', name: 'Cardano', price: 0.4821, change: -0.76, icon: '◉', className: 'ada' },
  { symbol: 'XRP', name: 'XRP', price: 0.6245, change: 0.93, icon: '✕', className: 'xrp' },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.1642, change: -1.24, icon: 'Ð', className: 'doge' },
];
const fmt = (value, digits = 2) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value || 0);
const priceFmt = (value) => fmt(value, value < 1 ? 4 : 2);
const shortDate = (value) => new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Something went wrong.');
  return result;
}

function Icon({ children, className = '' }) { return <span className={`asset-icon ${className}`}>{children}</span>; }
function App() {
  const [page, setPage] = useState('overview');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [assets, setAssets] = useState(FALLBACK);
  const [account, setAccount] = useState({ cash: 10000, positions: {}, orders: [] });
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('BTC');
  const [side, setSide] = useState('buy');
  const [amount, setAmount] = useState('');
  const [walletAction, setWalletAction] = useState('deposit');
  const [walletAmount, setWalletAmount] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  const asset = assets.find((item) => item.symbol === selected) || assets[0];
  const positions = Object.entries(account.positions || {}).filter(([, qty]) => qty > 0.00000001);
  const invested = positions.reduce((sum, [symbol, qty]) => sum + qty * (assets.find((item) => item.symbol === symbol)?.price || 0), 0);
  const total = account.cash + invested;
  const filteredAssets = useMemo(() => assets.filter((item) => `${item.name} ${item.symbol}`.toLowerCase().includes(query.toLowerCase())), [assets, query]);
  const notify = useCallback((message) => { setToast(message); window.setTimeout(() => setToast(''), 3200); }, []);
  const refresh = useCallback(async () => {
    try {
      const [marketData, accountData] = await Promise.all([api('/market'), api('/account')]);
      setAssets(marketData.assets); setAccount(accountData);
    } catch (error) { notify(`${error.message} Start the local server to use trading.`); }
  }, [notify]);

  useEffect(() => { refresh(); const timer = window.setInterval(refresh, 6000); return () => window.clearInterval(timer); }, [refresh]);
  const go = (id) => { setPage(id); setMobileMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  async function submitOrder(event) {
    event.preventDefault(); setBusy(true);
    try {
      const result = await api('/orders', { method: 'POST', body: JSON.stringify({ side, symbol: selected, usdAmount: Number(amount) }) });
      setAccount(result.account); setAmount(''); notify(result.message);
    } catch (error) { notify(error.message); }
    finally { setBusy(false); }
  }
  async function submitWallet(event) {
    event.preventDefault(); setBusy(true);
    try {
      const result = await api('/wallet', { method: 'POST', body: JSON.stringify({ action: walletAction, usdAmount: Number(walletAmount) }) });
      setAccount(result.account); setWalletAmount(''); notify(result.message);
    } catch (error) { notify(error.message); }
    finally { setBusy(false); }
  }
  async function clearHistory() {
    try { setAccount(await api('/orders', { method: 'DELETE' })); notify('Activity history cleared.'); }
    catch (error) { notify(error.message); }
  }

  const Header = () => <header className="topbar"><button className="menu-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation">☰</button><div className="crumb">Cryptora <span>/</span> <strong>{NAV.find((item) => item.id === page)?.label || 'Overview'}</strong></div><div className="top-actions"><span className="market-open"><i /> Markets open</span><button className="icon-button" aria-label="Notifications">♧<i /></button><div className="user-avatar">JD</div></div></header>;
  const PageHeading = ({ eyebrow, title, text, action }) => <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{text}</p></div>{action}</div>;
  const MarketTable = ({ rows = filteredAssets, compact = false }) => <div className="table-scroll"><table className="data-table market-table"><thead><tr><th>ASSET</th><th>PRICE</th><th>24H CHANGE</th>{!compact && <th>MARKET TREND</th>}<th /></tr></thead><tbody>{rows.map((item) => <tr key={item.symbol}><td><div className="coin-cell"><Icon className={item.className}>{item.icon}</Icon><div><strong>{item.name}</strong><small>{item.symbol}</small></div></div></td><td className="strong-cell">{priceFmt(item.price)}</td><td className={item.change >= 0 ? 'up' : 'down'}>{item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%</td>{!compact && <td><Sparkline positive={item.change >= 0} seed={item.price} /></td>}<td><button className="small-action" onClick={() => { setSelected(item.symbol); go('trade'); }}>Trade</button></td></tr>)}</tbody></table>{rows.length === 0 && <div className="no-results">No assets match “{query}”.</div>}</div>;
  const orderForm = () => <section className="panel order-panel"><div className="panel-heading"><div><div className="eyebrow">QUICK TRADE</div><h2>Place an order</h2></div><span className="demo-tag">DEMO</span></div><div className="segmented"><button className={side === 'buy' ? 'selected buy' : ''} onClick={() => setSide('buy')}>Buy</button><button className={side === 'sell' ? 'selected sell' : ''} onClick={() => setSide('sell')}>Sell</button></div><form onSubmit={submitOrder}><label className="field-label">Choose asset</label><div className="select-control"><Icon className={asset.className}>{asset.icon}</Icon><select value={selected} onChange={(event) => setSelected(event.target.value)}>{assets.map((item) => <option key={item.symbol} value={item.symbol}>{item.name} ({item.symbol})</option>)}</select><span>⌄</span></div><label className="field-label gap-label">Amount in USD</label><div className="amount-control"><span>$</span><input type="number" min="1" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} required /><b>USD</b></div><div className="quick-amounts">{[25, 50, 100, 250].map((value) => <button type="button" key={value} onClick={() => setAmount(String(value))}>${value}</button>)}</div><div className="order-estimate"><span>Market price</span><strong>{priceFmt(asset.price)}</strong><span>Estimated quantity</span><strong>{amount && Number(amount) > 0 ? `${(Number(amount) / asset.price).toFixed(6)} ${asset.symbol}` : '—'}</strong><span>Demo fee</span><strong>Free</strong></div><button className={`primary-button ${side === 'sell' ? 'sell-button' : ''}`} disabled={busy}>{busy ? 'Processing…' : `${side === 'buy' ? 'Buy' : 'Sell'} ${asset.symbol}`} <span>→</span></button><p className="fine-print">ⓘ Simulated demo order · no real funds</p></form></section>;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}><a className="brand" onClick={() => go('overview')}><span className="brand-mark">c</span>cryptora<span className="brand-dot">.</span></a><div className="side-label">WORKSPACE <span className="live-dot" /></div><nav>{NAV.map((item) => <button key={item.id} onClick={() => go(item.id)} className={`nav-item ${page === item.id ? 'active' : ''}`}><span className="nav-icon">{item.icon}</span>{item.label}{item.id === 'trade' && <span className="nav-demo">DEMO</span>}</button>)}</nav><div className="sidebar-bottom"><div className="sandbox-card"><strong><span>✦</span> Sandbox mode</strong><p>Practice with virtual funds. No real assets are involved.</p><small>DEMO ACCOUNT</small></div><button className="nav-item help-link" onClick={() => notify('Help center coming soon.')}> <span className="nav-icon">?</span>Help center</button><div className="profile"><div className="profile-avatar">JD</div><div><strong>Jordan Davis</strong><small>Demo account</small></div><span className="profile-more">•••</span></div></div></aside>
    <main className="main-area"><Header /><div className="content">
      {page === 'overview' && <><PageHeading eyebrow="TUESDAY, OCTOBER 20, 2026  ·  DEMO ENVIRONMENT" title="Good morning, Jordan ✦" text="A clear view of your markets, all in one place." action={<button className="outline-button" onClick={() => refresh()}>↻ Refresh data</button>} />
        <div className="stats-grid"><article className="stat-card balance-card"><div className="stat-label">Total demo balance <span title="Virtual demo account">ⓘ</span></div><div className="balance-amount">{fmt(total)} <small>USD⌄</small></div><div className="stat-meta"><span className="change-badge">↗ 2.41%</span><span>today · Demo funds only</span></div><Sparkline positive seed={total} large /></article><article className="stat-card"><div className="stat-label">Available to trade <span>ⓘ</span></div><div className="stat-amount">{fmt(account.cash)}</div><div className="sub-meta"><span className="cash-dot">$</span> US Dollar <span className="right">USD</span></div><div className="allocation"><span style={{ width: `${total ? account.cash / total * 100 : 0}%` }} /></div><div className="allocation-note">Cash allocation <b>{total ? Math.round(account.cash / total * 100) : 0}%</b></div></article><article className="stat-card"><div className="stat-label">Open positions <span>ⓘ</span></div><div className="stat-amount">{positions.length} <small>assets</small></div><div className="position-list">{positions.length ? positions.slice(0, 4).map(([symbol]) => { const item = assets.find((entry) => entry.symbol === symbol); return item && <Icon key={symbol} className={item.className}>{item.icon}</Icon>; }) : <span className="empty-position">◉</span>}<span>{positions.length ? positions.map(([symbol]) => symbol).join(' · ') : 'Your positions will appear here'}</span></div><button className="link-button position-link" onClick={() => go('wallet')}>View portfolio →</button></article></div>
        <section className="panel chart-panel"><div className="panel-heading"><div><div className="eyebrow">MARKET OVERVIEW</div><h2>Market performance</h2></div><select className="chart-select" value={selected} onChange={(event) => setSelected(event.target.value)}>{assets.map((item) => <option key={item.symbol} value={item.symbol}>{item.name} · {item.symbol}</option>)}</select></div><div className="chart-price">{priceFmt(asset.price)} <span className={asset.change >= 0 ? 'up' : 'down'}>{asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%</span><small>past 24 hours</small></div><PriceChart seed={asset.price} /></section>
        <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><div className="eyebrow">MARKET WATCH</div><h2>Top markets</h2></div><button className="link-button" onClick={() => go('markets')}>All markets →</button></div><MarketTable rows={assets.slice(0, 4)} compact /></section>{orderForm()}</div>
        <section className="panel recent-panel"><div className="panel-heading"><div><div className="eyebrow">YOUR ACCOUNT</div><h2>Recent activity</h2></div><button className="link-button" onClick={() => go('history')}>View history →</button></div><Activity orders={(account.orders || []).slice(0, 3)} emptyText="Your demo orders will appear here." /></section></>}

      {page === 'markets' && <><PageHeading eyebrow="EXPLORE DIGITAL ASSETS" title="Markets" text="Follow prices and discover assets to trade." /><section className="panel market-page"><div className="market-controls"><div><div className="eyebrow">SPOT MARKETS</div><h2>All assets</h2></div><input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="⌕  Search assets" aria-label="Search assets" /></div><MarketTable /></section></>}

      {page === 'trade' && <><PageHeading eyebrow="BUY AND SELL DIGITAL ASSETS" title="Trade" text="Place a simulated market order using your demo balance." /><div className="trade-layout">{orderForm()}<section className="panel trade-info"><div className="eyebrow">MARKET PRICES</div><h2>Live demo prices</h2><p>Prices update periodically and are generated for practice. They are not exchange quotes.</p>{assets.map((item) => <button className={`price-row ${selected === item.symbol ? 'chosen' : ''}`} key={item.symbol} onClick={() => setSelected(item.symbol)}><span className="coin-cell"><Icon className={item.className}>{item.icon}</Icon><span><strong>{item.name}</strong><small>{item.symbol}</small></span></span><span><strong>{priceFmt(item.price)}</strong><small className={item.change >= 0 ? 'up' : 'down'}>{item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%</small></span></button>)}</section></div></>}

      {page === 'wallet' && <><PageHeading eyebrow="YOUR FUNDS" title="Wallet" text="Manage your simulated cash and crypto holdings." action={<span className="demo-tag">DEMO ACCOUNT</span>} /><div className="stats-grid wallet-stats"><article className="stat-card"><div className="stat-label">Total balance</div><div className="stat-amount">{fmt(total)}</div><div className="sub-meta">Across cash and crypto</div></article><article className="stat-card"><div className="stat-label">Cash balance</div><div className="stat-amount">{fmt(account.cash)}</div><div className="sub-meta">Available for demo trading</div></article><article className="stat-card"><div className="stat-label">Crypto value</div><div className="stat-amount">{fmt(invested)}</div><div className="sub-meta">{positions.length} open {positions.length === 1 ? 'position' : 'positions'}</div></article></div><div className="wallet-layout"><section className="panel wallet-panel"><div className="panel-heading"><div><div className="eyebrow">DEMO WALLET</div><h2>Cash movements</h2></div></div><p className="muted-copy">Add or remove virtual USD from your practice wallet. No card or bank details are requested.</p><div className="segmented wallet-tabs"><button className={walletAction === 'deposit' ? 'selected buy' : ''} onClick={() => setWalletAction('deposit')}>＋ Add demo funds</button><button className={walletAction === 'withdraw' ? 'selected sell' : ''} onClick={() => setWalletAction('withdraw')}>− Withdraw demo funds</button></div><form onSubmit={submitWallet}><label className="field-label">Amount in USD</label><div className="amount-control"><span>$</span><input type="number" min="1" step="0.01" placeholder="0.00" value={walletAmount} onChange={(event) => setWalletAmount(event.target.value)} required /><b>USD</b></div><div className="quick-amounts">{[100, 500, 1000].map((value) => <button type="button" key={value} onClick={() => setWalletAmount(String(value))}>${value}</button>)}</div><button className="primary-button wallet-submit" disabled={busy}>{busy ? 'Processing…' : walletAction === 'deposit' ? 'Add demo funds' : 'Withdraw demo funds'} →</button></form><div className="payment-note"><span>ⓘ</span><div><strong>Payment methods are not connected</strong><p>These controls only change your virtual demo balance. Real deposits and withdrawals require a payment provider and verified account setup.</p></div></div></section><section className="panel holdings-panel"><div className="panel-heading"><div><div className="eyebrow">ASSET BREAKDOWN</div><h2>Your holdings</h2></div></div>{positions.length ? positions.map(([symbol, quantity]) => { const item = assets.find((entry) => entry.symbol === symbol); return item && <div className="holding-row" key={symbol}><span className="coin-cell"><Icon className={item.className}>{item.icon}</Icon><span><strong>{item.name}</strong><small>{quantity.toFixed(6)} {symbol}</small></span></span><strong>{fmt(quantity * item.price)}</strong></div>; }) : <div className="empty-state"><span>◉</span><strong>No crypto holdings yet</strong><p>Make a demo trade and your holdings will appear here.</p><button className="link-button" onClick={() => go('trade')}>Go to trade →</button></div>}</section></div></>}

      {page === 'history' && <><PageHeading eyebrow="YOUR ACCOUNT RECORD" title="Activity history" text="Review your recent demo trades and wallet movements." action={<button className="outline-button" onClick={clearHistory}>Clear history</button>} /><section className="panel history-panel"><div className="panel-heading"><div><div className="eyebrow">ALL TRANSACTIONS</div><h2>Activity</h2></div><span className="activity-count">{(account.orders || []).length} records</span></div><Activity orders={account.orders || []} emptyText="Your trades and wallet activity will appear here." /></section></>}

      {page === 'membership' && <><PageHeading eyebrow="YOUR CRYPTORA ACCOUNT" title="Membership" text="A simple overview of your demo account and its current level." /><section className="membership-card"><div className="membership-icon">✦</div><div className="membership-copy"><span className="demo-tag">CURRENT PLAN</span><h2>Explorer</h2><p>Your Cryptora demo membership is ready for practice. Explore markets, try trades, and learn how the portfolio works.</p><div className="member-stats"><div><small>ACCOUNT TYPE</small><strong>Demo</strong></div><div><small>MEMBER SINCE</small><strong>Today</strong></div><div><small>TRADES PLACED</small><strong>{(account.orders || []).filter((order) => order.kind !== 'wallet').length}</strong></div></div><button className="primary-button" onClick={() => go('markets')}>Explore markets →</button></div></section><div className="membership-grid"><article className="panel member-feature"><span>01</span><h3>Practice safely</h3><p>Try the trading flow with virtual USD and simulated fills.</p></article><article className="panel member-feature"><span>02</span><h3>Track your activity</h3><p>Review demo orders and wallet movements in one history.</p></article><article className="panel member-feature"><span>03</span><h3>Learn the basics</h3><p>Follow asset prices and see how a portfolio changes.</p></article></div><p className="membership-footnote">Membership tiers, subscriptions, and paid benefits are not enabled in this demo.</p></>}
      <footer className="footer"><span>© 2026 Cryptora</span><span><i className="live-dot" /> Demo market data · Learning environment</span><button onClick={() => notify('Support information will be added here.')}>Help &amp; support</button></footer>
    </div></main>{toast && <div className="toast" role="status">{toast}</div>}</div>;
}

function Sparkline({ positive = true, seed = 1, large = false }) {
  const data = Array.from({ length: 26 }, (_, index) => Math.sin(index * 0.57 + seed / 23) * 7 + Math.sin(index * 1.3 + seed / 9) * 3 + index * (positive ? 0.49 : -0.31) + 25);
  const points = data.map((value, index) => `${(index / (data.length - 1)) * 100},${32 - value}`).join(' ');
  return <svg className={large ? 'sparkline large' : 'sparkline'} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke={positive ? '#8edb9e' : '#ed7c83'} strokeWidth="1.8" points={points} /></svg>;
}
function PriceChart({ seed }) {
  const values = Array.from({ length: 72 }, (_, i) => Math.sin(i * .21 + seed / 17) * .32 + Math.sin(i * .49 + seed / 19) * .17 + Math.sin(i * .075 + seed / 13) * .35 + i * .009 + (i > 48 ? (i - 48) * .006 : 0));
  const min = Math.min(...values) - .15; const max = Math.max(...values) + .15;
  const points = values.map((value, i) => `${(i / (values.length - 1)) * 100},${100 - ((value - min) / (max - min)) * 86 - 4}`).join(' ');
  return <div className="price-chart"><div className="chart-y-labels"><span>68,000</span><span>67,500</span><span>67,000</span><span>66,500</span></div><div className="chart-drawing"><div className="chart-gridlines"><i /><i /><i /><i /></div><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points={`0,100 ${points} 100,100`} fill="url(#fill)"/><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#aee77c" stopOpacity=".23"/><stop offset="100%" stopColor="#aee77c" stopOpacity="0"/></linearGradient></defs><polyline points={points} fill="none" stroke="#b4e980" strokeWidth=".7" vectorEffect="non-scaling-stroke" /></svg><div className="chart-x-labels"><span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>Now</span></div></div></div>;
}
function Activity({ orders, emptyText }) {
  if (!orders?.length) return <div className="empty-state"><span>◷</span><strong>No activity yet</strong><p>{emptyText}</p></div>;
  return <div className="table-scroll"><table className="data-table activity-table"><thead><tr><th>TYPE</th><th>DETAIL</th><th>AMOUNT</th><th>PRICE</th><th>DATE</th><th>STATUS</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><span className={`type-chip ${order.kind === 'wallet' ? 'wallet-chip' : order.side}`}>{order.kind === 'wallet' ? (order.side === 'deposit' ? 'Deposit' : 'Withdrawal') : order.side}</span></td><td><strong>{order.symbol || 'USD'}</strong>{order.kind !== 'wallet' && <small> · {order.quantity?.toFixed(6)} {order.symbol}</small>}</td><td>{fmt(order.usdAmount)}</td><td>{order.price ? priceFmt(order.price) : '—'}</td><td>{shortDate(order.createdAt)}</td><td><span className="complete-chip">Completed</span></td></tr>)}</tbody></table></div>;
}

export default App;
