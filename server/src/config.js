'use strict';

/**
 * 配置读取（全部来自环境变量，换服务器不用改代码）
 */

function num(key, def) {
  const v = process.env[key];
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
}

function str(key, def) {
  const v = process.env[key];
  return v === undefined || v === '' ? def : v;
}

const config = {
  port: num('PORT', 3000),
  corsOrigin: str('CORS_ORIGIN', '*'),
  version: '1.0.0',

  rateLimitPerMin: num('RATE_LIMIT_PER_MIN', 30),

  httpTimeout: num('HTTP_TIMEOUT', 15000),
  maxRedirects: num('MAX_REDIRECTS', 6),
  proxyUrl: str('PROXY_URL', ''),

  upstreamUrl: str('UPSTREAM_URL', ''),
  upstreamToken: str('UPSTREAM_TOKEN', ''),
  upstreamTimeout: num('UPSTREAM_TIMEOUT', 12000),

  douyinSignerUrl: str('DOUYIN_SIGNER_URL', ''),

  logLevel: str('LOG_LEVEL', 'info')
};

// 常见手机 / 桌面 UA，随机挑一个，降低被当成爬虫的概率
config.userAgents = {
  ios:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 ' +
    '(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/126.0.0.0 Mobile Safari/537.36',
  desktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/126.0.0.0 Safari/537.36'
};

module.exports = config;
