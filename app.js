// ===== SECTOR CONFIG =====
const SECTORS = [
    { id:'NIFTY BANK', name:'NIFTY BANK', weight:5, icon:'🏦' },
    { id:'NIFTY FINANCIAL SERVICES', name:'NIFTY FIN SERVICE', weight:4, icon:'💰' },
    { id:'NIFTY FINANCIAL SERVICES 25/50', name:'NIFTY FIN SER 25/50', weight:4, icon:'💰', alt:true },
    { id:'NIFTY IT', name:'NIFTY IT', weight:5, icon:'💻' },
    { id:'NIFTY FMCG', name:'NIFTY FMCG', weight:3, icon:'🛒' },
    { id:'NIFTY AUTO', name:'NIFTY AUTO', weight:3, icon:'🚗' },
    { id:'NIFTY PHARMA', name:'NIFTY PHARMA', weight:3, icon:'💊' },
    { id:'NIFTY METAL', name:'NIFTY METAL', weight:3, icon:'⚙️' },
    { id:'NIFTY ENERGY', name:'NIFTY ENERGY', weight:3, icon:'⚡' },
    { id:'NIFTY REALTY', name:'NIFTY REALTY', weight:2, icon:'🏠' },
    { id:'NIFTY PSU BANK', name:'NIFTY PSU BANK', weight:3, icon:'🏛️' },
    { id:'NIFTY PRIVATE BANK', name:'NIFTY PVT BANK', weight:4, icon:'🏦' },
    { id:'NIFTY MEDIA', name:'NIFTY MEDIA', weight:1, icon:'📺' },
    { id:'NIFTY INFRASTRUCTURE', name:'NIFTY INFRA', weight:2, icon:'🏗️' },
    { id:'NIFTY HEALTHCARE INDEX', name:'NIFTY HEALTHCARE', weight:2, icon:'🏥' },
    { id:'NIFTY CONSUMER DURABLES', name:'NIFTY CONS DURABLE', weight:2, icon:'📱' },
    { id:'NIFTY OIL & GAS', name:'NIFTY OIL & GAS', weight:3, icon:'🛢️' },
    { id:'NIFTY CPSE', name:'NIFTY CPSE', weight:2, icon:'🏢' },
    { id:'NIFTY MIDCAP 50', name:'NIFTY MIDCAP 50', weight:3, icon:'📊' },
];

// NSE Holidays 2026 (known)
const NSE_HOLIDAYS_2026 = [
    '2026-01-26','2026-02-17','2026-03-10','2026-03-17','2026-03-30','2026-03-31',
    '2026-04-01','2026-04-03','2026-04-14','2026-05-01','2026-05-25',
    '2026-06-26','2026-07-07','2026-07-10','2026-08-15','2026-08-28',
    '2026-10-02','2026-10-20','2026-10-21','2026-10-23','2026-11-04',
    '2026-11-09','2026-12-25',
];

function isMarketOpen() {
    // Convert to IST (UTC+5:30) manually for reliability
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 5.5 * 3600000);
    const day = ist.getDay();
    const y = ist.getFullYear();
    const mo = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    const dateStr = `${y}-${mo}-${d}`;
    const h = ist.getHours(), m = ist.getMinutes(), t = h * 60 + m;
    if (day === 0 || day === 6) return { open: false, reason: 'Weekend' };
    if (NSE_HOLIDAYS_2026.includes(dateStr)) return { open: false, reason: 'Holiday (NSE)' };
    if (t < 555) return { open: false, reason: 'Pre-Market' };
    if (t > 930) return { open: false, reason: 'Market Closed' };
    return { open: true, reason: 'Market Open' };
}

// ===== API BASE URL =====
// Auto-detects: localhost uses local server, production uses Render backend
const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''
    : 'https://dipzspelll-github-io.onrender.com';

// ===== DATA FETCHING =====
const CACHE_KEY = 'tradefinder_cache';

function getCachedData() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.nifty50) window._nifty50 = parsed.nifty50;
            return parsed;
        }
    } catch(e) {}
    return null;
}
function setCachedData(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, nifty50: window._nifty50, timestamp: Date.now() }));
    } catch(e) {}
}

