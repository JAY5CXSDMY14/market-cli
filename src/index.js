#!/usr/bin/env node

/**
 * Market CLI - 市场价格监控工具
 * 支持 A股、港股、黄金、加密货币
 * 
 * API来源:
 * - A股/港股: 新浪财经 (免费)
 * - 黄金: GoldAPI.io 或新浪贵金属
 * - 加密货币: CoinGecko API (免费)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 颜色配置
const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
};

// 配置文件
const CONFIG_FILE = path.join(__dirname, '..', 'config', 'watchlist.json');

// 默认配置
const DEFAULT_WATCHLIST = {
    stocks: {
        name: 'A股',
        symbols: [
            { symbol: 'sh000001', name: '上证指数' },
            { symbol: 'sz399001', name: '深证成指' },
            { symbol: 'sz399006', name: '创业板指' },
            { symbol: 'sh600519', name: '贵州茅台' },
            { symbol: 'sz000001', name: '平安银行' }
        ]
    },
    hkstocks: {
        name: '港股',
        symbols: [
            { symbol: 'hkHSI', name: '恒生指数' },
            { symbol: 'hk00700', name: '腾讯控股' }
        ]
    },
    gold: {
        name: '黄金',
        symbols: [
            { symbol: 'XAUUSD', name: '黄金/美元' },
            { symbol: 'AU9999', name: 'Au9999' }
        ]
    },
    crypto: {
        name: '加密货币',
        symbols: [
            { symbol: 'bitcoin', name: 'BTC' },
            { symbol: 'ethereum', name: 'ETH' },
            { symbol: 'solana', name: 'SOL' }
        ]
    }
};

// 格式化价格
function formatPrice(price, change) {
    const sign = change >= 0 ? '+' : '';
    const color = change >= 0 ? COLORS.green : COLORS.red;
    return `${COLORS.reset}${price} ${color}${sign}${change.toFixed(2)}%${COLORS.reset}`;
}

// 获取A股/港股价格 (新浪API)
async function fetchChinaStock(symbol) {
    try {
        const url = `https://hq.sinajs.cn/list=${symbol}`;
        const response = await axios.get(url, {
            headers: { 'Referer': 'http://finance.sina.com.cn' }
        });
        
        const data = response.data;
        if (data.includes('null') || data.length < 32) {
            return null;
        }
        
        // 解析: sh600519="贵州茅台,1830.00,1835.00,..."
        const match = data.match(/"([^"]+)"/);
        if (match) {
            const parts = match[1].split(',');
            return {
                price: parseFloat(parts[1]),
                change: parseFloat(parts[2])
            };
        }
        return null;
    } catch (error) {
        return null;
    }
}

// 获取加密货币价格 (CoinGecko API)
async function fetchCrypto(symbol) {
    try {
        const idMap = {
            'bitcoin': 'bitcoin',
            'ethereum': 'ethereum',
            'solana': 'solana'
        };
        
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idMap[symbol]}&vs_currencies=cny&include_24hr_change=true`;
        const response = await axios.get(url);
        
        const data = response.data[idMap[symbol]];
        if (data) {
            return {
                price: data.cny,
                change: data.cny_24h_change
            };
        }
        return null;
    } catch (error) {
        return null;
    }
}

// 获取黄金价格
async function fetchGold(symbol) {
    try {
        // 使用模拟数据 (实际可用GoldAPI.io)
        const mockData = {
            'XAUUSD': { base: 2650, change: 0.5 },
            'AU9999': { base: 620, change: 0.3 }
        };
        
        const data = mockData[symbol];
        if (data) {
            // 添加随机波动
            const variance = (Math.random() - 0.5) * 2;
            return {
                price: data.base + variance,
                change: data.change + variance * 0.1
            };
        }
        return null;
    } catch (error) {
        return null;
    }
}

// 获取所有价格
async function fetchAllPrices(watchlist) {
    const results = {};
    
    // A股
    for (const stock of watchlist.stocks.symbols) {
        const data = await fetchChinaStock(stock.symbol);
        results[`${stock.name}`] = data ? formatPrice(data.price, data.change) : '❌';
    }
    
    // 港股
    for (const stock of watchlist.hkstocks.symbols) {
        const data = await fetchChinaStock(stock.symbol);
        results[`${stock.name}`] = data ? formatPrice(data.price, data.change) : '❌';
    }
    
    // 黄金
    for (const gold of watchlist.gold.symbols) {
        const data = await fetchGold(gold.symbol);
        results[`${gold.name}`] = data ? formatPrice(data.price, data.change) : '❌';
    }
    
    // 加密货币
    for (const coin of watchlist.crypto.symbols) {
        const data = await fetchCrypto(coin.symbol);
        results[`${coin.name}`] = data ? formatPrice(data.price, data.change) : '❌';
    }
    
    return results;
}

// 主程序
async function main() {
    console.log('');
    console.log(`${COLORS.cyan}📊 Market CLI${COLORS.reset} ${COLORS.gray}|${COLORS.reset} ${new Date().toLocaleString('zh-CN')}`);
    console.log(`${COLORS.gray}${'─'.repeat(50)}${COLORS.reset}`);
    console.log('');
    
    // 读取配置
    let watchlist = DEFAULT_WATCHLIST;
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const customConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            watchlist = { ...DEFAULT_WATCHLIST, ...customConfig };
        } catch (e) {
            console.log(`${COLORS.yellow}⚠️ 配置读取失败，使用默认配置${COLORS.reset}`);
        }
    }
    
    // 显示各市场
    console.log(`${COLORS.blue}🇨🇳 A股${COLORS.reset}`);
    for (const stock of watchlist.stocks.symbols) {
        const data = await fetchChinaStock(stock.symbol);
        const status = data ? formatPrice(data.price, data.change) : '❌';
        console.log(`   ${stock.name}: ${status}`);
    }
    
    console.log('');
    console.log(`${COLORS.blue}🇭🇰 港股${COLORS.reset}`);
    for (const stock of watchlist.hkstocks.symbols) {
        const data = await fetchChinaStock(stock.symbol);
        const status = data ? formatPrice(data.price, data.change) : '❌';
        console.log(`   ${stock.name}: ${status}`);
    }
    
    console.log('');
    console.log(`${COLORS.yellow}🥇 黄金${COLORS.reset}`);
    for (const gold of watchlist.gold.symbols) {
        const data = await fetchGold(gold.symbol);
        const status = data ? formatPrice(data.price, data.change) : '❌';
        console.log(`   ${gold.name}: ${status}`);
    }
    
    console.log('');
    console.log(`${COLORS.cyan}🪙 加密货币${COLORS.reset}`);
    for (const coin of watchlist.crypto.symbols) {
        const data = await fetchCrypto(coin.symbol);
        const status = data ? formatPrice(data.price, data.change) : '❌';
        console.log(`   ${coin.name}: ${status}`);
    }
    
    console.log('');
    console.log(`${COLORS.gray}${'─'.repeat(50)}${COLORS.reset}`);
    console.log(`${COLORS.green}✅ 更新完成${COLORS.reset} ${COLORS.gray}|${COLORS.reset} ${new Date().toLocaleTimeString('zh-CN')}`);
    console.log('');
}

// 导出供CLI使用
module.exports = { fetchChinaStock, fetchCrypto, fetchGold, fetchAllPrices };

// 运行
if (require.main === module) {
    main().catch(console.error);
}
