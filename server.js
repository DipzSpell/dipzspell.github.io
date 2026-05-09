const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
const PORT = 8080;

// ===== NSE DATA CACHE =====
let cachedData = null;
let cacheTimestamp = 0;
let nseCookies = '';

function getCacheDuration() {
    // IST = UTC + 5:30
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 5.5 * 3600000);
    const day = ist.getDay();
    const h = ist.getHours(), m = ist.getMinutes(), t = h * 60 + m;
    const isWeekday = day > 0 && day < 6;
    const isMarketHours = t >= 555 && t <= 930;
    if (isWeekday && isMarketHours) return 30 * 1000; // 30s during market hours
    return 10 * 60 * 1000; // 10 minutes when market is closed
}

// ===== NSE API FETCHER =====
function httpsGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'identity',
                ...headers,
            },
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
    });
}

async function getNSECookies() {
    try {
        const res = await httpsGet('https://www.nseindia.com/', {});
        const setCookies = res.headers['set-cookie'];
        if (setCookies) {
            nseCookies = setCookies.map(c => c.split(';')[0]).join('; ');
        }
        console.log('[NSE] Cookies obtained');
        return true;
    } catch (e) {
        console.error('[NSE] Failed to get cookies:', e.message);
        return false;
    }
}

async function fetchNSEIndices() {
    // Check cache first
    const now = Date.now();
    if (cachedData && (now - cacheTimestamp) < getCacheDuration()) {
        console.log('[NSE] Returning cached data');
        return cachedData;
    }

    try {
        // Get fresh cookies if needed
        if (!nseCookies) {
            await getNSECookies();
        }

        const res = await httpsGet('https://www.nseindia.com/api/allIndices', {
            'Cookie': nseCookies,
            'Referer': 'https://www.nseindia.com/market-data/live-market-indices',
        });

        if (res.status === 401 || res.status === 403) {
            console.log('[NSE] Auth expired, refreshing cookies...');
            nseCookies = '';
            await getNSECookies();
            const retry = await httpsGet('https://www.nseindia.com/api/allIndices', {
                'Cookie': nseCookies,
                'Referer': 'https://www.nseindia.com/market-data/live-market-indices',
            });
            if (retry.status === 200) {
                const json = JSON.parse(retry.body);
                cachedData = json;
                cacheTimestamp = Date.now();
                console.log('[NSE] Data fetched (after retry), indices:', json.data?.length);
                return json;
            }
        }

        if (res.status === 200) {
            const json = JSON.parse(res.body);
            cachedData = json;
            cacheTimestamp = Date.now();
            console.log('[NSE] Data fetched, indices:', json.data?.length);
            return json;
        }

        console.error('[NSE] Unexpected status:', res.status);
        return cachedData; // Return stale cache if available
    } catch (e) {
        console.error('[NSE] Fetch error:', e.message);
        return cachedData; // Return stale cache if available
    }
}