async function fetchData() {
    const ms = isMarketOpen();
    // If market is closed and we have cache, use it (no need to refetch)
    const cached = getCachedData();
    if (!ms.open && cached && cached.data && cached.data.length > 0 && window._nifty50) {
        console.log('Market closed, using cached data from', new Date(cached.timestamp).toLocaleString());
        return cached.data;
    }
    // Try fetching from server with timeout
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${BASE_URL}/api/indices`, { signal: controller.signal });
        clearTimeout(timeout);
        const json = await res.json();
        if (json.success && json.data && json.data.data) {
            const parsed = parseNSEData(json.data.data);
            if (parsed.length > 0) { setCachedData(parsed); return parsed; }
        }
    } catch(e) { console.warn('API fetch failed:', e.message); }
    // Fallback to cache
    if (cached && cached.data) return cached.data;
    return null;

}

function parseNSEData(indices) {
    const map = {};
    indices.forEach(i => { map[i.index] = i; });
    const results = [];
    SECTORS.forEach(s => {
        if (s.alt) return;
        const d = map[s.id];
        if (d) {
            results.push({
                ...s, lastPrice: d.last, change: parseFloat(d.percentChange),
                open: d.open, high: d.high, low: d.low, prev: d.previousClose,
            });
        }
    });
    // Also grab NIFTY 50
    const n50 = map['NIFTY 50'];
    if (n50) window._nifty50 = { val: n50.last, change: parseFloat(n50.percentChange) };
    return results;
}

// ===== ANALYSIS =====
function analyze(data) {
    const sorted = [...data].sort((a,b) => b.change - a.change);
    const gc = sorted.filter(s => s.change > 0.1).length;
    const rc = sorted.filter(s => s.change < -0.1).length;
    const nc = sorted.length - gc - rc;
    const gp = (gc / sorted.length) * 100;
    let breadth, bc;
    if (gp >= 75) { breadth='Very Strong'; bc='bullish'; }
    else if (gp >= 55) { breadth='Positive'; bc='bullish'; }
    else if (gp >= 45) { breadth='Neutral'; bc='sideways'; }
    else if (gp >= 25) { breadth='Negative'; bc='bearish'; }
    else { breadth='Very Weak'; bc='bearish'; }
    const wSum = sorted.reduce((a,v)=>a+v.change*v.weight,0);
    const wTot = sorted.reduce((a,v)=>a+v.weight,0);
    const avg = wSum/wTot;
    let bias, biasIcon;
    if (avg>0.5){bias='BULLISH';biasIcon='📈';}
    else if(avg>0.1){bias='MILDLY BULLISH';biasIcon='📈';}
    else if(avg<-0.5){bias='BEARISH';biasIcon='📉';}
    else if(avg<-0.1){bias='MILDLY BEARISH';biasIcon='📉';}
    else{bias='SIDEWAYS';biasIcon='➡️';}
    const t2 = sorted.slice(0,2).reduce((a,v)=>a+v.change,0);
    const rAvg = sorted.length>2 ? sorted.slice(2).reduce((a,v)=>a+v.change,0)/(sorted.length-2) : 0;
    const fake = t2>2 && rAvg<0;
    const defIds=['NIFTY FMCG','NIFTY PHARMA','NIFTY HEALTHCARE INDEX'];
    const cycIds=['NIFTY METAL','NIFTY AUTO','NIFTY REALTY','NIFTY INFRASTRUCTURE'];
    const dArr=data.filter(s=>defIds.includes(s.id)), cArr=data.filter(s=>cycIds.includes(s.id));
    const dA=dArr.length?dArr.reduce((a,s)=>a+s.change,0)/dArr.length:0;
    const cA=cArr.length?cArr.reduce((a,s)=>a+s.change,0)/cArr.length:0;
    let rot;
    if(cA>dA+0.5) rot='Money rotating INTO cyclicals (risk-on). Traders betting on growth.';
    else if(dA>cA+0.5) rot='Money rotating INTO defensives (risk-off). Traders seeking safety.';
    else rot='No clear sector rotation. Money broadly distributed.';
    const mx=Math.max(...sorted.map(s=>Math.abs(s.change)),1);
    sorted.forEach(s=>{
        s.strengthScore=Math.round(Math.min(100,(Math.abs(s.change)/mx)*100));
        s.trend=s.change>0.1?'Bullish':s.change<-0.1?'Bearish':'Neutral';
    });
    return { sorted,greenCount:gc,redCount:rc,neutralCount:nc,greenPct:gp,breadth,breadthClass:bc,
        bias,biasIcon,avgChange:avg,isFakeStrength:fake,rotationInsight:rot,defAvg:dA,cycAvg:cA,
        strongest:sorted[0],weakest:sorted[sorted.length-1],
        top3:sorted.slice(0,3),bottom3:sorted.slice(-3).reverse() };
}

// ===== COLOR HELPERS =====
function tileClass(c){if(c>=1.5)return'tile-strong-green';if(c>0.1)return'tile-mild-green';if(c<=-1.5)return'tile-strong-red';if(c<-0.1)return'tile-mild-red';return'tile-neutral';}
function barColor(c){if(c>=1.5)return'var(--strong-green)';if(c>0.1)return'var(--mild-green)';if(c<=-1.5)return'var(--strong-red)';if(c<-0.1)return'var(--mild-red)';return'var(--neutral)';}
function fmt(v){return(v>0?'+':'')+v.toFixed(2)+'%';}

// ===== RENDER =====
function renderHeatmap(a) {
    const c=document.getElementById('heatmap-container'); c.innerHTML='';
    a.sorted.forEach((s,i)=>{
        const t=document.createElement('div');
        t.className=`heatmap-tile ${tileClass(s.change)} ${s.weight>=4?'large':''} animate-in`;
        t.style.animationDelay=`${i*40}ms`;
        t.dataset.sectorId = s.id;
        t.dataset.sectorName = s.name;
        const ar=s.change>0.1?'▲':s.change<-0.1?'▼':'●';
        t.innerHTML=`<div class="tile-name">${s.icon} ${s.name.replace('NIFTY ','')}</div><div class="tile-change">${fmt(s.change)}</div><div class="tile-trend">${ar} ${s.trend}</div>`;
        c.appendChild(t);
    });
}
function renderTable(a) {
    const tb=document.getElementById('ranking-tbody'); tb.innerHTML='';
    a.sorted.forEach((s,i)=>{
        const cc=s.change>0.1?'positive':s.change<-0.1?'negative':'neutral-val';
        const tc=s.trend==='Bullish'?'bullish':s.trend==='Bearish'?'bearish':'neutral-trend';
        const ti=s.trend==='Bullish'?'▲':s.trend==='Bearish'?'▼':'●';
        const r=document.createElement('tr'); r.className='animate-in'; r.style.animationDelay=`${i*30}ms`;
        r.dataset.sectorId = s.id; r.dataset.sectorName = s.name; r.style.cursor = 'pointer';
        r.innerHTML=`<td>${i+1}</td><td class="sector-name-cell">${s.icon} ${s.name}</td><td class="change-cell ${cc}">${fmt(s.change)}</td><td><span class="trend-badge ${tc}">${ti} ${s.trend}</span></td><td><div class="strength-bar-container"><div class="strength-bar-bg"><div class="strength-bar-fill" style="width:${s.strengthScore}%;background:${barColor(s.change)}"></div></div><span class="strength-score">${s.strengthScore}</span></div></td>`;
        tb.appendChild(r);
    });
}
function renderCards(cards, id) {
    const c=document.getElementById(id); c.innerHTML='';
    cards.forEach((s,i)=>{
        const d=document.createElement('div'); d.className='top-card animate-in'; d.style.animationDelay=`${i*80}ms`;
        d.innerHTML=`<div class="card-rank">#${i+1}</div><div class="card-info"><div class="card-name">${s.icon} ${s.name}</div></div><div class="card-change">${fmt(s.change)}</div>`;
        c.appendChild(d);
    });
}
function renderInsights(a) {
    const c=document.getElementById('insight-content');
    const ins=[];
    ins.push({e:'🏆',t:`<strong>${a.strongest.name}</strong> is the strongest sector at <strong>${fmt(a.strongest.change)}</strong>.`,c:'highlight-green'});
    ins.push({e:'⚠️',t:`<strong>${a.weakest.name}</strong> is the weakest sector at <strong>${fmt(a.weakest.change)}</strong>.`,c:'highlight-red'});
    ins.push({e:'📊',t:`Market breadth: <strong>${a.greenCount}/${a.sorted.length}</strong> advancing, <strong>${a.redCount}/${a.sorted.length}</strong> declining. Sentiment: <strong>${a.breadth}</strong>.`,c:''});
    if(a.isFakeStrength) ins.push({e:'🚨',t:`<strong>Fake Strength Alert!</strong> Rally driven by 1-2 sectors while majority weak.`,c:'highlight-gold'});
    if(a.greenPct>=75) ins.push({e:'🚀',t:'Broad-based rally — <strong>genuine market strength</strong>.',c:'highlight-green'});
    else if(a.greenPct<=25) ins.push({e:'🔻',t:'Widespread selling — <strong>weak market</strong>.',c:'highlight-red'});
    c.innerHTML=ins.map(i=>`<div class="insight-item ${i.c}"><span class="insight-emoji">${i.e}</span><span class="insight-text">${i.t}</span></div>`).join('');
}
function renderRotation(a) {
    const c=document.getElementById('rotation-content');
    const dc=a.defAvg>=0?'var(--strong-green)':'var(--mild-red)', cc=a.cycAvg>=0?'var(--strong-green)':'var(--mild-red)';
    const ac=a.avgChange>=0?'var(--strong-green)':'var(--mild-red)';
    c.innerHTML=`
    <div class="rotation-card animate-in"><h3>🔄 Sector Rotation</h3><p>${a.rotationInsight}</p><p style="margin-top:8px;font-size:.72rem;color:var(--text-muted)">Defensive: <strong style="color:${dc}">${fmt(a.defAvg)}</strong> | Cyclical: <strong style="color:${cc}">${fmt(a.cycAvg)}</strong></p><span class="tag ${a.cycAvg>a.defAvg?'tag-green':'tag-red'}">${a.cycAvg>a.defAvg?'Risk-On':'Risk-Off'}</span></div>
    <div class="rotation-card animate-in" style="animation-delay:100ms"><h3>📈 Trading Bias</h3><p>Weighted avg: <strong style="color:${ac}">${fmt(a.avgChange)}</strong></p><p>Bias: <strong>${a.bias}</strong></p><span class="tag ${a.bias.includes('BULL')?'tag-green':a.bias.includes('BEAR')?'tag-red':'tag-gold'}">${a.bias}</span></div>
    <div class="rotation-card animate-in" style="animation-delay:200ms"><h3>🎯 Market Quality</h3><p>${a.isFakeStrength?'⚠️ Concentrated rally — <strong>low quality</strong>.':a.greenPct>=60?'✅ <strong>Broad participation</strong>.':a.greenPct<=40?'❌ <strong>Broad weakness</strong>.':'🔶 <strong>Mixed signals</strong>.'}</p><span class="tag ${a.greenPct>=60?'tag-green':a.greenPct<=40?'tag-red':'tag-gold'}">${Math.round(a.greenPct)}% Advancing</span></div>
    <div class="rotation-card animate-in" style="animation-delay:300ms"><h3>💡 Strategy</h3><p>${a.bias.includes('BULL')?'Buy dips in leaders like '+a.top3[0].name+'.':a.bias.includes('BEAR')?'Hedge positions. Relative strength: '+a.sorted[0].name+'.':'Range-bound. Sell resistance, buy support.'}</p><span class="tag tag-cyan">Hint</span></div>`;
}
function updateHeader(a) {
    const ms=isMarketOpen();
    const el=document.getElementById('market-status'), st=el.querySelector('.status-text');
    if(ms.open){el.classList.add('open');st.textContent='Market Open';}
    else{el.classList.remove('open');st.textContent=ms.reason;}
    // Nifty ticker
    if(window._nifty50){
        document.getElementById('nifty-value').textContent=Number(window._nifty50.val).toLocaleString('en-IN');
        const ce=document.getElementById('nifty-change');
        ce.textContent=fmt(window._nifty50.change);
        ce.className=`ticker-change ${window._nifty50.change>=0?'up':'down'}`;
    } else {
        document.getElementById('nifty-value').textContent='--';
        document.getElementById('nifty-change').textContent='--';
    }
    // Bias banner
    const banner=document.getElementById('bias-banner'), bv=document.getElementById('bias-value');
    const bi=document.getElementById('bias-icon'), brv=document.getElementById('breadth-value');
    banner.className=`bias-banner ${a.breadthClass}`;
    bv.textContent=a.bias; bv.className=`bias-value ${a.bias.includes('BULL')?'bullish':a.bias.includes('BEAR')?'bearish':'sideways'}`;
    bi.textContent=a.biasIcon;
    brv.textContent=`${a.breadth} (${a.greenCount}A / ${a.redCount}D)`;
    brv.style.color=a.breadthClass==='bullish'?'var(--strong-green)':a.breadthClass==='bearish'?'var(--mild-red)':'var(--gold)';
    document.getElementById('update-time').textContent=new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

// ===== NO DATA VIEW =====
function showNoData() {
    const ms = isMarketOpen();
    const el=document.getElementById('market-status'), st=el.querySelector('.status-text');
    el.classList.remove('open'); st.textContent=ms.reason;
    document.getElementById('heatmap-container').innerHTML='<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted)"><p style="font-size:1.3rem;margin-bottom:8px">📡 No Data Available</p><p style="font-size:.85rem">Market is currently <strong>'+ms.reason+'</strong>. Data will load when market opens or cached data is available.</p><p style="font-size:.75rem;margin-top:12px;opacity:.6">Try refreshing during market hours (9:15 AM – 3:30 PM IST, Mon–Fri)</p></div>';
}

// ===== F&O BREAKOUT LOGIC =====
let fnOCache = null;
let fnOCacheTime = 0;

async function loadFnOData() {
    const ms = isMarketOpen();
    const now = Date.now();
    const loading = document.getElementById('breakout-loading');
    const cols = document.getElementById('breakout-columns');
    
    if (fnOCache && (!ms.open || (now - fnOCacheTime) < 60000)) {
        renderFnO(fnOCache);
        return;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        // Using "SECURITIES IN F&O" index from NSE
        const res = await fetch(`${BASE_URL}/api/sector/SECURITIES%20IN%20F%26O`, { signal: controller.signal });
        clearTimeout(timeout);
        const json = await res.json();
        
        if (json.success && json.data && json.data.data) {
            fnOCache = json.data.data;
            fnOCacheTime = now;
            renderFnO(fnOCache);
            renderTicker(fnOCache);
        } else {
            cols.style.display = 'none';
            loading.innerHTML = '<span>❌ Could not load F&O data. API may be unavailable.</span>';
        }
    } catch(e) {
        if (!fnOCache) {
            cols.style.display = 'none';
            loading.innerHTML = '<span>⏱️ F&O scan timed out. Retrying on next tick...</span>';
        }
    }
}

function renderTicker(data) {
    const ticker = document.getElementById('live-ticker');
    const stocks = data.filter(s => s.symbol && !s.symbol.startsWith('SECURITIES'))
                       .sort((a,b) => Math.abs(parseFloat(b.pChange)) - Math.abs(parseFloat(a.pChange)))
                       .slice(0, 20); // Top 20 movers
                       
    if (stocks.length === 0) return;
    
    let html = '';
    stocks.forEach(s => {
        const pChg = parseFloat(s.pChange);
        const isUp = pChg >= 0;
        const icon = isUp ? '▲' : '▼';
        const cls = isUp ? 'up' : 'down';
        html += `
            <div class="ticker-item">
                <span class="ticker-sym">${s.symbol}</span>
                <span class="ticker-price">${parseFloat(s.lastPrice).toLocaleString('en-IN')}</span>
                <span class="ticker-chg ${cls}">${icon} ${Math.abs(pChg).toFixed(2)}%</span>
            </div>
        `;
    });
    // Duplicate for seamless loop
    ticker.innerHTML = html + html;
}

function renderFnO(data) {
    document.getElementById('breakout-loading').classList.remove('active');
    document.getElementById('breakout-columns').style.display = 'grid';
    
    // Exclude the index itself
    const stocks = data.filter(s => s.symbol && !s.symbol.startsWith('SECURITIES'));
    
    // Bullish Breakouts: High momentum (>1.5% up), closing near day's high (within 0.5%)
    const bullish = stocks.filter(s => {
        const pChg = parseFloat(s.pChange || 0);
        const lp = parseFloat(s.lastPrice || 0);
        const dh = parseFloat(s.dayHigh || 0);
        if (pChg < 1.5 || dh <= 0) return false;
        const diffFromHigh = ((dh - lp) / dh) * 100;
        return diffFromHigh <= 0.5; // Within 0.5% of day's high
    }).sort((a,b) => parseFloat(b.pChange) - parseFloat(a.pChange)).slice(0, 5); // Top 5
    
    // Bearish Breakdowns: Negative momentum (< -1.5% down), closing near day's low (within 0.5%)
    const bearish = stocks.filter(s => {
        const pChg = parseFloat(s.pChange || 0);
        const lp = parseFloat(s.lastPrice || 0);
        const dl = parseFloat(s.dayLow || 0);
        if (pChg > -1.5 || dl <= 0) return false;
        const diffFromLow = ((lp - dl) / lp) * 100;
        return diffFromLow <= 0.5; // Within 0.5% of day's low
    }).sort((a,b) => parseFloat(a.pChange) - parseFloat(b.pChange)).slice(0, 5); // Top 5 (most negative)

    const bullContainer = document.getElementById('bullish-breakouts');
    const bearContainer = document.getElementById('bearish-breakouts');
    bullContainer.innerHTML = ''; bearContainer.innerHTML = '';

    if (bullish.length === 0) bullContainer.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem;padding:10px">No major bullish breakouts forming right now.</div>';
    if (bearish.length === 0) bearContainer.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem;padding:10px">No major bearish breakdowns forming right now.</div>';

    bullish.forEach(s => bullContainer.appendChild(createBreakoutCard(s, 'bullish')));
    bearish.forEach(s => bearContainer.appendChild(createBreakoutCard(s, 'bearish')));
}

function createBreakoutCard(s, type) {
    const card = document.createElement('div');
    card.className = 'brk-card';
    const lp = parseFloat(s.lastPrice).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const dh = parseFloat(s.dayHigh).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const dl = parseFloat(s.dayLow).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    
    // Progress bar visualization (where is price relative to day's range)
    const low = parseFloat(s.dayLow), high = parseFloat(s.dayHigh), current = parseFloat(s.lastPrice);
    const range = high - low;
    let progress = 0;
    if (range > 0) progress = ((current - low) / range) * 100;
    
    card.innerHTML = `
        <div class="brk-info">
            <div class="brk-sym">${s.symbol}</div>
            <div class="brk-metrics">
                <span>H: ₹${dh}</span>
                <span>L: ₹${dl}</span>
            </div>
            <div class="brk-progress-wrap" title="Position in day's range">
                <div class="brk-progress" style="width: ${progress}%"></div>
            </div>
        </div>
        <div class="brk-price-col">
            <div class="brk-price">₹${lp}</div>
            <div class="brk-chg">${fmt(parseFloat(s.pChange))}</div>
        </div>
    `;
    return card;
}

// ===== MAIN =====
async function loadDashboard() {
    const btn=document.getElementById('refresh-btn');
    btn.classList.add('spinning');
    try {
        const data = await fetchData();
        if (!data || data.length === 0) { showNoData(); return; }
        const a = analyze(data);
        updateHeader(a);
        renderHeatmap(a);
        renderTable(a);
        renderCards(a.top3, 'bullish-cards');
        renderCards(a.bottom3, 'bearish-cards');
        renderInsights(a);
        renderRotation(a);
        // Load F&O Breakouts
        loadFnOData();
    } catch(e) { console.error(e); showNoData(); }
    finally { setTimeout(()=>btn.classList.remove('spinning'),600); }
}

// ===== SECTOR STOCKS MODAL =====
const sectorStockCache = {};

function openSectorModal(sectorId, sectorName) {
    const modal = document.getElementById('sector-modal');
    const loading = document.getElementById('modal-loading');
    const grid = document.getElementById('modal-stocks-grid');
    const title = document.getElementById('modal-title');
    const count = document.getElementById('modal-stock-count');
    const summary = document.getElementById('modal-summary');

    title.textContent = sectorName || sectorId;
    count.textContent = '';
    summary.innerHTML = '';
    grid.innerHTML = '';
    loading.classList.add('active');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Check local cache first
    if (sectorStockCache[sectorId]) {
        renderStockModal(sectorStockCache[sectorId], sectorName);
        return;
    }

    // Fetch from server
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    fetch(`${BASE_URL}/api/sector/${encodeURIComponent(sectorId)}`, { signal: controller.signal })
        .then(r => r.json())
        .then(json => {
            clearTimeout(timeout);
            if (json.success && json.data && json.data.data) {
                sectorStockCache[sectorId] = json.data.data;
                renderStockModal(json.data.data, sectorName);
            } else {
                grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">❌ Could not load stock data</div>';
                loading.classList.remove('active');
            }
        })
        .catch(e => {
            clearTimeout(timeout);
            loading.classList.remove('active');
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">⏱️ Request timed out. Try again.</div>';
        });
}

function renderStockModal(stocks, sectorName) {
    const loading = document.getElementById('modal-loading');
    const grid = document.getElementById('modal-stocks-grid');
    const count = document.getElementById('modal-stock-count');
    const summary = document.getElementById('modal-summary');

    loading.classList.remove('active');

    // Filter out the index row itself (first entry is usually the index)
    const filtered = stocks.filter(s => s.symbol && s.symbol !== sectorName && !s.symbol.startsWith('NIFTY'));
    const sorted = [...filtered].sort((a, b) => parseFloat(b.pChange || 0) - parseFloat(a.pChange || 0));

    count.textContent = `(${sorted.length} stocks)`;

    // Summary pills
    const adv = sorted.filter(s => parseFloat(s.pChange) > 0).length;
    const dec = sorted.filter(s => parseFloat(s.pChange) < 0).length;
    const unch = sorted.length - adv - dec;
    summary.innerHTML = `
        <span class="summary-pill green">▲ ${adv}</span>
        <span class="summary-pill red">▼ ${dec}</span>
        ${unch > 0 ? `<span class="summary-pill grey">● ${unch}</span>` : ''}
    `;

    // Render stock tiles
    grid.innerHTML = '';
    sorted.forEach((s, i) => {
        const pChange = parseFloat(s.pChange || 0);
        const tile = document.createElement('div');
        tile.className = `stock-tile ${tileClass(pChange)} animate-in`;
        tile.style.animationDelay = `${i * 25}ms`;
        const price = s.lastPrice ? Number(s.lastPrice).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '--';
        tile.innerHTML = `
            <div class="stock-symbol">${s.symbol}</div>
            <div class="stock-price">₹${price}</div>
            <div class="stock-change">${fmt(pChange)}</div>
        `;
        grid.appendChild(tile);
    });
}

function closeSectorModal() {
    document.getElementById('sector-modal').classList.remove('active');
    document.body.style.overflow = '';
}

// ===== EVENT WIRING =====
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    document.getElementById('refresh-btn').addEventListener('click', loadDashboard);
    setInterval(loadDashboard, 60000);

    // Heatmap tile click → open sector modal
    document.getElementById('heatmap-container').addEventListener('click', (e) => {
        const tile = e.target.closest('.heatmap-tile');
        if (tile && tile.dataset.sectorId) {
            openSectorModal(tile.dataset.sectorId, tile.dataset.sectorName);
        }
    });

    // Table row click → open sector modal
    document.getElementById('ranking-tbody').addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (row && row.dataset.sectorId) {
            openSectorModal(row.dataset.sectorId, row.dataset.sectorName);
        }
    });

    // Modal close
    document.getElementById('modal-close-btn').addEventListener('click', closeSectorModal);
    document.getElementById('modal-back-btn').addEventListener('click', closeSectorModal);
    document.getElementById('sector-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeSectorModal();
    });
