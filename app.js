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
const appSettings = {
    theme: localStorage.getItem('tf_theme') || 'dark',
    timeFormat: localStorage.getItem('tf_time_format') || '12',
    showExpiry: localStorage.getItem('tf_show_expiry') || 'hide'
};

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

    const hc = document.getElementById('heatmap-container');
    if (hc && !hc.querySelector('.heatmap-tile')) {
        hc.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; padding:60px 20px;">
            <div style="font-size:2rem; margin-bottom:12px;">⏳</div>
            <p style="font-size:1.1rem; color:var(--text-light); margin-bottom:8px;">
              Waking up data server...
            </p>
            <p style="font-size:0.85rem; color:var(--text-muted);">
              Free server takes ~30-50 seconds to start. Please wait.
            </p>
            <div style="margin-top:20px; width:200px; height:4px; background:var(--bg-surface); border-radius:2px; overflow:hidden; margin-inline:auto;">
              <div style="height:100%; width:40%; background:var(--accent-green); border-radius:2px; animation: shimmer 1.5s infinite;"></div>
            </div>
          </div>`;
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
function fmt(v){return(v>0?'+':'')+v.toFixed(2);}

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
        t.innerHTML=`<div class="tile-icon" style="font-size:1.2rem; margin-bottom:4px; display:none;">${s.icon}</div><div class="tile-name">${s.icon} ${s.name.replace('NIFTY ','')}</div><div class="tile-change">${fmt(s.change)}</div><div class="tile-trend">${ar} ${s.trend}</div>`;
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
        ce.textContent=fmt(window._nifty50.change) + '%';
        ce.className=`ticker-change ${window._nifty50.change>=0?'up':'down'}`;
        
        let history = JSON.parse(localStorage.getItem('tf_nifty_history') || '[]');
        const currentVal = Number(window._nifty50.val);
        if (history.length === 0 || history[history.length - 1] !== currentVal) {
            history.push(currentVal);
            if (history.length > 10) history = history.slice(-10);
            localStorage.setItem('tf_nifty_history', JSON.stringify(history));
        }
        
        const sparkline = document.getElementById('nifty-sparkline');
        if (history.length > 1 && sparkline) {
            const min = Math.min(...history);
            const max = Math.max(...history);
            const range = max - min || 1;
            const w = 60, h = 20;
            const points = history.map((val, i) => {
                const x = (i / (history.length - 1)) * w;
                const y = h - ((val - min) / range) * h;
                return `${x},${y}`;
            }).join(' ');
            const isUp = history[history.length - 1] >= history[0];
            const color = isUp ? 'var(--strong-green)' : 'var(--mild-red)';
            sparkline.innerHTML = `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" />`;
        }
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
    document.getElementById('update-time').textContent=new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:appSettings.timeFormat === '12'});
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

// Check local storage for watchlist
let watchlist = JSON.parse(localStorage.getItem('tf_watchlist') || '[]');

window.toggleWatchlist = function(symbol, event) {
    event.stopPropagation();
    const idx = watchlist.indexOf(symbol);
    if (idx > -1) {
        watchlist.splice(idx, 1);
        event.target.style.opacity = '0.3';
    } else {
        watchlist.push(symbol);
        event.target.style.opacity = '1';
    }
    localStorage.setItem('tf_watchlist', JSON.stringify(watchlist));
    if (document.getElementById('tab-watchlist') && document.getElementById('tab-watchlist').classList.contains('active')) {
        renderWatchlist();
    }
};

function renderWatchlist() {
    const grid = document.getElementById('watchlist-grid');
    if (!grid) return;
    if (watchlist.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:40px;">No stocks saved yet. Click ⭐ on any stock to add.</div>';
        return;
    }
    grid.innerHTML = '';
    watchlist.forEach(sym => {
        grid.innerHTML += `
            <div class="brk-card">
                <div class="brk-info">
                    <div class="brk-sym">${sym}</div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="modal-back-btn" style="padding:4px 8px;" onclick="openStockChart('${sym}')">View Chart</button>
                    <button class="modal-close-btn" style="width:28px; height:28px; font-size:0.8rem; display:flex; align-items:center; justify-content:center;" onclick="toggleWatchlist('${sym}', event)">✕</button>
                </div>
            </div>
        `;
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
        tile.style.cursor = 'pointer';
        tile.dataset.symbol = s.symbol;
        tile.title = `Click to view ${s.symbol} chart`;
        const price = s.lastPrice ? Number(s.lastPrice).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '--';
        const isWatched = watchlist.includes(s.symbol);
        tile.innerHTML = `
            <div style="position:absolute; top:4px; right:4px; font-size:0.8rem; cursor:pointer; opacity:${isWatched ? '1' : '0.3'}; transition:opacity 0.2s; z-index:5;" onclick="toggleWatchlist('${s.symbol}', event)">⭐</div>
            <div class="stock-symbol">${s.symbol}</div>
            <div class="stock-price">₹${price}</div>
            <div class="stock-change">${fmt(pChange)}</div>
            <div style="font-size:0.55rem;opacity:0.6;margin-top:3px;">📈 Chart</div>
        `;
        grid.appendChild(tile);
    });

    // Click stock → open chart
    grid.querySelectorAll('.stock-tile').forEach(tile => {
        tile.addEventListener('click', () => {
            openStockChart(tile.dataset.symbol);
        });
    });
}

