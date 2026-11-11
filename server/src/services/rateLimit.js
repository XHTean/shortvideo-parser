'use strict';

/**
 * 轻量限流：内存滑动窗口，按 IP 计
 * 单机部署够用；多实例部署换成 Redis 即可
 */

const cfg = require('../config.js');

const WINDOW_MS = 60 * 1000;
const MAX_ENTRIES = 20000;

const buckets = new Map();

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf) return String(xf).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function hit(ip) {
  const now = Date.now();
  let arr = buckets.get(ip);
  if (!arr) {
    arr = [];
    buckets.set(ip, arr);
  }
  // 丢掉过期记录
  while (arr.length && now - arr[0] > WINDOW_MS) arr.shift();
  arr.push(now);

  if (buckets.size > MAX_ENTRIES) {
    // 简单清理，避免内存无限增长
    const cutoff = now - WINDOW_MS;
    for (const [k, v] of buckets) {
      if (!v.length || v[v.length - 1] < cutoff) buckets.delete(k);
      if (buckets.size <= MAX_ENTRIES / 2) break;
    }
  }

  return {
    count: arr.length,
    limit: cfg.rateLimitPerMin,
    retryAfter: Math.max(1, Math.ceil((arr[0] + WINDOW_MS - now) / 1000))
  };
}

function middleware() {
  return (req, res, next) => {
    const ip = clientIp(req);
    const r = hit(ip);
    res.setHeader('X-RateLimit-Limit', r.limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, r.limit - r.count));

    if (r.count > r.limit) {
      res.setHeader('Retry-After', r.retryAfter);
      return res.status(429).json({
        code: 1429,
        message: `请求有点频繁，${r.retryAfter} 秒后再试`
      });
    }
    return next();
  };
}

module.exports = { middleware, clientIp };