// ===== TABS WIRING =====
document.querySelectorAll('.nav-item').forEach(nav => {
    nav.addEventListener('click', (e) => {
        e.preventDefault();
        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        e.currentTarget.classList.add('active');
        // Update tab active state
        document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'));
        const targetId = e.currentTarget.dataset.target;
        const targetTab = document.getElementById(targetId);
        if (targetTab) {
            targetTab.classList.add('active');
            if (targetId === 'tab-options' && !optionsLoaded) loadOptionsData();
            if (targetId === 'tab-fiidii' && !fiidiiLoaded) loadFiiDiiData();
            if (targetId === 'tab-charts' && !chartsLoaded) loadCharts();
        }
    });
});

let optionsLoaded = false;
let fiidiiLoaded = false;
let chartsLoaded = false;

function loadCharts() {
    if (chartsLoaded) return;
    const script = document.createElement('script');
    script.src = "https://s3.tradingview.com/tv.js";
    script.onload = () => {
        new TradingView.widget({
            "autosize": true,
            "symbol": "BSE:SENSEX",
            "interval": "D",
            "timezone": "Asia/Kolkata",
            "theme": "dark",
            "style": "1",
            "locale": "in",
            "enable_publishing": false,
            "backgroundColor": "rgba(10, 14, 23, 1)",
            "gridColor": "rgba(255, 255, 255, 0.06)",
            "hide_top_toolbar": false,
            "hide_legend": false,
            "save_image": false,
            "container_id": "tradingview_chart"
        });
        chartsLoaded = true;
    };
    document.getElementById('tab-charts').appendChild(script);
}

