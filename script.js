// ============================================================================
// TradeFinder NSE Dashboard - Main Application Logic
// ============================================================================

// --- DATA CONFIGURATION ---
const SECTORS = [
    { name:"IT", change:1.8, prev:1.2, stocks:[{s:"INFY",c:2.2,ltp:1456},{s:"TCS",c:1.6,ltp:3842},{s:"WIPRO",c:1.1,ltp:468},{s:"HCLTECH",c:1.9,ltp:1567},{s:"TECHM",c:0.8,ltp:1234}], adv:12, dec:5, vol:2.3 },
    { name:"Pharma", change:2.4, prev:1.8, stocks:[{s:"SUNPHARMA",c:3.1,ltp:1678},{s:"CIPLA",c:2.8,ltp:1423},{s:"DRREDDY",c:1.9,ltp:5432},{s:"DIVISLAB",c:2.2,ltp:3876},{s:"APOLLOHOSP",c:1.4,ltp:6234}], adv:18, dec:4, vol:1.8 },
    { name:"Auto", change:2.1, prev:0.9, stocks:[{s:"TATAMOTORS",c:3.4,ltp:923},{s:"M&M",c:2.2,ltp:2234},{s:"MARUTI",c:1.4,ltp:12450},{s:"BAJAJ-AUTO",c:1.8,ltp:8945},{s:"HEROMOTOCO",c:0.9,ltp:4567}], adv:14, dec:3, vol:3.1 },
    { name:"FMCG", change:0.4, prev:0.6, stocks:[{s:"HINDUNILVR",c:0.8,ltp:2345},{s:"ITC",c:0.5,ltp:456},{s:"NESTLEIND",c:0.2,ltp:2345},{s:"BRITANNIA",c:0.6,ltp:4892},{s:"DABUR",c:0.3,ltp:567}], adv:11, dec:6, vol:0.9 },
    { name:"Bank", change:0.1, prev:-0.3, stocks:[{s:"HDFCBANK",c:0.4,ltp:1678},{s:"ICICIBANK",c:-0.2,ltp:1123},{s:"KOTAKBANK",c:0.3,ltp:1834},{s:"AXISBANK",c:0.6,ltp:1089},{s:"SBIN",c:-0.1,ltp:812}], adv:9, dec:8, vol:1.4 },
    { name:"PSU Bank", change:-0.5, prev:-0.8, stocks:[{s:"SBIN",c:-0.2,ltp:812},{s:"PNB",c:-0.8,ltp:124},{s:"BANKBARODA",c:-0.5,ltp:256},{s:"CANBK",c:-1.1,ltp:567},{s:"UNIONBANK",c:-0.4,ltp:145}], adv:3, dec:9, vol:1.1 },
    { name:"Fin Service", change:0.3, prev:0.1, stocks:[{s:"BAJFINANCE",c:1.8,ltp:6823},{s:"BAJAJFINSV",c:0.9,ltp:1567},{s:"CHOLAFIN",c:0.4,ltp:1234},{s:"MUTHOOTFIN",c:-0.2,ltp:1678},{s:"PFC",c:0.5,ltp:456}], adv:12, dec:8, vol:1.6 },
    { name:"Energy", change:0.5, prev:0.8, stocks:[{s:"RELIANCE",c:1.1,ltp:2945},{s:"ONGC",c:0.3,ltp:267},{s:"NTPC",c:0.2,ltp:389},{s:"POWERGRID",c:0.4,ltp:312},{s:"ADANIPOWER",c:0.8,ltp:456}], adv:10, dec:7, vol:1.2 },
    { name:"Oil & Gas", change:0.7, prev:0.4, stocks:[{s:"RELIANCE",c:1.1,ltp:2945},{s:"ONGC",c:0.3,ltp:267},{s:"BPCL",c:0.8,ltp:589},{s:"IOC",c:0.2,ltp:167},{s:"GAIL",c:0.5,ltp:198}], adv:8, dec:4, vol:1.3 },
    { name:"Metal", change:-0.9, prev:-0.4, stocks:[{s:"TATASTEEL",c:-1.4,ltp:145},{s:"HINDALCO",c:-0.8,ltp:634},{s:"JSWSTEEL",c:-0.6,ltp:867},{s:"COALINDIA",c:-0.3,ltp:456},{s:"NMDC",c:-1.1,ltp:234}], adv:4, dec:14, vol:1.7 },
    { name:"Realty", change:-1.6, prev:-2.1, stocks:[{s:"DLF",c:-2.1,ltp:834},{s:"GODREJPROP",c:-1.8,ltp:2345},{s:"OBEROIRLTY",c:-1.2,ltp:1678},{s:"PRESTIGE",c:-0.9,ltp:1456},{s:"PHOENIXLTD",c:-1.4,ltp:1234}], adv:3, dec:11, vol:2.1 },
    { name:"Media", change:-0.4, prev:-0.1, stocks:[{s:"ZEEL",c:-1.2,ltp:145},{s:"SUNTV",c:-0.4,ltp:678},{s:"PVRINOX",c:0.5,ltp:1456},{s:"NETWORK18",c:-0.8,ltp:89},{s:"TV18BRDCST",c:-0.5,ltp:45}], adv:4, dec:6, vol:0.8 },
    { name:"Cons Dur", change:0.6, prev:0.3, stocks:[{s:"TITAN",c:0.8,ltp:3456},{s:"VOLTAS",c:1.2,ltp:1089},{s:"HAVELLS",c:0.4,ltp:1456},{s:"DIXON",c:1.8,ltp:7890},{s:"CROMPTON",c:-0.2,ltp:289}], adv:9, dec:6, vol:1.4 },
    { name:"Healthcare", change:1.5, prev:1.1, stocks:[{s:"APOLLOHOSP",c:1.4,ltp:6234},{s:"MAXHEALTH",c:2.1,ltp:845},{s:"SYNGENE",c:0.8,ltp:745},{s:"LALPATHLAB",c:1.2,ltp:2345},{s:"METROPOLIS",c:0.5,ltp:1678}], adv:15, dec:5, vol:1.9 }
];

