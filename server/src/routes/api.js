'use strict';

const express = require('express');
const { Readable } = require('stream');

const cfg = require('../config.js');
const logger = require('../utils/logger.js');
const { parseUrl, ParseError } = require('../parsers/index.js');
const upstream = require('../services/upstream.js');
const { detect, PLATFORMS } = require('../services/detector.js');
const {
  isHttpUrl,
  hostOf,
  isPrivateHost,
  originOf,
  extractUrl
} = require('../utils/url.js');

const router = express.Router();

/** 素材站点的 Referer 映射，用来绕开最常见的防盗链 */
function refererFor(url) {
  const h = hostOf(url);
  const map = [
    [/(douyinvod|douyinpic|byteimg|snssdk|amemv)/, 'https://www.douyin.com/'],
    [/(kwimgs|kuaishou|chenzhongtech|gifshow)/, 'https://www.kuaishou.com/'],
    [/(xhscdn|xiaohongshu)/, 'https://www.xiaohongshu.com/'],
    [/(hdslb|bilivideo|bilibili)/, 'https://www.bilibili.com/'],
    [/(sinaimg|weibo|weibocdn)/, 'https://weibo.com/'],
    [/(ixigua|ixiguavideo|xigua)/, 'https://www.ixigua.com/']
  ];
  for (const [re, ref] of map) {
    if (re.test(h)) return ref;
  }
  return originOf(url) || '';
}

/* ============================================================
   GET /api/health
   ============================================================ */
router.get('/health', (req, res) => {
  res.json({
    code: 0,
    data: {
      status: 'ok',
      version: cfg.version,
      upstream: upstream.enabled(),
      uptime: Math.round(process.uptime()),
      time: Date.now()
    }
  });
});

/* ============================================================
   GET /api/platforms
   ============================================================ */
router.get('/platforms', (req, res) => {
  res.json({
    code: 0,
    data: PLATFORMS.map((p) => ({ key: p.key, name: p.name }))
  });
});

/* ============================================================
   POST /api/parse
   body: { url: "分享链接或含链接的分享文案" }
   ============================================================ */
router.post('/parse', async (req, res) => {
  const raw = (req.body && (req.body.url || req.body.text)) || '';
  const input = String(raw).trim();

  // 参数校验
  if (!input) {
    return res.status(400).json({ code: 1400, message: '缺少参数 url' });
  }
  if (input.length > 2000) {
    return res.status(400).json({ code: 1400, message: '链接太长，只支持常规分享链接' });
  }

  const url = extractUrl(input) || input;
  if (!isHttpUrl(url)) {
    return res.status(400).json({ code: 1401, message: '没有识别到有效链接' });
  }
  if (isPrivateHost(hostOf(url))) {
    return res.status(400).json({ code: 1402, message: '不支持内网地址' });
  }

  const platform = detect(url);
  const started = Date.now();

  try {
    // 1) 上游通道优先（配了才走）
    let result = await upstream.tryUpstream(url);
    let via = 'upstream';

    // 2) 本地解析器
    if (!result) {
      via = 'local';
      result = await parseUrl(input);
    }

    if (!result.platform) result.platform = platform;
    if (!result.platformName) {
      result.platformName = (PLATFORMS.find((p) => p.key === result.platform) || {}).name || '其他';
    }

    logger.info(
      `parse ok via=${via} platform=${result.platform} media=${result.media.length} cost=${Date.now() - started}ms`
    );

    return res.json({ code: 0, data: result, via, cost: Date.now() - started });
  } catch (err) {
    const code = err instanceof ParseError ? err.code : 1500;
    const message =
      err instanceof ParseError
        ? err.message
        : '解析服务暂时不可用，稍后再试';
    logger.warn(`parse fail platform=${platform} code=${code}:`, err.message);
    return res.status(code === 1002 || code === 1003 ? 422 : 500).json({ code, message });
  }
});

/* ============================================================
   GET /api/download?u=<encoded url>
   中转下载：解决小程序 downloadFile 域名白名单 + CDN 防盗链
   ============================================================ */
router.get('/download', async (req, res) => {
  const target = String(req.query.u || '');
  if (!isHttpUrl(target)) {
    return res.status(400).json({ code: 1400, message: '参数不合法' });
  }
  if (isPrivateHost(hostOf(target))) {
    return res.status(400).json({ code: 1402, message: '不支持内网地址' });
  }

  const range = req.headers.range;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);

    const headers = {
      'User-Agent': cfg.userAgents.desktop,
      Accept: '*/*',
      'Accept-Encoding': 'identity'
    };
    const ref = refererFor(target);
    if (ref) headers.Referer = ref;
    if (range) headers.Range = range;

    const upstreamRes = await fetch(target, {
      headers,
      redirect: 'follow',
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      logger.warn('下载中转失败:', upstreamRes.status, target.slice(0, 100));
      return res.status(502).json({ code: 1502, message: `源站返回 ${upstreamRes.status}` });
    }

    const ct = upstreamRes.headers.get('content-type');
    const cl = upstreamRes.headers.get('content-length');
    const cr = upstreamRes.headers.get('content-range');
    const ar = upstreamRes.headers.get('accept-ranges');

    if (ct) res.setHeader('Content-Type', ct);
    if (cl) res.setHeader('Content-Length', cl);
    if (cr) res.setHeader('Content-Range', cr);
    if (ar) res.setHeader('Accept-Ranges', ar);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    res.status(upstreamRes.status);

    if (!upstreamRes.body) return res.end();

    const nodeStream = Readable.fromWeb(upstreamRes.body);
    nodeStream.on('error', () => {
      if (!res.headersSent) res.status(502);
      res.end();
    });
    return nodeStream.pipe(res);
  } catch (e) {
    logger.warn('下载中转异常:', e.message, (e.cause && (e.cause.message || e.cause.code)) || '');
    if (!res.headersSent) {
      return res.status(502).json({ code: 1502, message: '素材下载失败' });
    }
    return res.end();
  }
});

module.exports = router;
