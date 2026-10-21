const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const WEB_ROOT = fs.existsSync(path.join(ROOT, 'dist')) ? path.join(ROOT, 'dist') : ROOT;
const PORT = Number(process.env.PORT || 3000);
const assets = [
  {symbol:'BTC',name:'Bitcoin',price:67482.30,change:2.41,icon:'₿',className:'btc'},
  {symbol:'ETH',name:'Ethereum',price:3524.18,change:1.82,icon:'◆',className:'eth'},
  {symbol:'SOL',name:'Solana',price:184.62,change:5.36,icon:'◎',className:'sol'},
  {symbol:'ADA',name:'Cardano',price:0.4821,change:-0.76,icon:'◉',className:'ada'},
  {symbol:'XRP',name:'XRP',price:0.6245,change:0.93,icon:'✕',className:'xrp'},
  {symbol:'DOGE',name:'Dogecoin',price:0.1642,change:-1.24,icon:'Ð',className:'doge'}
];
const account = {cash:10000,positions:{},orders:[]};
const contentTypes = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jsx':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};

function send(res,status,payload,headers={}) {
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type',...headers});
  res.end(JSON.stringify(payload));
}
function snapshot(){ return {cash:account.cash,positions:{...account.positions},orders:[...account.orders]}; }
function readBody(req){return new Promise((resolve,reject)=>{let data='';req.on('data',chunk=>{data+=chunk;if(data.length>10000)reject(new Error('Request body is too large.'));});req.on('end',()=>{try{resolve(JSON.parse(data||'{}'));}catch{reject(new Error('Request body must be valid JSON.'));}});req.on('error',reject);});}
function serveStatic(urlPath,res){
  const requested=urlPath==='/'?'index.html':decodeURIComponent(urlPath.slice(1));
  const filePath=path.resolve(WEB_ROOT,requested);
  if(!filePath.startsWith(WEB_ROOT+path.sep)&&filePath!==WEB_ROOT){res.writeHead(403);return res.end('Forbidden');}
  fs.readFile(filePath,(error,contents)=>{
    if(error){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Not found');}
    res.writeHead(200,{'Content-Type':contentTypes[path.extname(filePath)]||'application/octet-stream','Cache-Control':'no-store'});res.end(contents);
  });
}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type'});return res.end();}
  if(url.pathname==='/api/market'&&req.method==='GET'){
    // Small deterministic movement keeps the demo feeling live without external price feeds.
    for(const asset of assets){asset.price*=1+(Math.random()-.49)*.00035;asset.change=Math.max(-9,Math.min(9,asset.change+(Math.random()-.5)*.025));}
    return send(res,200,{assets,updatedAt:new Date().toISOString()});
  }
  if(url.pathname==='/api/account'&&req.method==='GET')return send(res,200,snapshot());
  if(url.pathname==='/api/orders'&&req.method==='POST'){
    let body;try{body=await readBody(req);}catch(error){return send(res,400,{error:error.message});}
    const {side,symbol}=body;const usdAmount=Number(body.usdAmount);const asset=assets.find(item=>item.symbol===symbol);
    if(!['buy','sell'].includes(side))return send(res,400,{error:'Choose buy or sell to place an order.'});
    if(!asset)return send(res,400,{error:'Choose a supported demo asset.'});
    if(!Number.isFinite(usdAmount)||usdAmount<1)return send(res,400,{error:'Order amount must be at least $1.00.'});
    const quantity=usdAmount/asset.price;const owned=account.positions[symbol]||0;
    if(side==='buy'&&usdAmount>account.cash)return send(res,400,{error:`Insufficient demo balance. You have ${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(account.cash)} available.`});
    if(side==='sell'&&quantity>owned)return send(res,400,{error:`Not enough ${symbol} in your demo portfolio to sell that amount.`});
    if(side==='buy'){account.cash-=usdAmount;account.positions[symbol]=owned+quantity;}else{account.cash+=usdAmount;account.positions[symbol]=owned-quantity;}
    const order={id:crypto.randomUUID(),side,symbol,usdAmount,quantity,price:asset.price,createdAt:new Date().toISOString()};
    account.orders.unshift(order);account.orders=account.orders.slice(0,30);
    return send(res,201,{message:`${side==='buy'?'Bought':'Sold'} ${quantity.toFixed(6)} ${symbol} in demo mode.`,order,account:snapshot()});
  }
  if(url.pathname==='/api/orders'&&req.method==='DELETE'){account.orders=[];return send(res,200,snapshot());}
  if(url.pathname==='/api/wallet'&&req.method==='POST'){
    let body;try{body=await readBody(req);}catch(error){return send(res,400,{error:error.message});}
    const {action}=body;const usdAmount=Number(body.usdAmount);
    if(!['deposit','withdraw'].includes(action))return send(res,400,{error:'Choose add demo funds or withdraw demo funds.'});
    if(!Number.isFinite(usdAmount)||usdAmount<1)return send(res,400,{error:'Amount must be at least $1.00.'});
    if(action==='withdraw'&&usdAmount>account.cash)return send(res,400,{error:`Insufficient demo cash. You have ${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(account.cash)} available.`});
    account.cash+=action==='deposit'?usdAmount:-usdAmount;
    const order={id:crypto.randomUUID(),kind:'wallet',side:action,symbol:'USD',usdAmount,quantity:usdAmount,price:null,createdAt:new Date().toISOString()};
    account.orders.unshift(order);account.orders=account.orders.slice(0,50);
    return send(res,201,{message:action==='deposit'?`Added ${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(usdAmount)} in demo funds.`:`Withdrew ${new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(usdAmount)} from demo funds.`,order,account:snapshot()});
  }
  if(url.pathname.startsWith('/api/'))return send(res,404,{error:'API route not found.'});
  serveStatic(url.pathname,res);
});

server.listen(PORT,()=>console.log(`Cryptora demo is running at http://localhost:${PORT}`));