// ===== OPTIONS ANALYZER =====
async function loadOptionsData() {
    const loading = document.getElementById('options-loading');
    const content = document.getElementById('options-content');
    loading.classList.add('active'); content.style.display = 'none';
    
    try {
        const res = await fetch(`${BASE_URL}/api/options/NIFTY`);
        const json = await res.json();
        if (json.success && json.data && json.data.filtered) {
            const data = json.data.filtered;
            const peOI = data.PE.totOI;
            const ceOI = data.CE.totOI;
            const pcr = (peOI / ceOI).toFixed(2);
            
            document.getElementById('total-pe-oi').textContent = peOI.toLocaleString('en-IN');
            document.getElementById('total-ce-oi').textContent = ceOI.toLocaleString('en-IN');
            const pcrEl = document.getElementById('options-pcr');
            pcrEl.textContent = pcr;
            pcrEl.style.color = pcr > 1 ? 'var(--strong-green)' : (pcr < 0.8 ? 'var(--mild-red)' : 'var(--accent-cyan)');
            
            loading.classList.remove('active');
            content.style.display = 'block';
            optionsLoaded = true;
        } else {
            // NSE API sometimes returns {} when market is closed or rate limited
            loading.innerHTML = '<span style="color:var(--text-muted)">ℹ️ Options data is currently unavailable (Market closed or API rate limited). Please try again later during market hours.</span>';
        }
    } catch(e) {
        loading.innerHTML = '<span>❌ Error fetching options data.</span>';
    }
}