const FNO_STOCKS = {
    bullish: [
        {sym:"RELIANCE", ltp:2945, chg:1.2, oi_chg:"+8.4%", pcr:1.34, momentum:82, vol_ratio:2.3, tags:["F&O","Vol Surge","Breakout"], high52w:3028, low52w:2220},
        {sym:"SUNPHARMA", ltp:1678, chg:3.1, oi_chg:"+12.1%", pcr:1.56, momentum:91, vol_ratio:3.1, tags:["F&O","High OI","Sector Leader"], high52w:1750, low52w:1100},
        {sym:"TATAMOTORS", ltp:923, chg:3.4, oi_chg:"+9.8%", pcr:1.41, momentum:88, vol_ratio:2.8, tags:["F&O","FII Buy","Breakout"], high52w:1000, low52w:640},
        {sym:"INFY", ltp:1456, chg:2.2, oi_chg:"+6.2%", pcr:1.28, momentum:76, vol_ratio:1.9, tags:["F&O","IT Leader"], high52w:1550, low52w:1200},
        {sym:"BAJFINANCE", ltp:6823, chg:1.8, oi_chg:"+5.4%", pcr:1.19, momentum:71, vol_ratio:1.7, tags:["F&O","High OI"], high52w:7200, low52w:6200}
    ],
    bearish: [
        {sym:"DLF", ltp:834, chg:-2.1, oi_chg:"+11.2%", pcr:0.68, momentum:22, vol_ratio:2.6, tags:["F&O","Short Build","Breakdown"], high52w:968, low52w:690},
        {sym:"TATASTEEL", ltp:145, chg:-1.4, oi_chg:"+7.8%", pcr:0.74, momentum:31, vol_ratio:2.1, tags:["F&O","Sector Weak"], high52w:184, low52w:120},
        {sym:"GODREJPROP", ltp:2345, chg:-1.8, oi_chg:"+9.1%", pcr:0.71, momentum:26, vol_ratio:2.4, tags:["F&O","Realty Weak","Vol Surge"], high52w:2720, low52w:1890},
        {sym:"HINDALCO", ltp:634, chg:-0.8, oi_chg:"+4.3%", pcr:0.83, momentum:38, vol_ratio:1.5, tags:["F&O","Metal Bear"], high52w:720, low52w:480},
        {sym:"JSWSTEEL", ltp:867, chg:-0.6, oi_chg:"+3.8%", pcr:0.87, momentum:42, vol_ratio:1.3, tags:["F&O","High OI"], high52w:950, low52w:700}
    ]
};

const FII_DATA = { today: { buy:8420, sell:7890, net:530 }, week: [530,-210,840,120,-380,650,290], label: "NET BUYER" };
const DII_DATA = { today: { buy:5210, sell:4980, net:230 }, week: [230,180,420,-90,310,150,280], label: "NET BUYER" };

const GLOBAL = [
    {name:"S&P 500", flag:"🇺🇸", val:5234.18, chg:+0.41, status:"Closed"},
    {name:"Nasdaq", flag:"🇺🇸", val:16420.50, chg:+0.68, status:"Closed"},
    {name:"Dow Jones", flag:"🇺🇸", val:38920.30, chg:+0.22, status:"Closed"},
    {name:"DAX", flag:"🇩🇪", val:18240.60, chg:+0.35, status:"Closed"},
    {name:"FTSE 100", flag:"🇬🇧", val:8340.20, chg:-0.12, status:"Closed"},
    {name:"Nikkei 225", flag:"🇯🇵", val:38680.90, chg:+0.88, status:"Open"},
    {name:"Hang Seng", flag:"🇭🇰", val:17240.40, chg:-0.54, status:"Open"},
    {name:"Shanghai", flag:"🇨🇳", val:3120.80, chg:-0.21, status:"Open"},
    {name:"SGX Nifty", flag:"🇸🇬", val:22480, chg:+0.15, status:"Open"},
    {name:"Crude Oil", flag:"🛢️", val:78.40, chg:+1.12, status:"Open"},
    {name:"Gold", flag:"🥇", val:2345.60, chg:+0.33, status:"Open"},
    {name:"USD/INR", flag:"💱", val:83.42, chg:-0.08, status:"Open"}
];

const NEWS = [
    {source:"Economic Times", time:"12 min ago", headline:"FII buying surges as NIFTY approaches all-time high resistance at 22,800", summary:"Foreign investors net bought ₹530 crore in cash segment today...", tags:["FII","Nifty","Market"], sentiment:"BULLISH"},
    {source:"Moneycontrol", time:"28 min ago", headline:"Pharma sector outperforms: Sun Pharma, Cipla hit fresh 52-week highs", summary:"Strong Q4 earnings expectations driving pharma rally...", tags:["Pharma","SUNPHARMA","Earnings"], sentiment:"BULLISH"},
    {source:"Mint", time:"45 min ago", headline:"Auto sales data beats estimates: Maruti, Tata Motors surge", summary:"Monthly auto sales numbers came in 12% above analyst estimates...", tags:["Auto","MARUTI","TATAMOTORS"], sentiment:"BULLISH"},
    {source:"NDTV Profit", time:"1 hr ago", headline:"Realty stocks under pressure as RBI signals rates to stay higher", summary:"DLF and Godrej Properties fell 2% each after central bank commentary...", tags:["Realty","RBI","Rates"], sentiment:"BEARISH"},
    {source:"Business Standard", time:"2 hr ago", headline:"Metal sector faces headwinds as China demand outlook weakens", summary:"Tata Steel and Hindalco declined on weak Chinese industrial data...", tags:["Metal","China","Global"], sentiment:"BEARISH"},
    {source:"Reuters India", time:"3 hr ago", headline:"India VIX at 5-month low signals reduced market uncertainty", summary:"Volatility index drops to 13.4, indicating options sellers in control...", tags:["VIX","Options","Volatility"], sentiment:"NEUTRAL"}
];

const DEFAULT_WATCHLIST = [
    {sym:"RELIANCE", ltp:2945, chg:+1.2, high:2968, low:2901, vol:"2.3x", w52h:3028, w52l:2220},
    {sym:"TCS", ltp:3842, chg:+0.8, high:3871, low:3798, vol:"1.4x", w52h:4255, w52l:3456},
    {sym:"INFY", ltp:1456, chg:+2.2, high:1478, low:1421, vol:"2.8x", w52h:1594, w52l:1200},
    {sym:"HDFCBANK", ltp:1678, chg:+0.3, high:1692, low:1659, vol:"1.1x", w52h:1794, w52l:1430},
    {sym:"ICICIBANK",ltp:1123, chg:-0.2, high:1138, low:1109, vol:"0.9x", w52h:1257, w52l:970}
];

