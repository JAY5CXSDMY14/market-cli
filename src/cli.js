#!/usr/bin/env node

/**
 * Market CLI - 命令行界面
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CONFIG_FILE = path.join(__dirname, '..', 'config', 'watchlist.json');

// 默认观察列表
const DEFAULT_WATCHLIST = {
    stocks: {
        name: 'A股',
        symbols: [
            { symbol: 'sh000001', name: '上证指数' },
            { symbol: 'sz399001', name: '深证成指' },
            { symbol: 'sh600519', name: '贵州茅台' }
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
            { symbol: 'XAUUSD', name: '黄金/美元' }
        ]
    },
    crypto: {
        name: '加密货币',
        symbols: [
            { symbol: 'bitcoin', name: 'BTC' },
            { symbol: 'ethereum', name: 'ETH' }
        ]
    }
};

// 颜色
const COLORS = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m'
};

// 帮助信息
function showHelp() {
    console.log(`
${COLORS.cyan}📊 Market CLI - 市场价格监控${COLORS.reset}

用法: 
  npm start          # 查看所有市场价格
  npm run check      # 快速检查
  npm run watch      # 实时监控 (每5秒刷新)

配置:
  编辑 ${CONFIG_FILE} 自定义关注列表

示例:
  $ npm start
  $ npm run watch
`);
}

// 添加股票
function addStock(symbol, name, market = 'stocks') {
    let config = DEFAULT_WATCHLIST;
    
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        } catch (e) {}
    }
    
    if (!config[market]) {
        config[market] = { name: market, symbols: [] };
    }
    
    config[market].symbols.push({ symbol, name });
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(`✅ 已添加 ${name} (${symbol})`);
}

// 命令处理
const args = process.argv.slice(2);
const command = args[0];

if (command === 'add') {
    const symbol = args[1];
    const name = args[2];
    const market = args[3] || 'stocks';
    
    if (symbol && name) {
        addStock(symbol, name, market);
    } else {
        console.log('用法: npm run add -- <代码> <名称> [市场]');
        console.log('示例: npm run add -- sh600519 贵州茅台 stocks');
        console.log('       npm run add -- hk00700 腾讯控股 hkstocks');
    }
} else if (command === 'help' || command === '--help' || command === '-h') {
    showHelp();
} else if (command === 'watch') {
    console.log(`${COLORS.yellow}🔄 实时监控模式 (Ctrl+C 退出)${COLORS.reset}`);
    console.log('');
    
    // 定时刷新
    let count = 0;
    const interval = setInterval(() => {
        count++;
        console.clear();
        console.log(`${COLORS.cyan}📊 Market CLI - 第 ${count} 次刷新${COLORS.reset}`);
        console.log('');
        
        const main = require('./index.js');
        main().then(() => {
            console.log('');
            console.log(`${COLORS.cyan}⏰ ${new Date().toLocaleTimeString()} | Ctrl+C 退出${COLORS.reset}`);
        }).catch(console.error);
        
        if (count >= 100) clearInterval(interval);
    }, 5000);
    
    // 监听退出
    process.on('SIGINT', () => {
        clearInterval(interval);
        console.log('\n👋 退出监控');
        process.exit(0);
    });
} else {
    // 默认执行主程序
    const main = require('./index.js');
    main().catch(console.error);
}