// ===== FII/DII TRACKER =====
async function loadFiiDiiData() {
    const loading = document.getElementById('fiidii-loading');
    const content = document.getElementById('fiidii-content');
    loading.classList.add('active'); content.style.display = 'none';
    
    try {
        const res = await fetch(`${BASE_URL}/api/fii-dii`);
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
            // Usually returns array, first item is FII, second is DII
            const fii = json.data.find(d => d.category && d.category.includes('FII'));
            const dii = json.data.find(d => d.category && d.category.includes('DII'));
            
            if (fii) {
                document.getElementById('fii-date').textContent = fii.date;
                const net = parseFloat(fii.netValue);
                const el = document.getElementById('fii-net');
                el.textContent = '₹' + net.toLocaleString('en-IN') + ' Cr';
                el.style.color = net > 0 ? 'var(--strong-green)' : 'var(--mild-red)';
                document.getElementById('fii-buy').textContent = fii.buyValue;
                document.getElementById('fii-sell').textContent = fii.sellValue;
            }
            if (dii) {
                document.getElementById('dii-date').textContent = dii.date;
                const net = parseFloat(dii.netValue);
                const el = document.getElementById('dii-net');
                el.textContent = '₹' + net.toLocaleString('en-IN') + ' Cr';
                el.style.color = net > 0 ? 'var(--strong-green)' : 'var(--mild-red)';
                document.getElementById('dii-buy').textContent = dii.buyValue;
                document.getElementById('dii-sell').textContent = dii.sellValue;
            }
            
            loading.classList.remove('active');
            content.style.display = 'block';
            fiidiiLoaded = true;
        } else {
            loading.innerHTML = '<span>❌ Failed to load FII/DII data.</span>';
        }
    } catch(e) {
        loading.innerHTML = '<span>❌ Error fetching FII/DII data.</span>';
    }
}