const ALGOS = [
    {name:"Open Drive Momentum", type:"Intraday", desc:"Captures explosive momentum in the first 15 minutes after market open. Trades Nifty50 stocks breaking yesterday's high/low.", winRate:67, avgReturn:2.1, maxDD:4.2, status:"Active", equity:[100,102,99,104,107,105,109,112]},
    {name:"BankNifty Expiry Scalp", type:"Expiry Day", desc:"Straddle and strangle strategies on Bank Nifty expiry. Profits from theta decay and volatility crush.", winRate:58, avgReturn:3.4, maxDD:8.1, status:"Active", equity:[100,98,103,97,108,105,115,122]},
    {name:"Sector Rotation Swing", type:"Positional", desc:"3-5 day positional trades in sector leaders rotating into strength. Uses FII data as confirmation.", winRate:72, avgReturn:4.8, maxDD:6.3, status:"Active", equity:[100,104,108,106,112,118,115,121]},
    {name:"FII Follow Strategy", type:"Positional", desc:"Follows institutional buying patterns. Enters stocks where FII have been net buyers for 3+ consecutive days.", winRate:69, avgReturn:3.9, maxDD:5.7, status:"Paused", equity:[100,103,107,104,108,111,109,113]},
    {name:"Gap & Go", type:"Intraday", desc:"Trades stocks gapping up/down more than 1.5% at open with volume confirmation. First 30-minute momentum play.", winRate:61, avgReturn:1.8, maxDD:3.9, status:"Active", equity:[100,101,103,98,104,106,103,107]},
    {name:"VWAP Reversal", type:"Intraday", desc:"Mean reversion strategy. Buys stocks stretched >2% below VWAP, shorts stocks >2% above VWAP with sector confirmation.", winRate:64, avgReturn:1.5, maxDD:2.8, status:"Active", equity:[100,99,102,104,101,105,107,106]}
];

let STATE = {
    nifty: { ltp: 22450.30, chg: 185.20, pct: 0.83 },
    banknifty: { ltp: 48320.00, chg: 290.00, pct: 0.60 },
    watchlist: [],
    selectedSector: null
};

// --- UTILITIES ---
function fmt(n, decimals = 2) { return new Intl.NumberFormat('en-IN', {minimumFractionDigits:decimals, maximumFractionDigits:decimals}).format(n); }
function fmtCr(n) { return (n/1e7).toFixed(2) + ' Cr'; }
function sgn(val) { return val > 0 ? '+' : ''; }
function col(val) { return val > 0 ? 'var(--bull-strong, #22c55e)' : val < 0 ? 'var(--bear-strong, #ef4444)' : 'var(--text-2, #94a3b8)'; }

function showToast(msg, type='info') {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:20px;right:20px;z-index:9999;padding:12px 20px;border-radius:8px;font-size:13px;color:#f1f5f9;background:${type==='success'?'#166534':type==='error'?'#7f1d1d':'#1e3a5f'};border:1px solid ${type==='success'?'#22c55e':type==='error'?'#ef4444':'#3b82f6'};animation:fadeSlideUp 0.3s ease`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 3000);
}

// Ensure element exists or create it
function getOrCreate(selector, parentSelector = '#main-content', tag = 'div', className = '') {
    let el = document.querySelector(selector);
    if (!el) {
        el = document.createElement(tag);
        if (className) el.className = className;
        const parent = document.querySelector(parentSelector);
        if (parent) parent.appendChild(el);
    }
    return el;
}

function smartUpdate(id, newValue, defaultColor) {
    const el = document.getElementById(id);
    if(!el) return;
    
    const oldText = el.innerText;
    if(oldText !== newValue) {
        const cleanOld = parseFloat(oldText.replace(/[^0-9.-]+/g, ""));
        const cleanNew = parseFloat(newValue.replace(/[^0-9.-]+/g, ""));
        
        // Inject digit flash styles if missing
        if(!document.getElementById('digit-flash-style')) {
            const style = document.createElement('style');
            style.id = 'digit-flash-style';
            style.innerHTML = `
                @keyframes textFlashUp { 0%, 15% { color: #22c55e; text-shadow: 0 0 8px rgba(34,197,94,0.5); } 100% { color: inherit; text-shadow: none; } }
                @keyframes textFlashDown { 0%, 15% { color: #ef4444; text-shadow: 0 0 8px rgba(239,68,68,0.5); } 100% { color: inherit; text-shadow: none; } }
                .digit-up { animation: textFlashUp 1.2s ease-out forwards; display: inline-block; }
                .digit-down { animation: textFlashDown 1.2s ease-out forwards; display: inline-block; }
            `;
            document.head.appendChild(style);
        }

        let isUp = cleanNew > cleanOld;
        let isDown = cleanNew < cleanOld;
        let diffHTML = '';

        // If lengths match, do a character-by-character diff
        if (oldText.length === newValue.length && (isUp || isDown)) {
            for (let i = 0; i < newValue.length; i++) {
                if (oldText[i] !== newValue[i] && /[0-9]/.test(newValue[i])) {
                    const cls = isUp ? 'digit-up' : 'digit-down';
                    diffHTML += `<span class="${cls}">${newValue[i]}</span>`;
                } else {
                    diffHTML += newValue[i];
                }
            }
        } else {
            // If lengths differ, flash the whole string
            if (isUp || isDown) {
                const cls = isUp ? 'digit-up' : 'digit-down';
                diffHTML = `<span class="${cls}">${newValue}</span>`;
            } else {
                diffHTML = newValue;
            }
        }

        el.innerHTML = diffHTML;
        
        // Maintain base text color
        if(defaultColor) {
            el.style.color = defaultColor;
        } else if (!el.style.color) {
            el.style.color = 'inherit';
        }
    }
}

// --- RENDERING FUNCTIONS ---