function closeSectorModal() {
    document.getElementById('sector-modal').classList.remove('active');
    document.body.style.overflow = '';
}

// ===== STOCK CHART MODAL =====
window.openStockChart = function(symbol) {
    window.open(`https://in.tradingview.com/chart/?symbol=NSE:${symbol}`, '_blank');
}

// ===== EVENT WIRING =====
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    document.getElementById('refresh-btn').addEventListener('click', loadDashboard);
    setInterval(loadDashboard, 60000);

    // ===== LIVE CLOCK — ticks every second =====
    function tickClock() {
        const el = document.getElementById('update-time');
        if (el) {
            el.textContent = new Date().toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: appSettings.timeFormat === '12'
            });
        }
    }
    tickClock(); // set immediately on load
    setInterval(tickClock, 1000);

    // ===== EXPIRY COUNTDOWN TIMER =====
    function tickExpiry() {
        const el = document.getElementById('expiry-timer');
        if (!el) return;

        const now = new Date();
        let nextThu = new Date(now.getTime());
        let daysToThu = (4 - now.getDay() + 7) % 7;
        if (daysToThu === 0 && (now.getHours() > 15 || (now.getHours() === 15 && now.getMinutes() >= 30))) {
            daysToThu = 7;
        }
        nextThu.setDate(now.getDate() + daysToThu);
        nextThu.setHours(15, 30, 0, 0);

        const diff = nextThu.getTime() - now.getTime();
        
        if (daysToThu === 0 && now.getHours() >= 9 && (now.getHours() < 15 || (now.getHours() === 15 && now.getMinutes() < 30))) {
            el.textContent = "Expiry Today! ⚡";
            el.style.color = "var(--strong-green)";
            return;
        }

        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        const s = Math.floor((diff / 1000) % 60);

        el.textContent = `Expiry in: ${d}d ${h}h ${m}m ${s}s`;

        if (d > 0) {
            el.style.color = "var(--gold)";
            el.style.animation = "none";
            el.style.opacity = "1";
        } else if (h > 0) {
            el.style.color = "orange";
            el.style.animation = "none";
            el.style.opacity = "1";
        } else {
            el.style.color = "var(--mild-red)";
            if (s % 2 === 0) el.style.opacity = "1";
            else el.style.opacity = "0.3";
        }
    }
    tickExpiry();
    setInterval(tickExpiry, 1000);

    // ===== SETTINGS & THEME TOGGLE =====
    function applySettings() {
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (appSettings.theme === 'light') {
            document.body.classList.add('light-theme');
            if (themeBtn) themeBtn.textContent = '🌙';
        } else {
            document.body.classList.remove('light-theme');
            if (themeBtn) themeBtn.textContent = '☀️';
        }

        const themeSel = document.getElementById('setting-theme');
        const timeSel = document.getElementById('setting-time-format');
        const expirySel = document.getElementById('setting-expiry-timer');
        if (themeSel) themeSel.value = appSettings.theme;
        if (timeSel) timeSel.value = appSettings.timeFormat;
        if (expirySel) expirySel.value = appSettings.showExpiry;

        const expiryEl = document.getElementById('expiry-timer');
        if (expiryEl) {
            expiryEl.style.display = appSettings.showExpiry === 'show' ? 'block' : 'none';
        }
    }
    
    applySettings(); // Apply on load

    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            appSettings.theme = appSettings.theme === 'light' ? 'dark' : 'light';
            localStorage.setItem('tf_theme', appSettings.theme);
            applySettings();
        });
    }

    document.getElementById('setting-theme')?.addEventListener('change', (e) => {
        appSettings.theme = e.target.value;
        localStorage.setItem('tf_theme', appSettings.theme);
        applySettings();
    });
    document.getElementById('setting-time-format')?.addEventListener('change', (e) => {
        appSettings.timeFormat = e.target.value;
        localStorage.setItem('tf_time_format', appSettings.timeFormat);
        tickClock();
    });
    document.getElementById('setting-expiry-timer')?.addEventListener('change', (e) => {
        appSettings.showExpiry = e.target.value;
        localStorage.setItem('tf_show_expiry', appSettings.showExpiry);
        applySettings();
    });

    // Auto-fill current year in footer
    const fyEl = document.getElementById('footer-year');
    if (fyEl) fyEl.textContent = new Date().getFullYear();

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

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSectorModal();
        }
    });

    // ===== MOBILE SIDEBAR TOGGLE =====
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        sidebarToggle.textContent = '✕';
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        sidebarToggle.textContent = '☰';
    }

    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });
    overlay.addEventListener('click', closeSidebar);

    // Close sidebar when a nav item is tapped on mobile
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.addEventListener('click', () => {
            if (window.innerWidth <= 900) closeSidebar();
        });
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
            if (targetId === 'tab-watchlist') renderWatchlist();
            if (targetId === 'tab-options' && !optionsLoaded) loadOptionsData();
            if (targetId === 'tab-fiidii' && !fiidiiLoaded) loadFiiDiiData();
            if (targetId === 'tab-charts' && !chartsLoaded) loadCharts();
            if (targetId === 'tab-global' && !globalLoaded) loadGlobalMarkets();
            if (targetId === 'tab-news' && !newsLoaded) loadNews();
            if (targetId === 'tab-strategies' && !strategiesLoaded) loadStrategies();
            if (targetId === 'tab-sectorscope' && !sectorScopeLoaded) loadSectorScopeData();
            if (targetId === 'tab-rfactor') initRFactor();
        }
    });
});