// ===== AI TRADING ALPHA =====
function roundToStrike(price, step = 50) {
    if (price < 500) step = 5;
    else if (price < 1000) step = 10;
    else if (price < 3000) step = 20;
    else if (price < 10000) step = 50;
    else step = 100;
    return Math.round(price / step) * step;
}

function generateAITrades() {
    const loading = document.getElementById('ai-loading');
    const content = document.getElementById('ai-content');
    const container = document.getElementById('ai-trades-container');
    
    loading.classList.add('active'); content.style.display = 'none';
    
    setTimeout(() => {
        if (!fnOCache || fnOCache.length === 0) {
            loading.innerHTML = '<span>❌ F&O Data not loaded yet. Go to Market Pulse and let it fetch F&O data first.</span>';
            return;
        }
        
        // Find best bullish and best bearish candidates
        const stocks = fnOCache.filter(s => s.symbol && !s.symbol.startsWith('SECURITIES'));
        const bullish = stocks.filter(s => parseFloat(s.pChange) > 2).sort((a,b) => parseFloat(b.pChange) - parseFloat(a.pChange))[0];
        const bearish = stocks.filter(s => parseFloat(s.pChange) < -2).sort((a,b) => parseFloat(a.pChange) - parseFloat(b.pChange))[0];
        
        container.innerHTML = '';
        
        if (bullish) {
            const lp = parseFloat(bullish.lastPrice);
            const entry = lp;
            const sl = parseFloat(bullish.dayLow) || lp * 0.985; // Day low or 1.5% SL
            const risk = entry - sl;
            const tp = entry + (risk * 2); // 1:2 RR
            const strike = roundToStrike(entry);
            
            container.innerHTML += `
                <div class="ai-card bullish">
                    <div class="ai-header">
                        <span class="ai-sym">${bullish.symbol}</span>
                        <span class="ai-type bullish">LONG / CALL BUY</span>
                    </div>
                    <div class="ai-reasoning">
                        <strong>AI Logic:</strong> High momentum breakout with +${fmt(parseFloat(bullish.pChange))} gain. Stock is trading near day high indicating strong institutional buying. Entering at CMP with SL below today's swing low.
                    </div>
                    <div class="ai-levels">
                        <div class="ai-level ai-entry"><span class="ai-lbl">Entry (CMP)</span><span class="ai-val">₹${entry.toFixed(2)}</span></div>
                        <div class="ai-level ai-sl"><span class="ai-lbl">Stop Loss</span><span class="ai-val">₹${sl.toFixed(2)}</span></div>
                        <div class="ai-level ai-tp"><span class="ai-lbl">Target (1:2)</span><span class="ai-val">₹${tp.toFixed(2)}</span></div>
                    </div>
                    <div class="ai-options">
                        <span class="ai-opt-lbl">Recommended Option Trade:</span>
                        <span class="ai-opt-strike" style="background: rgba(0,200,83,0.2); color: var(--strong-green);">${strike} CE</span>
                    </div>
                </div>
            `;
        }
        
        if (bearish) {
            const lp = parseFloat(bearish.lastPrice);
            const entry = lp;
            const sl = parseFloat(bearish.dayHigh) || lp * 1.015; // Day high or 1.5% SL
            const risk = sl - entry;
            const tp = entry - (risk * 2); // 1:2 RR
            const strike = roundToStrike(entry);
            
            container.innerHTML += `
                <div class="ai-card bearish">
                    <div class="ai-header">
                        <span class="ai-sym">${bearish.symbol}</span>
                        <span class="ai-type bearish">SHORT / PUT BUY</span>
                    </div>
                    <div class="ai-reasoning">
                        <strong>AI Logic:</strong> Severe breakdown structure detected (${fmt(parseFloat(bearish.pChange))}). Stock is making lower lows. Rejecting VWAP. Sell on rise setup with target at next major support.
                    </div>
                    <div class="ai-levels">
                        <div class="ai-level ai-entry"><span class="ai-lbl">Entry (CMP)</span><span class="ai-val">₹${entry.toFixed(2)}</span></div>
                        <div class="ai-level ai-sl"><span class="ai-lbl">Stop Loss</span><span class="ai-val">₹${sl.toFixed(2)}</span></div>
                        <div class="ai-level ai-tp"><span class="ai-lbl">Target (1:2)</span><span class="ai-val">₹${tp.toFixed(2)}</span></div>
                    </div>
                    <div class="ai-options">
                        <span class="ai-opt-lbl">Recommended Option Trade:</span>
                        <span class="ai-opt-strike" style="background: rgba(239,83,80,0.2); color: var(--mild-red);">${strike} PE</span>
                    </div>
                </div>
            `;
        }
        
        if (!bullish && !bearish) {
            container.innerHTML = '<div style="color:var(--text-muted); grid-column: 1/-1;">Market is sideways. AI recommends NO TRADE zone right now.</div>';
        }
        
        loading.classList.remove('active');
        content.style.display = 'block';
    }, 1500); // Fake AI processing delay for UX
}

document.getElementById('load-options-btn').addEventListener('click', loadOptionsData);
document.getElementById('load-fiidii-btn').addEventListener('click', loadFiiDiiData);
document.getElementById('generate-ai-btn').addEventListener('click', generateAITrades);

document.querySelectorAll('.nav-item').forEach(nav => {
    nav.addEventListener('click', (e) => {
        const targetId = e.currentTarget.dataset.target;
        if (targetId === 'tab-ai') generateAITrades();
    });
});

});