function renderNav() {
    const navItems = [
        {id:'sec-pulse', icon:'<path d="M18 20V10M12 20V4M6 20v-6"/>', label:'Market Pulse'},
        {id:'sec-sector', icon:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>', label:'Sector Scope'},
        {id:'sec-fno', icon:'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>', label:'F&O Scanner'},
        {id:'sec-options', icon:'<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>', label:'Option Chain'},
        {id:'sec-inst', icon:'<rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>', label:'Institutional'},
        {id:'sec-ai', icon:'<rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>', label:'AI Alpha'},
        {id:'sec-global', icon:'<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>', label:'Global Markets'},
        {id:'sec-news', icon:'<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>', label:'News Feed'},
        {id:'sec-watchlist', icon:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>', label:'Watchlist'},
        {id:'sec-algo', icon:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/>', label:'Algo Strategies'}
    ];
    
    const menu = document.getElementById('nav-menu');
    if (menu) {
        menu.innerHTML = navItems.map((n, i) => 
            `<div class="nav-item ${i===0?'active':''}" onclick="document.getElementById('${n.id}').scrollIntoView({behavior:'smooth'})">
                <svg viewBox="0 0 24 24">${n.icon}</svg> <span>${n.label}</span>
            </div>`
        ).join('');
    }
}

function renderTopbar() {
    // Clock
    const clockEl = document.querySelector('#clock');
    if (clockEl) clockEl.innerText = new Date().toLocaleTimeString('en-IN') + ' IST';
    
    // Nifty & BankNifty Topbar
    smartUpdate('top-nifty-val', fmt(STATE.nifty.ltp));
    smartUpdate('top-nifty-chg', `+${STATE.nifty.pct.toFixed(2)}%`, col(STATE.nifty.pct));
    
    smartUpdate('top-banknifty-val', fmt(STATE.banknifty.ltp));
    smartUpdate('top-banknifty-chg', `+${STATE.banknifty.pct.toFixed(2)}%`, col(STATE.banknifty.pct));
    
    // Expiry
    const expEl = document.querySelector('#expiry');
    if(expEl) {
        const d = new Date();
        const day = d.getDay();
        const diff = (day <= 4) ? (4 - day) : (11 - day);
        expEl.innerText = `${diff}d 4h`;
    }

    // Theme logic
    const themeBtn = document.querySelector('#theme-btn');
    if(themeBtn && !themeBtn.dataset.bound) {
        themeBtn.dataset.bound = "true";
        themeBtn.addEventListener('click', () => {
            const isDark = document.documentElement.dataset.theme !== 'light';
            document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
            localStorage.setItem('tf_theme', isDark ? 'light' : 'dark');
        });
        if(localStorage.getItem('tf_theme') === 'light') document.documentElement.dataset.theme = 'light';
    }
}

function renderTicker() {
    let wrap = document.querySelector('.ticker-wrap') || document.querySelector('#ticker-wrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'ticker-wrap';
        wrap.style.cssText = "width: 100%; overflow: hidden; background: #080b0f; border-bottom: 1px solid #1e2535; height: 38px; display: flex; align-items: center;";
        const main = document.querySelector('#main-content') || document.body;
        main.insertBefore(wrap, main.firstChild);
    }
    
    const upArrow = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    const downArrow = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>';
    
    const buildItem = (name, price, chg, pct) => `
        <div style="display:inline-flex; align-items:center; gap:8px; font-family:'Inter', monospace; font-size:12px; font-weight:600; padding:0 16px; border-right:1px solid #1e2535">
            <span style="color:#f1f5f9; letter-spacing:0.5px">${name}</span>
            <span style="color:#94a3b8">₹${fmt(price)}</span>
            <span style="color:${col(chg)}; display:flex; align-items:center; gap:2px; background:${chg>0?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)'}; padding:2px 6px; border-radius:4px;">
                ${chg>0?upArrow:downArrow} ${Math.abs(pct).toFixed(2)}%
            </span>
        </div>`;

    const niftyItem = buildItem("NIFTY 50", STATE.nifty.ltp, STATE.nifty.chg, STATE.nifty.pct);
    const bankNiftyItem = buildItem("BANKNIFTY", STATE.banknifty.ltp, STATE.banknifty.chg, STATE.banknifty.pct);
    const stocks = DEFAULT_WATCHLIST.map(w => buildItem(w.sym, w.ltp, w.chg, (w.chg/w.ltp)*100)).join('');
    
    const fullContent = niftyItem + bankNiftyItem + stocks;
    
    // Check if style for ticker keyframes exists, if not inject it
    if(!document.getElementById('ticker-style')) {
        const style = document.createElement('style');
        style.id = 'ticker-style';
        style.innerHTML = `@keyframes ticker-slide { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`;
        document.head.appendChild(style);
    }

    let slider = document.getElementById('ticker-slider');
    if (!slider) {
        wrap.innerHTML = `<div id="ticker-slider" style="display:flex; width:max-content; animation:ticker-slide 45s linear infinite; cursor:pointer;" onmouseover="this.style.animationPlayState='paused'" onmouseout="this.style.animationPlayState='running'"></div>`;
        slider = document.getElementById('ticker-slider');
    }
    
    // Only update the inner HTML of the slider to prevent animation reset
    slider.innerHTML = fullContent.repeat(4);
}

function renderHero() {
    const hero = document.querySelector('#hero-stats') || document.querySelector('.hero-stats');
    if (!hero) return;
    
    const vix = 13.42 + (Math.random()-0.5)*0.2;
    const pcr = 1.24 + (Math.random()-0.5)*0.02;
    
    if(hero.children.length === 0) {
        hero.innerHTML = `
            <div class="card p-4"><div class="text-xs all-caps text-2">NIFTY 50</div><div class="text-xl font-bold" id="hero-nifty-val" style="padding:2px 6px; margin:-2px -6px"></div><div class="text-sm font-medium" id="hero-nifty-chg" style="padding:2px 6px; margin:-2px -6px; display:inline-block"></div><svg class="mini-sparkline" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M0,20 Q10,25 20,15 T40,10 T60,18 T80,5 T100,2" fill="none" stroke="var(--bull-strong)" stroke-width="2"/></svg></div>
            <div class="card p-4"><div class="text-xs all-caps text-2">BANKNIFTY</div><div class="text-xl font-bold" id="hero-banknifty-val" style="padding:2px 6px; margin:-2px -6px"></div><div class="text-sm font-medium" id="hero-banknifty-chg" style="padding:2px 6px; margin:-2px -6px; display:inline-block"></div><svg class="mini-sparkline" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M0,25 Q10,20 20,25 T40,15 T60,5 T80,10 T100,5" fill="none" stroke="var(--bull-strong)" stroke-width="2"/></svg></div>
            <div class="card p-4"><div class="text-xs all-caps text-2">Market Breadth</div><div class="text-xl font-bold">67% Bullish</div><div class="breadth-bar"><div class="breadth-green" style="width:67%"></div><div class="breadth-red" style="width:33%"></div></div><div class="text-xs text-2 mt-2">Adv: 1,234 | Dec: 567</div></div>
            <div class="card p-4"><div class="text-xs all-caps text-2">India VIX</div><div class="text-xl font-bold" id="hero-vix-val" style="padding:2px 6px; margin:-2px -6px"></div><div class="text-sm text-2 mt-1">Volatility Index</div></div>
            <div class="card p-4"><div class="text-xs all-caps text-2">Put Call Ratio</div><div class="text-xl font-bold" id="hero-pcr-val" style="padding:2px 6px; margin:-2px -6px"></div><div class="text-sm text-2 mt-1" id="hero-pcr-txt"></div></div>
        `;
    }
    
    smartUpdate('hero-nifty-val', fmt(STATE.nifty.ltp));
    smartUpdate('hero-nifty-chg', `${sgn(STATE.nifty.chg)}${fmt(STATE.nifty.chg)} (${sgn(STATE.nifty.pct)}${STATE.nifty.pct.toFixed(2)}%)`, col(STATE.nifty.chg));
    
    smartUpdate('hero-banknifty-val', fmt(STATE.banknifty.ltp));
    smartUpdate('hero-banknifty-chg', `${sgn(STATE.banknifty.chg)}${fmt(STATE.banknifty.chg)} (${sgn(STATE.banknifty.pct)}${STATE.banknifty.pct.toFixed(2)}%)`, col(STATE.banknifty.chg));
    
    smartUpdate('hero-vix-val', fmt(vix), vix<15?'#22c55e':vix>20?'#ef4444':'#eab308');
    smartUpdate('hero-pcr-val', fmt(pcr), pcr>1?'#22c55e':'#ef4444');
    smartUpdate('hero-pcr-txt', pcr>1?'Bullish Bias':'Bearish Bias', pcr>1?'#22c55e':'#ef4444');
}

function renderSector() {
    const heatEl = document.querySelector('#heatmap') || document.querySelector('.heatmap-grid');
    if(heatEl) {
        const sortedSectors = [...SECTORS].sort((a, b) => b.change - a.change);
        heatEl.innerHTML = sortedSectors.map(s => {
            let h = Math.max(60, Math.min(110, 60 + Math.abs(s.change)*14));
            let bg, bc, tc;
            if(s.change > 2) { bg = 'rgba(34,197,94,0.22)'; bc = '#22c55e'; tc = '#22c55e'; }
            else if(s.change > 0.5) { bg = 'rgba(134,239,172,0.13)'; bc = '#86efac'; tc = '#86efac'; }
            else if(s.change > -0.5) { bg = 'rgba(148,163,184,0.09)'; bc = '#4a5568'; tc = '#94a3b8'; }
            else if(s.change > -2) { bg = 'rgba(252,165,165,0.13)'; bc = '#fca5a5'; tc = '#fca5a5'; }
            else { bg = 'rgba(239,68,68,0.22)'; bc = '#ef4444'; tc = '#ef4444'; }
            
            return `<div style="cursor:pointer; transition:all 0.18s; border-radius:8px; padding:12px; border:1px solid ${bc}; background:${bg}" onclick="selectSector('${s.name}')" onmouseover="this.style.transform='scale(1.04)';this.style.opacity='0.85'" onmouseout="this.style.transform='scale(1)';this.style.opacity='1'">
                <div style="font-size:13px; font-weight:500; color:${tc}">${s.name}</div>
                <div style="font-size:15px; font-weight:700; color:${tc}">${sgn(s.change)}${s.change.toFixed(2)}%</div>
                <div style="width:${Math.min(100, Math.abs(s.change)*30)}%; background:${tc}; height:3px; border-radius:2px; margin-top:6px"></div>
            </div>`;
        }).join('');
    }

    renderSectorDrilldown();
}

window.selectSector = function(name) {
    // Toggle off if clicking the same sector
    STATE.selectedSector = STATE.selectedSector === name ? null : name;
    renderSectorDrilldown();
}

function renderSectorDrilldown() {
    const dd = document.querySelector('#drill-down') || document.querySelector('.drill-down');
    if(!dd) return;

    const tvLink = (sym) => `onclick="window.open('https://in.tradingview.com/chart/?symbol=NSE%3A${sym}&interval=3', '_blank')" style="cursor:pointer" title="Open TradingView Chart"`;

    if (STATE.selectedSector) {
        // Show specific sector with all its stocks
        const sec = SECTORS.find(s => s.name === STATE.selectedSector);
        if(!sec) return;
        dd.style.cssText = "display:grid; grid-template-columns:1fr; gap:16px;";
        dd.innerHTML = `
            <div class="card p-4">
                <div class="flex justify-between items-center mb-2">
                    <div class="font-bold text-lg text-1">${sec.name} Sector Constituents</div>
                    <button class="badge badge-outline" onclick="selectSector('${sec.name}')" style="cursor:pointer">Close ✕</button>
                </div>
                <div class="text-xs text-2 mb-4 all-caps">Click any stock to open TradingView (3m timeframe)</div>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:12px;">
                    ${sec.stocks.map(st => `<div class="card p-3" ${tvLink(st.s)} onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border-dim)'">
                        <div class="flex justify-between items-center">
                            <span class="font-semibold" style="color:#f1f5f9">${st.s}</span>
                            <span style="color:${col(st.c)}; font-weight:600">${sgn(st.c)}${st.c.toFixed(2)}%</span>
                        </div>
                        <div class="text-xs text-2 mt-1">₹${fmt(st.ltp)}</div>
                    </div>`).join('')}
                </div>
                <div class="text-xs text-2 mt-4" style="border-top:1px solid var(--border-dim); padding-top:10px">Advancing: ${sec.adv} | Declining: ${sec.dec} | Relative Volume: ${sec.vol}x avg</div>
            </div>
        `;
    } else {
        // Show default top/bottom movers
        dd.style.cssText = "display:grid; grid-template-columns:repeat(3, 1fr); gap:16px;";
        const top = [...SECTORS].sort((a,b)=>b.change-a.change).slice(0,2);
        const bot = [...SECTORS].sort((a,b)=>a.change-b.change).slice(0,1);
        dd.innerHTML = [...top, ...bot].map(s => `
            <div class="card p-4">
                <div class="flex justify-between items-center mb-2"><div class="font-bold text-md text-1">${s.name}</div><div class="badge ${s.change>0?'badge-bull':'badge-bear'}">${s.change>0?'Bullish':'Bearish'}</div></div>
                <div class="text-xs text-2 mb-2 all-caps">Top Movers</div>
                ${s.stocks.slice(0,3).map(st => `<div class="stock-row" ${tvLink(st.s)} onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'"><span class="font-semibold">${st.s}</span><span style="color:${col(st.c)}">${sgn(st.c)}${st.c.toFixed(2)}%</span></div>`).join('')}
                <div class="text-xs text-2 mt-2">Adv: ${s.adv} Dec: ${s.dec} | Vol: ${s.vol}x avg</div>
            </div>
        `).join('');
    }
}

function renderFnO() {
    const bullEl = document.querySelector('#fno-bull');
    const bearEl = document.querySelector('#fno-bear');
    if(!bullEl || !bearEl) return;

    bullEl.innerHTML = FNO_STOCKS.bullish.map(w => `
        <div class="card" style="border-left:3px solid #22c55e; background:#141820; padding:12px; margin-bottom:8px; cursor:pointer">
            <div style="display:flex; justify-content:space-between; align-items:center">
                <span style="font-size:14px; font-weight:600; color:#f1f5f9">${w.sym}</span>
                <span style="font-size:13px; color:#22c55e">₹${w.ltp} &nbsp; +${w.chg}%</span>
            </div>
            <div style="font-size:11px; color:#94a3b8; margin:4px 0">Near Day High — Strong Momentum</div>
            <div style="display:flex; gap:12px; font-size:11px; color:#94a3b8; margin:6px 0">
                <span>OI Chg: <b style="color:#22c55e">${w.oi_chg}</b></span>
                <span>PCR: <b style="color:${w.pcr>1?'#22c55e':'#ef4444'}">${w.pcr}</b></span>
            </div>
            <div style="margin:6px 0">
                <div style="font-size:10px; color:#4a5568; margin-bottom:3px">Momentum</div>
                <div style="background:#1c2130; height:6px; border-radius:3px">
                    <div style="width:${w.momentum}%; height:100%; background:#22c55e; border-radius:3px; transition:width 0.8s ease"></div>
                </div>
            </div>
            <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:6px">
                ${w.tags.map(t=>`<span style="font-size:10px; padding:2px 7px; border-radius:10px; background:rgba(59,130,246,0.12); color:#85b7eb">${t}</span>`).join('')}
            </div>
        </div>
    `).join('');

    bearEl.innerHTML = FNO_STOCKS.bearish.map(w => `
        <div class="card" style="border-left:3px solid #ef4444; background:#141820; padding:12px; margin-bottom:8px; cursor:pointer">
            <div style="display:flex; justify-content:space-between; align-items:center">
                <span style="font-size:14px; font-weight:600; color:#f1f5f9">${w.sym}</span>
                <span style="font-size:13px; color:#ef4444">₹${w.ltp} &nbsp; ${w.chg}%</span>
            </div>
            <div style="font-size:11px; color:#94a3b8; margin:4px 0">Near Day Low — Weak Momentum</div>
            <div style="display:flex; gap:12px; font-size:11px; color:#94a3b8; margin:6px 0">
                <span>OI Chg: <b style="color:#ef4444">${w.oi_chg}</b></span>
                <span>PCR: <b style="color:${w.pcr>1?'#22c55e':'#ef4444'}">${w.pcr}</b></span>
            </div>
            <div style="margin:6px 0">
                <div style="font-size:10px; color:#4a5568; margin-bottom:3px">Momentum</div>
                <div style="background:#1c2130; height:6px; border-radius:3px">
                    <div style="width:${w.momentum}%; height:100%; background:#ef4444; border-radius:3px; transition:width 0.8s ease"></div>
                </div>
            </div>
            <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:6px">
                ${w.tags.map(t=>`<span style="font-size:10px; padding:2px 7px; border-radius:10px; background:rgba(59,130,246,0.12); color:#85b7eb">${t}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

function renderOptionsChain() {
    const table = document.querySelector('#option-chain') || document.querySelector('.option-chain');
    if(!table) return;

    let html = `<thead><tr style="color:#94a3b8; border-bottom:1px solid #1e2535; font-size:11px"><th>CE OI</th><th>Chng</th><th>CE LTP</th><th style="background:#1c2130; text-align:center">Strike</th><th>PE LTP</th><th>Chng</th><th>PE OI</th></tr></thead><tbody>`;
    
    let totalCE = 0, totalPE = 0;
    
    for(let i=22200; i<=22700; i+=50) {
        let isAtm = i === 22450;
        let ceOI = Math.round((800000 - Math.abs(i-22450)*2000 + Math.random()*50000)/100)*100;
        let peOI = Math.round((750000 - Math.abs(i-22350)*1800 + Math.random()*50000)/100)*100;
        totalCE += ceOI; totalPE += peOI;
        
        let ceOIStr = (ceOI/100000).toFixed(1) + 'M';
        let peOIStr = (peOI/100000).toFixed(1) + 'M';
        let ceLTP = i < 22450 ? (22450-i+15+Math.random()*5).toFixed(1) : (15+Math.random()*10).toFixed(1);
        let peLTP = i > 22450 ? (i-22450+12+Math.random()*5).toFixed(1) : (12+Math.random()*8).toFixed(1);
        
        let ceBar = (ceOI/1000000)*100;
        let peBar = (peOI/1000000)*100;

        let bg = isAtm ? 'background:rgba(234,179,8,0.1); border:1px solid rgba(234,179,8,0.3);' : '';
        
        html += `<tr style="${bg} font-size:12px; border-bottom:1px solid #1e2535">
            <td style="text-align:right">${ceOIStr} <div style="display:block;height:3px;background:#ef4444;width:${Math.min(100,ceBar)}%;border-radius:1px;margin-top:2px;float:right"></div></td>
            <td style="text-align:right; color:${Math.random()>0.5?'#22c55e':'#ef4444'}">${(Math.random()*10-3).toFixed(1)}%</td>
            <td style="text-align:right">${ceLTP}</td>
            <td style="text-align:center; font-weight:700; background:#1c2130">${i}</td>
            <td style="text-align:right">${peLTP}</td>
            <td style="text-align:right; color:${Math.random()>0.5?'#22c55e':'#ef4444'}">${(Math.random()*8-2).toFixed(1)}%</td>
            <td style="text-align:left"><div style="display:block;height:3px;background:#22c55e;width:${Math.min(100,peBar)}%;border-radius:1px;margin-top:2px;float:left"></div> ${peOIStr}</td>
        </tr>`;
    }
    table.innerHTML = html + "</tbody>";
    
    // Attempt to update option stats if they exist
    const cards = document.querySelectorAll('.option-stats .card .text-xl');
    if(cards.length >= 3) {
        cards[0].innerText = (totalPE/10000000).toFixed(1) + ' Cr';
        cards[1].innerText = (totalCE/10000000).toFixed(1) + ' Cr';
        let pcr = totalPE / totalCE;
        cards[2].innerHTML = `${pcr.toFixed(2)} <span class="text-sm font-medium ${pcr>1?'text-bull':'text-bear'}">${pcr>1?'Bullish':'Bearish'}</span>`;
    }
}

// Ensure AI scan connects globally
window.runAIScan = async function() {
    const btn = document.querySelector('.btn-ai') || document.querySelector('[onclick*="runAIScan"]');
    if(btn) { btn.disabled = true; btn.textContent = "⏳ Analyzing 500+ data points..."; }
    
    // Simulate API delay
    setTimeout(() => {
        const result = {
            market_bias: "Bullish", bias_score: 68, summary: "Broad-based buying with pharma and auto sectors leading",
            setups: [
                {rank:1, symbol:"SUNPHARMA", type:"Bullish Breakout", entry:1678, sl:1645, target1:1720, target2:1760, probability:78, reasoning:"Sector leader with strong OI buildup. FII accumulation visible.", tags:["F&O Confirmed","Sector Leader","High OI"]},
                {rank:2, symbol:"TATAMOTORS", type:"Bullish Momentum", entry:923, sl:900, target1:958, target2:990, probability:71, reasoning:"Auto sector strength. Breaking 52-week resistance with volume.", tags:["FII Backed","Vol Surge","Breakout"]},
                {rank:3, symbol:"DLF", type:"Short Setup", entry:834, sl:856, target1:805, target2:778, probability:65, reasoning:"Realty sector weakness. OI buildup on short side.", tags:["Short Build","Sector Weak"]}
            ],
            insight: "Defensive-to-cyclical rotation underway. Pharma and Auto outperforming. Avoid Realty and Metal longs today."
        };
        
        const container = document.querySelector('#ai-setups');
        if(container) {
            container.innerHTML = result.setups.map((s, i) => {
                const isBull = s.type.toLowerCase().includes('bull');
                const color = isBull ? "#22c55e" : "#ef4444";
                const medals = ["🥇","🥈","🥉"];
                return `
                <div style="background:#141820; border:1px solid #1e2535; border-radius:10px; padding:14px; flex:1; min-width:180px">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
                        <span style="font-size:18px">${medals[i]}</span>
                        <span style="font-size:11px; padding:2px 8px; border-radius:10px; background:${isBull?'rgba(34,197,94,0.12)':'rgba(239,68,68,0.12)'}; color:${color}">${s.type}</span>
                    </div>
                    <div style="font-size:18px; font-weight:700; color:#f1f5f9; margin-bottom:8px">${s.symbol}</div>
                    <div style="font-size:12px; color:#94a3b8; line-height:1.8">
                        Entry: <b style="color:#f1f5f9">₹${s.entry}</b><br>
                        SL: <b style="color:#ef4444">₹${s.sl}</b><br>
                        T1: <b style="color:#22c55e">₹${s.target1}</b> &nbsp; T2: <b style="color:#22c55e">₹${s.target2}</b>
                    </div>
                    <div style="margin:10px 0">
                        <div style="font-size:10px; color:#4a5568; margin-bottom:4px">Probability</div>
                        <div style="background:#1c2130; height:8px; border-radius:4px">
                            <div style="width:${s.probability}%; height:100%; background:${color}; border-radius:4px; transition:width 1s ease"></div>
                        </div>
                        <div style="font-size:11px; color:${color}; margin-top:2px">${s.probability}%</div>
                    </div>
                    <div style="font-size:11px; color:#94a3b8; line-height:1.5; margin-bottom:8px">${s.reasoning}</div>
                    <div style="display:flex; gap:4px; flex-wrap:wrap">
                        ${s.tags.map(t=>`<span style="font-size:10px; padding:2px 6px; border-radius:8px; background:rgba(59,130,246,0.1); color:#85b7eb">${t}</span>`).join('')}
                    </div>
                </div>`;
            }).join('');
        }
        
        if(btn) { btn.disabled = false; btn.textContent = "🔄 Run AI Scan Again"; }
        showToast("AI Scan completed successfully!", "success");
    }, 1500);
}

// Bind AI button if exists
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.querySelector('.btn-ai');
    if(btn) btn.addEventListener('click', window.runAIScan);
});

function renderGlobals() {
    const el = document.querySelector('#global-markets');
    if(!el) return;
    el.innerHTML = GLOBAL.map(m => `
        <div class="card p-4 global-card">
            <div>
                <div class="font-medium text-1 mb-1">${m.flag} ${m.name} <span class="badge ${m.status==='Open'?'badge-bull':'badge-outline'}" style="font-size:9px; padding:1px 4px">${m.status}</span></div>
                <div class="text-lg font-bold">${m.val.toLocaleString()}</div>
            </div>
            <div class="text-right">
                <div class="font-bold ${m.chg>0?'text-bull':'text-bear'} mb-1">${sgn(m.chg)}${m.chg.toFixed(2)}%</div>
                <svg class="mini-sparkline" style="width:50px; height:20px" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M0,15 Q20,${m.chg>0?5:25} 50,15 T100,${m.chg>0?5:25}" fill="none" stroke="${m.chg>0?'#22c55e':'#ef4444'}" stroke-width="2"/></svg>
            </div>
        </div>
    `).join('');
}

function renderNews() {
    const feed = document.querySelector('#news-feed');
    if(feed) {
        feed.innerHTML = NEWS.map(n => `
            <div class="news-item" style="padding:16px 0; border-bottom:1px solid var(--border-dim)">
                <div class="text-xs text-2 mb-1"><b>${n.source}</b> • ${n.time}</div>
                <div class="font-bold text-md mb-1 cursor-pointer" style="color:#f1f5f9">${n.headline}</div>
                <div class="text-xs text-2 mb-2">${n.summary}</div>
                <div class="flex gap-2 items-center">
                    ${n.tags.map(t=>`<span class="badge" style="background:rgba(59,130,246,0.12); color:#85b7eb">${t}</span>`).join('')}
                    <span class="badge" style="background:${n.sentiment==='BULLISH'?'rgba(34,197,94,0.15)':n.sentiment==='BEARISH'?'rgba(239,68,68,0.15)':'#1e2535'}; color:${n.sentiment==='BULLISH'?'#22c55e':n.sentiment==='BEARISH'?'#ef4444':'#94a3b8'}">${n.sentiment}</span>
                </div>
            </div>
        `).join('');
    }
}

function loadWatchlist() {
    try {
        const stored = localStorage.getItem('tf_watchlist');
        if(stored) STATE.watchlist = JSON.parse(stored);
        else STATE.watchlist = [...DEFAULT_WATCHLIST];
    } catch(e) { STATE.watchlist = [...DEFAULT_WATCHLIST]; }
    renderWatchlist();
}

function renderWatchlist() {
    const tb = document.querySelector('#wl-tbody');
    if(!tb) return;
    tb.innerHTML = STATE.watchlist.map((w, i) => {
        const pos = ((w.ltp - w.w52l) / (w.w52h - w.w52l)) * 100;
        return `<tr>
            <td>☆</td>
            <td class="font-bold text-1">${w.sym}</td>
            <td>${fmt(w.ltp)}</td>
            <td style="color:${col(w.chg)}">${sgn(w.chg)}${fmt(w.chg)}%</td>
            <td><div style="font-size:11px;color:#94a3b8">H:${w.high} L:${w.low}</div></td>
            <td>${w.vol}</td>
            <td>
                <div style="position:relative;height:4px;background:#1e2535;border-radius:2px;width:80px;display:inline-block">
                    <div style="position:absolute;left:${Math.min(100,Math.max(0,pos))}%;top:-3px;width:2px;height:10px;background:#f1f5f9;border-radius:1px"></div>
                </div>
            </td>
            <td style="cursor:pointer; color:#ef4444" onclick="removeWatchlist(${i})">×</td>
        </tr>`;
    }).join('');
}

window.removeWatchlist = function(index) {
    STATE.watchlist.splice(index, 1);
    localStorage.setItem('tf_watchlist', JSON.stringify(STATE.watchlist));
    renderWatchlist();
    showToast("Stock removed from watchlist", "info");
}

function renderAlgos() {
    const grid = document.querySelector('#algo-grid');
    if(!grid) return;
    grid.innerHTML = ALGOS.map(a => {
        const path = a.equity.map((v,i) => `${i*(100/7)},${40-((v-95)/30*40)}`).join(' ');
        return `
        <div class="card p-5" style="display:flex; flex-direction:column; justify-content:space-between; min-height:200px">
            <div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px">
                    <div style="font-weight:700; font-size:14px; color:#f1f5f9">${a.name}</div>
                    <span class="badge ${a.status==='Active'?'badge-bull':'badge-outline'}">${a.status}</span>
                </div>
                <div class="badge badge-purple" style="margin-bottom:8px">${a.type}</div>
                <div style="font-size:12px; color:#94a3b8; margin-bottom:16px; line-height:1.4">${a.desc}</div>
            </div>
            <div>
                <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid #1e2535">
                    <div><div style="color:#94a3b8; font-size:11px">Win Rate</div><div style="font-weight:700; color:#22c55e">${a.winRate}%</div></div>
                    <div><div style="color:#94a3b8; font-size:11px">Avg Ret</div><div style="font-weight:700; color:#22c55e">+${a.avgReturn}%</div></div>
                    <div><div style="color:#94a3b8; font-size:11px">Max DD</div><div style="font-weight:700; color:#ef4444">-${a.maxDD}%</div></div>
                </div>
                <svg height="40" width="100%" style="margin-bottom:12px">
                    <polyline points="${path}" fill="none" stroke="#22c55e" stroke-width="1.5"/>
                </svg>
                <div style="display:flex; gap:8px">
                    <button class="btn-primary" style="flex:1" onclick="showToast('Strategy deployed! Paper trading activated.', 'success')">Deploy</button>
                    <button class="btn-outline" style="flex:1" onclick="showToast('Backtest results loaded.', 'info')">Backtest</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// --- MASTER LOOP ---
function masterLoop() {
    const BASE_NIFTY = 22450.30;
    const BASE_BANKNIFTY = 48320.00;

    // Ticker & Indices
    setInterval(() => {
        // Use UTC time seconds so every device globally is on the exact same tick
        const t = Math.floor(Date.now() / 1000);
        
        // Complex deterministic wave combining slow trend and fast volatility
        STATE.nifty.ltp = BASE_NIFTY + Math.sin(t / 15) * 45 + Math.sin(t / 2) * 8 + Math.cos(t) * 3;
        STATE.nifty.chg = Math.sin(t / 15) * 45 + Math.sin(t / 2) * 8 + Math.cos(t) * 3; 
        STATE.nifty.pct = (STATE.nifty.chg / BASE_NIFTY) * 100;
        
        STATE.banknifty.ltp = BASE_BANKNIFTY + Math.sin(t / 12) * 110 + Math.sin(t / 3) * 18 + Math.cos(t) * 5;
        STATE.banknifty.chg = Math.sin(t / 12) * 110 + Math.sin(t / 3) * 18 + Math.cos(t) * 5;
        STATE.banknifty.pct = (STATE.banknifty.chg / BASE_BANKNIFTY) * 100;

        renderTopbar();
        renderHero();
        renderTicker();
    }, 1000);

    // Watchlist & Sectors & Globals
    setInterval(() => {
        const t = Math.floor(Date.now() / 1000);
        
        STATE.watchlist.forEach((w, i) => {
            if(!w.baseLtp) w.baseLtp = w.ltp;
            if(!w.baseChg) w.baseChg = w.chg;
            // Unique deterministic path per stock
            const diff = Math.sin(t / (8 + i)) * 8 + Math.cos(t / (2 + i % 3)) * 2;
            w.ltp = w.baseLtp + diff;
            w.chg = w.baseChg + diff;
        });
        renderWatchlist();

        SECTORS.forEach((s, i) => {
            if(!s.baseChange) s.baseChange = s.change;
            s.change = s.baseChange + Math.sin(t / (10 + i)) * 1.2 + Math.cos(t / 3) * 0.3;
        });
        renderSector();

        GLOBAL.forEach((g, i) => { 
            if(g.status === 'Open') {
                if(!g.baseChg) g.baseChg = g.chg;
                g.chg = g.baseChg + Math.sin(t / (15 + i)) * 0.4 + Math.cos(t / 4) * 0.1;
            }
        });
        renderGlobals();
    }, 1000);
}

// --- INIT ---
function init() {
    renderNav();
    renderTopbar();
    renderTicker();
    renderHero();
    renderSector();
    renderFnO();
    renderOptionsChain();
    renderGlobals();
    renderNews();
    loadWatchlist();
    renderAlgos();

    // IntersectionObserver for scroll-spy nav highlighting
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                const id = entry.target.id;
                document.querySelectorAll('.nav-item').forEach(nav => {
                    if(nav.getAttribute('onclick') && nav.getAttribute('onclick').includes(id)) {
                        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                        nav.classList.add('active');
                    }
                });
            }
        });
    }, { threshold: 0.3 });
    document.querySelectorAll('section').forEach(sec => observer.observe(sec));

    masterLoop();
}

document.addEventListener('DOMContentLoaded', init);
// Fallback if already loaded
if(document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(init, 1);
}