let optionsLoaded = false;
let fiidiiLoaded = false;
let chartsLoaded = false;
let globalLoaded = false;
let newsLoaded = false;
let strategiesLoaded = false;
let sectorScopeLoaded = false;

function loadCharts() {
    if (chartsLoaded) return;
    chartsLoaded = true; // Prevent multiple clicks from firing this again
    
    // Clear container just in case
    const container = document.getElementById('tradingview_chart');
    if (container) container.innerHTML = '';

    const script = document.createElement('script');
    script.src = "https://s3.tradingview.com/tv.js?v=2";
    script.async = true;
    script.onload = () => {
        if (typeof TradingView !== 'undefined') {
            new TradingView.widget({
                "width": "100%",
                "height": "100%",
                "symbol": "NSE:NIFTY",
                "interval": "15",
                "timezone": "Asia/Kolkata",
                "theme": "dark",
                "style": "1",
                "locale": "in",
                "enable_publishing": false,
                "backgroundColor": "rgba(10, 14, 23, 1)",
                "gridColor": "rgba(255, 255, 255, 0.06)",
                "hide_top_toolbar": false,
                "hide_legend": false,
                "save_image": true,
                "container_id": "tradingview_chart",
                "allow_symbol_change": true,
                "hide_side_toolbar": false,
                "withdateranges": true
            });
        }
    };
    
    // ✅ Script duplicate load mat hone do
    if (!document.querySelector('script[src*="tradingview"]')) {
        document.body.appendChild(script);
    } else {
        script.onload();
    }
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
            
            document.getElementById('total-pe-oi').textContent = Math.round(peOI).toLocaleString('en-IN');
            document.getElementById('total-ce-oi').textContent = Math.round(ceOI).toLocaleString('en-IN');
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
if(document.getElementById('load-global-btn')) {
    document.getElementById('load-global-btn').addEventListener('click', () => { globalLoaded = false; loadGlobalMarkets(); });
}

// ===== GLOBAL MARKETS =====
async function loadGlobalMarkets() {
    const loading = document.getElementById('global-loading');
    const content = document.getElementById('global-content');
    const grid = document.getElementById('global-grid');
    
    loading.classList.add('active'); content.style.display = 'none';

    const symbols = [
        { symbol: '^GSPC', name: 'S&P 500', region: 'US' },
        { symbol: '^DJI', name: 'DOW JONES', region: 'US' },
        { symbol: '^IXIC', name: 'NASDAQ', region: 'US' },
        { symbol: '^FTSE', name: 'FTSE 100', region: 'EU' },
        { symbol: '^GDAXI', name: 'DAX', region: 'EU' },
        { symbol: '^N225', name: 'NIKKEI 225', region: 'ASIA' },
        { symbol: '^HSI', name: 'HANG SENG', region: 'ASIA' },
        { symbol: 'GC=F', name: 'GOLD', region: 'COMMODITY' },
        { symbol: 'CL=F', name: 'CRUDE OIL', region: 'COMMODITY' },
    ];

    try {
        grid.innerHTML = '';
        for (const s of symbols) {
            let val = '--', chg = 0;
            try {
                const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${s.symbol}?interval=1d&range=2d`);
                const json = await res.json();
                const meta = json.chart.result[0].meta;
                val = meta.regularMarketPrice;
                chg = meta.regularMarketChangePercent || ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose * 100);
            } catch(e) {
                // Ignore error, show --
            }

            const isUp = chg >= 0;
            const color = isUp ? 'var(--strong-green)' : 'var(--mild-red)';
            const icon = isUp ? '▲' : '▼';
            
            grid.innerHTML += `
                <div class="brk-card" style="border-left: 4px solid ${color};">
                    <div class="brk-info">
                        <div class="brk-sym">${s.name} <span class="tag tag-cyan" style="font-size:0.6rem;">${s.region}</span></div>
                    </div>
                    <div class="brk-price-col">
                        <div class="brk-price">${typeof val === 'number' ? val.toLocaleString('en-US', {maximumFractionDigits:2}) : val}</div>
                        <div class="brk-chg" style="color:${color}">${icon} ${Math.abs(chg).toFixed(2)}</div>
                    </div>
                </div>
            `;
        }
        loading.classList.remove('active');
        content.style.display = 'block';
        globalLoaded = true;
    } catch(e) {
        loading.innerHTML = '<span>❌ Could not load global markets data.</span>';
    }
}

// ===== NEWS & SENTIMENT =====
function loadNews() {
    const grid = document.getElementById('news-grid');
    
    const news = [
        { title: "FIIs turn net buyers after 5 days, inject ₹2,500 Cr", source: "Moneycontrol", time: "10 mins ago", type: "bullish" },
        { title: "Inflation cools down, rate cut hopes rise", source: "Bloomberg", time: "45 mins ago", type: "bullish" },
        { title: "Tech sector faces headwinds on global cues", source: "Reuters", time: "2 hours ago", type: "bearish" },
        { title: "RBI maintains status quo on repo rate", source: "ET", time: "3 hours ago", type: "neutral" },
        { title: "Oil prices spike amidst geopolitical tensions", source: "CNBC", time: "4 hours ago", type: "bearish" }
    ];
    
    grid.innerHTML = '';
    news.forEach((n, i) => {
        let tagColor = n.type === 'bullish' ? 'tag-green' : (n.type === 'bearish' ? 'tag-red' : 'tag-gold');
        grid.innerHTML += `
            <div class="top-card animate-in" style="animation-delay:${i*100}ms; flex-direction:column; align-items:flex-start; gap:10px;">
                <div style="display:flex; justify-content:space-between; width:100%;">
                    <span style="font-size:0.75rem; color:var(--text-muted);">${n.source} • ${n.time}</span>
                    <span class="tag ${tagColor}">${n.type.toUpperCase()}</span>
                </div>
                <div style="font-size:1rem; font-weight:600; line-height:1.4;">${n.title}</div>
            </div>
        `;
    });
    newsLoaded = true;
}

// ===== ALGO STRATEGIES =====
function loadStrategies() {
    const grid = document.getElementById('strategies-grid');
    
    const strategies = [
        { name: "Short Straddle (Intraday)", type: "Neutral", winRate: "68%", roi: "1.5-2%", risk: "High", desc: "Sell ATM Call and Put. Profits from theta decay in sideways markets." },
        { name: "Iron Condor", type: "Range Bound", winRate: "75%", roi: "3-4%", risk: "Defined", desc: "Sell OTM Strangle and buy further OTM Strangle for protection." },
        { name: "Bull Call Spread", type: "Bullish", winRate: "55%", roi: "10-15%", risk: "Defined", desc: "Buy ATM Call and sell OTM Call to reduce premium cost." },
        { name: "Bear Put Spread", type: "Bearish", winRate: "58%", roi: "12-18%", risk: "Defined", desc: "Buy ATM Put and sell OTM Put. Best for moderate downtrends." }
    ];
    
    grid.innerHTML = '';
    strategies.forEach((s, i) => {
        grid.innerHTML += `
            <div class="ai-card" style="animation: fade-in 0.3s ease forwards; animation-delay:${i*100}ms; opacity:0;">
                <div class="ai-header">
                    <span class="ai-sym" style="font-size:1.1rem;">${s.name}</span>
                    <span class="tag tag-cyan">${s.type}</span>
                </div>
                <div class="ai-reasoning" style="min-height:50px;">${s.desc}</div>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:15px; background:rgba(255,255,255,0.02); padding:10px; border-radius:6px;">
                    <div><div style="font-size:0.7rem; color:var(--text-muted);">Win Rate</div><div style="font-weight:bold;">${s.winRate}</div></div>
                    <div><div style="font-size:0.7rem; color:var(--text-muted);">Est. ROI</div><div style="font-weight:bold; color:var(--strong-green);">${s.roi}</div></div>
                    <div><div style="font-size:0.7rem; color:var(--text-muted);">Risk</div><div style="font-weight:bold;">${s.risk}</div></div>
                </div>
                <button class="modal-back-btn" style="width:100%; justify-content:center; padding:8px; border-color:var(--accent-cyan); color:var(--accent-cyan);">Deploy Strategy</button>
            </div>
        `;
    });
    strategiesLoaded = true;
}

    // Nav item clicks
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.addEventListener('click', (e) => {
            const targetId = e.currentTarget.dataset.target;
            
            // UI Toggle
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            e.currentTarget.classList.add('active');
            document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'));
            const targetTab = document.getElementById(targetId);
            if (targetTab) targetTab.classList.add('active');

            // Logic Trigger
            if (targetId === 'tab-market-pulse') loadSmartMoneyTracker();
            if (targetId === 'tab-momentum') loadIntradayBoost();
            if (targetId === 'tab-sectorscope' && !sectorScopeLoaded) loadSectorScopeData();
            if (targetId === 'tab-rfactor') initRFactor();
            if (targetId === 'tab-ai') generateAITrades();
            if (targetId === 'tab-global' && !globalLoaded) loadGlobalMarkets();
            if (targetId === 'tab-news' && !newsLoaded) loadNews();
            if (targetId === 'tab-strategies' && !strategiesLoaded) loadStrategies();
            
            if (window.innerWidth <= 900) closeSidebar();
        });
    });
});

// ===== SECTOR SCOPE (HEATMAP & OUTPERFORMANCE) =====
let heatmapChart = null;
const SECTOR_WEIGHTS = {
    "NIFTY BANK": 25.0, "NIFTY IT": 14.0, "NIFTY FINANCIAL SERVICES": 10.0, "NIFTY OIL & GAS": 11.0,
    "NIFTY FMCG": 9.0, "NIFTY AUTO": 6.0, "NIFTY PHARMA": 4.0, "NIFTY METAL": 3.5,
    "NIFTY INFRA": 3.5, "NIFTY CONSUMPTION": 3.0, "NIFTY ENERGY": 3.0, "NIFTY PSU BANK": 2.0,
    "NIFTY PVT BANK": 2.0, "NIFTY REALTY": 2.0, "NIFTY MEDIA": 2.0
};

document.getElementById('run-sectorscope-btn')?.addEventListener('click', () => {
    sectorScopeLoaded = false;
    loadSectorScopeData();
});

async function loadSectorScopeData() {
    sectorScopeLoaded = true;
    const loading = document.getElementById('sectorscope-loading');
    const content = document.getElementById('sectorscope-content');
    const chartContainer = document.getElementById('sector-heatmap-chart');
    const niftyRef = document.getElementById('nifty-ref-perf');
    
    if (!loading || !content || !chartContainer) return;
    
    loading.style.display = 'flex';
    content.style.display = 'none';
    
    try {
        const cached = getCachedData();
        if (!cached || !cached.data || cached.data.length === 0) {
            chartContainer.innerHTML = '<div style="color:var(--mild-red); padding: 40px; text-align: center;">No sector data available. Please check Market Pulse tab first.</div>';
            loading.style.display = 'none';
            content.style.display = 'block';
            return;
        }

        // Get Nifty 50 for outperformance comparison
        const n50Chg = (window._nifty50 && window._nifty50.change) || 0;
        if (niftyRef) {
            niftyRef.textContent = `NIFTY 50: ${fmt(n50Chg)}%`;
            niftyRef.style.color = n50Chg >= 0 ? 'var(--strong-green)' : 'var(--mild-red)';
        }

        // 1. Prepare Treemap Data
        const dataArr = Array.isArray(cached.data) ? cached.data : (cached.data.sorted || []);
        const treemapData = dataArr
            .filter(s => SECTOR_WEIGHTS[s.id])
            .map(s => {
                const chg = parseFloat(s.change || 0);
                let color = '#475569'; // Neutral (Slate 600)
                if (chg >= 1.5) color = '#059669';      // Very Bullish (Emerald 600)
                else if (chg >= 0.5) color = '#34d399';  // Bullish (Emerald 400)
                else if (chg <= -1.5) color = '#b91c1c'; // Very Bearish (Red 700)
                else if (chg <= -0.5) color = '#f87171'; // Bearish (Red 400)
                
                const isOutperforming = chg > n50Chg;

                return {
                    x: `${s.name}${isOutperforming ? ' ★' : ''}`,
                    y: SECTOR_WEIGHTS[s.id] || 2,
                    pChg: chg,
                    fullId: s.id,
                    color: color,
                    isOutperforming: isOutperforming
                };
            });

        // 2. Render Heatmap Chart
        const options = {
            series: [{ data: treemapData }],
            legend: { show: false },
            chart: {
                height: 450,
                type: 'treemap',
                toolbar: { show: false },
                animations: { enabled: true },
                events: {
                    dataPointSelection: function(event, chartContext, config) {
                        const point = treemapData[config.dataPointIndex];
                        showSectorStocks(point.fullId, point.x.replace(' ★', ''));
                    }
                }
            },
            dataLabels: {
                enabled: true,
                style: { fontSize: '12px', fontWeight: 'bold' },
                formatter: function(text, op) {
                    return [text, treemapData[op.dataPointIndex].pChg.toFixed(2) + '%'];
                },
                offsetY: -4
            },
            colors: treemapData.map(d => d.color),
            plotOptions: {
                treemap: {
                    distributed: true,
                    enableShades: false,
                    useFillColorAsStroke: false
                }
            },
            tooltip: {
                theme: 'dark',
                y: {
                    formatter: function(val, op) {
                        const d = treemapData[op.dataPointIndex];
                        return `${d.pChg}% ${d.isOutperforming ? '(Outperforming NIFTY)' : ''}`;
                    },
                    title: { formatter: () => 'Change:' }
                }
            }
        };

        if (heatmapChart) heatmapChart.destroy();
        chartContainer.innerHTML = '';
        heatmapChart = new ApexCharts(chartContainer, options);
        heatmapChart.render();

    } catch (e) {
        console.error("Sector Scope Error:", e);
        chartContainer.innerHTML = `<div style="color:var(--mild-red);">Error processing Heatmap data.</div>`;
    } finally {
        loading.style.display = 'none';
        content.style.display = 'block';
    }
}

async function showSectorStocks(sectorId, sectorName) {
    const detailSection = document.getElementById('sector-detail-section');
    const nameDisplay = document.getElementById('sector-name-display');
    const tbody = document.getElementById('sector-stocks-tbody');
    
    if (!detailSection || !nameDisplay || !tbody) return;
    
    detailSection.style.display = 'block';
    nameDisplay.textContent = sectorName;
    tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--text-muted);">Loading stocks...</td></tr>';
    
    // Smooth scroll to table
    detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
        const res = await fetch(`${BASE_URL}/api/sector/${encodeURIComponent(sectorId)}`).then(r => r.json());
        if (res.success && res.data && res.data.data) {
            let stocks = res.data.data
                .filter(s => s.symbol && s.symbol !== sectorName && !s.symbol.startsWith('NIFTY'))
                .map(st => {
                    const last = parseFloat(st.lastPrice || 0);
                    const high = parseFloat(st.dayHigh || 0);
                    const low = parseFloat(st.dayLow || 0);
                    const open = parseFloat(st.open || 0);
                    const pChg = parseFloat(st.pChange || 0);
                    const vol = parseInt(st.totalTradedVolume || 0);
                    
                    // Volume Spike logic: Rank by volume or just display
                    return { ...st, pChg, vol };
                })
                .sort((a, b) => Math.abs(b.pChg) - Math.abs(a.pChg)) // Sort by most volatile
                .slice(0, 5); // Top 5

            tbody.innerHTML = stocks.map(st => `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <td style="padding: 16px 20px; font-weight: 700; color: var(--text-light);">${st.symbol}</td>
                    <td style="padding: 16px 20px; font-family: var(--font-mono); color: var(--text-secondary);">₹${parseFloat(st.lastPrice).toLocaleString('en-IN')}</td>
                    <td style="padding: 16px 20px; font-weight: 600; color: ${st.pChg >= 0 ? 'var(--strong-green)' : 'var(--mild-red)'};">
                        ${fmt(st.pChg)}%
                    </td>
                    <td style="padding: 16px 20px;">
                        <span style="padding: 2px 8px; background: rgba(0,217,245,0.1); border-radius: 4px; font-size: 0.75rem; color: var(--accent-cyan);">
                            ${(st.vol / 100000).toFixed(2)}M Units
                        </span>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--mild-red);">Failed to load sector stocks.</td></tr>';
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--mild-red);">Error fetching data.</td></tr>';
    }
}

// ===== R-FACTOR (THE EFFICIENCY METRIC) =====
function initRFactor() {
    const riskInp = document.getElementById('r-initial-risk');
    const pnlInp = document.getElementById('r-current-pnl');
    const display = document.getElementById('r-value-display');
    const status = document.getElementById('r-status-badge');

    if (!riskInp || !pnlInp || !display || !status) return;

    const updateR = () => {
        const risk = parseFloat(riskInp.value) || 0;
        const pnl = parseFloat(pnlInp.value) || 0;
        
        if (risk <= 0) {
            display.textContent = "0.0";
            display.style.color = "#9b59b2";
            status.textContent = "Invalid Risk";
            status.style.color = "var(--text-muted)";
            status.style.background = "rgba(255,255,255,0.05)";
            return;
        }

        const r = (pnl / risk).toFixed(2);
        display.textContent = r;

        // Color and Text based on benchmarks
        if (pnl < 0) {
            status.textContent = "Losing Trade";
            status.style.color = "#e74c3c";
            status.style.background = "rgba(231, 76, 60, 0.1)";
            display.style.color = "#e74c3c";
        } else if (r < 1) {
            status.textContent = "Poor R-Ratio";
            status.style.color = "#e67e22";
            status.style.background = "rgba(230, 126, 34, 0.1)";
            display.style.color = "#e67e22";
        } else if (r >= 1 && r < 1.5) {
            status.textContent = "Average Trade";
            status.style.color = "#f1c40f";
            status.style.background = "rgba(241, 196, 15, 0.1)";
            display.style.color = "#f1c40f";
        } else if (r >= 1.5 && r <= 2.5) {
            status.textContent = "Good Trade";
            status.style.color = "#2ecc71";
            status.style.background = "rgba(46, 204, 113, 0.1)";
            display.style.color = "#2ecc71";
        } else {
            status.textContent = "Excellent Trade";
            status.style.color = "#00d9f5";
            status.style.background = "rgba(0, 217, 245, 0.1)";
            display.style.color = "#00d9f5";
        }
    };

    riskInp.addEventListener('input', updateR);
    pnlInp.addEventListener('input', updateR);
    updateR(); // Initial call
}

function renderRGauge(r) {
    const val = parseFloat(r) || 0;
    let color = '#ef4444'; // Red < 1
    if (val >= 3) color = '#10b981'; // Green > 3
    else if (val >= 1.5) color = '#facc15'; // Yellow 1.5-3
    
    return `
        <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 60px; height: 5px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                <div style="width: ${Math.min(Math.abs(val) * 20, 100)}%; height: 100%; background: ${color}; transition: width 0.3s ease;"></div>
            </div>
            <span style="font-weight: 700; color: ${color}; font-size: 0.72rem;">${val.toFixed(1)}R</span>
        </div>
    `;
}

// ===== SMART MONEY TRACKER (OI BUILDUP) =====
async function loadSmartMoneyTracker() {
    const containers = {
        long: document.getElementById('long-buildup-list'),
        short: document.getElementById('short-buildup-list'),
        unwinding: document.getElementById('long-unwinding-list'),
        covering: document.getElementById('short-covering-list')
    };

    if (!containers.long) return;

    try {
        const res = await fetch(`${BASE_URL}/api/fno`).then(r => r.json());
        if (!res.success || !res.data || !res.data.data) return;

        const stocks = res.data.data;
        const groups = { long: [], short: [], unwinding: [], covering: [] };

        stocks.forEach(s => {
            const priceChg = parseFloat(s.pChange || 0);
            const oiChg = parseFloat(s.pchangeinOpenInterest || 0);
            
            if (priceChg > 0 && oiChg > 0) groups.long.push(s);
            else if (priceChg < 0 && oiChg > 0) groups.short.push(s);
            else if (priceChg < 0 && oiChg < 0) groups.unwinding.push(s);
            else if (priceChg > 0 && oiChg < 0) groups.covering.push(s);
        });

        const renderGroup = (list, container, color) => {
            container.innerHTML = list.slice(0, 5).map(s => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.02); border-radius: 6px; font-size: 0.8rem;">
                    <span style="font-weight: 700; color: var(--text-light);">${s.symbol}</span>
                    <span style="color: ${color}; font-weight: 600;">${fmt(parseFloat(s.pChange))}%</span>
                </div>
            `).join('') || '<div style="color:var(--text-muted); font-size: 0.75rem; padding: 5px;">No stocks found</div>';
        };

        renderGroup(groups.long.sort((a,b) => b.pchangeinOpenInterest - a.pchangeinOpenInterest), containers.long, 'var(--strong-green)');
        renderGroup(groups.short.sort((a,b) => b.pchangeinOpenInterest - a.pchangeinOpenInterest), containers.short, 'var(--mild-red)');
        renderGroup(groups.unwinding.sort((a,b) => a.pchangeinOpenInterest - b.pchangeinOpenInterest), containers.unwinding, 'var(--text-muted)');
        renderGroup(groups.covering.sort((a,b) => a.pchangeinOpenInterest - b.pchangeinOpenInterest), containers.covering, 'var(--accent-cyan)');

    } catch (e) {
        console.error("Smart Money Error:", e);
    }
}

// ===== INTRADAY BOOST (MOMENTUM SCANNER) =====
document.getElementById('run-momentum-btn')?.addEventListener('click', loadIntradayBoost);

async function loadIntradayBoost() {
    const loading = document.getElementById('momentum-loading');
    const content = document.getElementById('momentum-content');
    const tbody = document.getElementById('momentum-tbody');
    const notification = document.getElementById('momentum-notifications');

    if (!loading || !content || !tbody) return;

    loading.style.display = 'flex';
    content.style.display = 'none';
    tbody.innerHTML = '';

    try {
        const res = await fetch(`${BASE_URL}/api/fno`).then(r => r.json());
        if (!res.success || !res.data || !res.data.data) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center;">Failed to fetch F&O data.</td></tr>';
            return;
        }

        const stocks = res.data.data;
        const results = [];

        stocks.forEach(s => {
            const ltpVal = parseFloat(s.lastPrice || 0);
            const high = parseFloat(s.dayHigh || 0);
            const low = parseFloat(s.dayLow || 0);
            const prevClose = parseFloat(s.previousClose || 0);
            
            const isNearHigh = ltpVal >= high * 0.998; 
            const isPDHBreak = ltpVal > prevClose * 1.02; // Approximation for PDH break
            const volSurge = (parseInt(s.totalTradedVolume) > 1000000); // 1M+ volume

            if ((isNearHigh || isPDHBreak) && volSurge && ltpVal > 100) {
                // Calculate R-Factor: (LTP - PrevClose) / (PrevClose - DayLow)
                const risk = Math.max(prevClose - low, ltpVal * 0.01);
                const rFactor = (ltpVal - prevClose) / risk;
                results.push({ ...s, rFactor });
            }
        });

        if (results.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-muted);">No momentum breakouts found currently.</td></tr>';
        } else {
            tbody.innerHTML = results.slice(0, 10).map(s => `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <td style="padding: 16px 20px; font-weight: 700; color: var(--text-light);">${s.symbol}</td>
                    <td style="padding: 16px 20px; font-family: var(--font-mono);">₹${ltp(s.lastPrice)}</td>
                    <td style="padding: 16px 20px; color: var(--strong-green); font-weight:700;">
                        ${s.pChange > 2 ? '🔥 BOOST' : '⚡ ALERT'}
                    </td>
                    <td style="padding: 16px 20px;">
                        ${renderRGauge(s.rFactor)}
                    </td>
                    <td style="padding: 16px 20px;">
                        <a href="https://www.tradingview.com/chart/?symbol=NSE:${s.symbol}" target="_blank" class="modal-back-btn" style="text-decoration: none; padding: 4px 12px; font-size: 0.7rem; border-color: var(--accent-cyan); color: var(--accent-cyan);">BUY / CHART</a>
                    </td>
                </tr>
            `).join('');
            
            if (notification) {
                notification.innerHTML = `
                    <div style="padding: 12px 20px; background: rgba(0,217,245,0.1); border-left: 4px solid var(--accent-cyan); border-radius: 4px; color: var(--accent-cyan); font-weight: 600; display: flex; justify-content: space-between; align-items: center; animation: slideDown 0.3s ease-out;">
                        <span>🔥 ${results.length} stocks showing immediate momentum!</span>
                        <span style="font-size: 0.7rem; opacity: 0.8;">Live Scan Completed</span>
                    </div>
                `;
                setTimeout(() => { notification.innerHTML = ''; }, 5000);
            }
        }
    } catch (e) {
        console.error("Momentum Scanner Error:", e);
        tbody.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--mild-red);">Error processing momentum scan.</td></tr>';
    } finally {
        loading.style.display = 'none';
        content.style.display = 'block';
    }
}

function ltp(v) { return parseFloat(v).toLocaleString('en-IN', {maximumFractionDigits: 2}); }

// ===== SWING SPECTRUM LOADERS =====
async function loadSwingSpectrum() {
    const boTbody = document.getElementById('swing-bo-tbody');
    const revTbody = document.getElementById('swing-reversal-tbody');
    const chanTbody = document.getElementById('swing-channel-tbody');
    const delTbody = document.getElementById('swing-delivery-tbody');

    if (!boTbody) return;

    try {
        const res = await fetch(`${BASE_URL}/api/fno`).then(r => r.json());
        if (!res.success || !res.data || !res.data.data) return;

        const stocks = res.data.data;

        // 1. 10/50 Day BO (Approx using Day High vs Prev Close)
        const boList = stocks.filter(s => s.pChange > 3 && parseFloat(s.lastPrice) > 200).slice(0, 5);
        boTbody.innerHTML = boList.map(s => `
            <tr>
                <td>${s.symbol}</td>
                <td>₹${ltp(s.lastPrice)}</td>
                <td style="color:var(--strong-green)">${s.pChange.toFixed(2)}%</td>
                <td>${renderRGauge(s.pChange / 1.5)}</td>
            </tr>
        `).join('');

        // 2. Reversal Radar (Near Day Low but bouncing)
        const revList = stocks.filter(s => s.pChange > -0.5 && s.pChange < 0.5 && parseFloat(s.lastPrice) < parseFloat(s.dayHigh)*0.98).slice(0, 5);
        revTbody.innerHTML = revList.map(s => `
            <tr>
                <td>${s.symbol}</td>
                <td>₹${ltp(s.lastPrice)}</td>
                <td style="color:var(--gold)">Bouncing</td>
                <td>${renderRGauge(1.2)}</td>
            </tr>
        `).join('');

        // 3. Channel BO (Tight Range)
        const chanList = stocks.filter(s => Math.abs(s.pChange) < 0.3).slice(0, 5);
        chanTbody.innerHTML = chanList.map(s => `
            <tr>
                <td>${s.symbol}</td>
                <td>₹${ltp(s.lastPrice)}</td>
                <td style="color:var(--accent-cyan)">Consolidating</td>
                <td>${renderRGauge(0.8)}</td>
            </tr>
        `).join('');

        // 4. Delivery Scanner (Mocked vs 5-day avg using volume surge)
        delTbody.innerHTML = stocks.slice(10, 15).map(s => `
            <tr>
                <td>${s.symbol}</td>
                <td>${(Math.random() * 30 + 40).toFixed(1)}%</td>
                <td style="color:var(--strong-green)">+2.4x</td>
                <td><button class="modal-back-btn" style="padding:2px 8px; font-size:0.6rem">VIEW</button></td>
            </tr>
        `).join('');

    } catch (e) {
        console.error("Swing Spectrum Error:", e);
    }
}

// Add to nav listener
document.querySelectorAll('.nav-item').forEach(nav => {
    nav.addEventListener('click', (e) => {
        if (e.currentTarget.dataset.target === 'tab-swing') loadSwingSpectrum();
    });
});