// ===== API ROUTES =====
app.get('/api/indices', async (req, res) => {
    try {
        const data = await fetchNSEIndices();
        if (data) {
            res.json({ success: true, data: data, timestamp: cacheTimestamp });
        } else {
            res.json({ success: false, error: 'No data available', data: null });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Sector stocks cache
const sectorCache = {};
const SECTOR_CACHE_MS = 10 * 60 * 1000; // 10 min cache for stock-level data

app.get('/api/sector/:name', async (req, res) => {
    const indexName = decodeURIComponent(req.params.name);
    const now = Date.now();
    // Check cache
    if (sectorCache[indexName] && (now - sectorCache[indexName].ts) < SECTOR_CACHE_MS) {
        return res.json({ success: true, data: sectorCache[indexName].data });
    }
    try {
        if (!nseCookies) await getNSECookies();
        const url = `https://www.nseindia.com/api/equity-stockIndices?index=${encodeURIComponent(indexName)}`;
        let result = await httpsGet(url, {
            'Cookie': nseCookies,
            'Referer': 'https://www.nseindia.com/market-data/live-market-indices',
        });
        if (result.status === 401 || result.status === 403) {
            nseCookies = '';
            await getNSECookies();
            result = await httpsGet(url, {
                'Cookie': nseCookies,
                'Referer': 'https://www.nseindia.com/market-data/live-market-indices',
            });
        }
        if (result.status === 200) {
            const json = JSON.parse(result.body);
            sectorCache[indexName] = { data: json, ts: Date.now() };
            console.log(`[NSE] Sector data fetched: ${indexName}, stocks: ${json.data?.length}`);
            return res.json({ success: true, data: json });
        }
        // Return stale cache if available
        if (sectorCache[indexName]) return res.json({ success: true, data: sectorCache[indexName].data });
        res.json({ success: false, error: 'Failed to fetch sector data' });
    } catch (e) {
        console.error(`[NSE] Sector fetch error (${indexName}):`, e.message);
        if (sectorCache[indexName]) return res.json({ success: true, data: sectorCache[indexName].data });
        res.status(500).json({ success: false, error: e.message });
    }
});

// Option Chain Cache
const optionsCache = {};
const OPTIONS_CACHE_MS = 60 * 1000; // 1 min cache

app.get('/api/options/:symbol', async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    const now = Date.now();
    if (optionsCache[symbol] && (now - optionsCache[symbol].ts) < OPTIONS_CACHE_MS) {
        return res.json({ success: true, data: optionsCache[symbol].data });
    }
    try {
        if (!nseCookies) await getNSECookies();
        const url = `https://www.nseindia.com/api/option-chain-indices?symbol=${symbol}`;
        let result = await httpsGet(url, { 'Cookie': nseCookies, 'Referer': 'https://www.nseindia.com/option-chain' });
        if (result.status === 401 || result.status === 403) {
            nseCookies = ''; await getNSECookies();
            result = await httpsGet(url, { 'Cookie': nseCookies, 'Referer': 'https://www.nseindia.com/option-chain' });
        }
        if (result.status === 200) {
            const json = JSON.parse(result.body);
            optionsCache[symbol] = { data: json, ts: Date.now() };
            return res.json({ success: true, data: json });
        }
        res.json({ success: false, error: 'Failed to fetch options data' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// FII/DII Cache
let fiiDiiCache = null;
let fiiDiiCacheTs = 0;
const FIIDII_CACHE_MS = 30 * 60 * 1000; // 30 min cache

app.get('/api/fii-dii', async (req, res) => {
    const now = Date.now();
    if (fiiDiiCache && (now - fiiDiiCacheTs) < FIIDII_CACHE_MS) {
        return res.json({ success: true, data: fiiDiiCache });
    }
    try {
        if (!nseCookies) await getNSECookies();
        const url = `https://www.nseindia.com/api/fiidiiTradeReact`;
        let result = await httpsGet(url, { 'Cookie': nseCookies, 'Referer': 'https://www.nseindia.com/' });
        if (result.status === 401 || result.status === 403) {
            nseCookies = ''; await getNSECookies();
            result = await httpsGet(url, { 'Cookie': nseCookies, 'Referer': 'https://www.nseindia.com/' });
        }
        if (result.status === 200) {
            const json = JSON.parse(result.body);
            fiiDiiCache = json;
            fiiDiiCacheTs = Date.now();
            return res.json({ success: true, data: json });
        }
        res.json({ success: false, error: 'Failed to fetch FII/DII data' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ===== STATIC FILES =====
app.use(express.static(path.join(__dirname)));

// ===== START =====
app.listen(PORT, () => {
    console.log(`\n🚀 TradeFinder Dashboard running at http://localhost:${PORT}\n`);
    // Pre-fetch cookies on startup
    getNSECookies().then(() => {
        console.log('[NSE] Ready to fetch data');
    });
});
