'use strict';

/**
 * HTTP 抓取层
 * - 手写重定向跟随，拿到最终地址
 * - 维护会话 Cookie（抖音/小红书这类站先落地页再取数据时要用）
 * - 统一超时 / UA / Referer
 * - 可选代理（PROXY_URL），服务器在海外时很有用
 */

const cfg = require('../config.js');
const logger = require('../utils/logger.js');
const config = require('../config.js');

let dispatcher = null;
let undici = null;
try {
  undici = require('undici');
  if (cfg.proxyUrl) {
    dispatcher = new undici.ProxyAgent(cfg.proxyUrl);
    logger.info('已启用出口代理');
  }
} catch (e) {
  if (cfg.proxyUrl) logger.warn('PROXY_URL 已配置但 undici 不可用，代理未启用');
}

function pickUA(kind) {
  const ua = cfg.userAgents;
  if (kind === 'desktop') return ua.desktop;
  if (kind === 'android') return ua.android;
  return ua.ios;
}

class Session {
  constructor() {
    this.cookies = {};
    this.redirectChain = [];
  }

  cookieHeader(host) {
    const all = Object.keys(this.cookies).map((k) => `${k}=${this.cookies[k]}`);
    if (!all.length) return '';
    // 不严格区分域，抓取场景够用
    return all.join('; ');
  }

  absorbCookies(res, url) {
    let raw = [];
    if (res.headers && typeof res.headers.getSetCookie === 'function') {
      raw = res.headers.getSetCookie();
    }
    if (!raw.length) {
      const single = res.headers.get('set-cookie');
      if (single) raw = [single];
    }
    raw.forEach((line) => {
      const first = String(line).split(';')[0];
      const idx = first.indexOf('=');
      if (idx > 0) {
        const name = first.slice(0, idx).trim();
        const value = first.slice(idx + 1).trim();
        if (name) this.cookies[name] = value;
      }
    });
    return raw;
  }

  /**
   * 单次请求（不跟重定向）
   */
  async once(url, opts = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeout || cfg.httpTimeout);

    const headers = Object.assign(
      {
        'User-Agent': opts.ua || pickUA(opts.uaKind),
        Accept:
          opts.accept ||
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
      },
      opts.headers || {}
    );

    if (opts.referer) headers.Referer = opts.referer;
    const ck = this.cookieHeader();
    if (ck) headers.Cookie = ck;

    const init = {
      method: opts.method || 'GET',
      headers,
      redirect: 'manual',
      signal: controller.signal,
      body: opts.body
    };
    if (dispatcher) init.dispatcher = dispatcher;

    try {
      const res = await fetch(url, init);
      this.absorbCookies(res, url);
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * 请求 + 自动跟跳，返回 { status, finalUrl, text, res, chain }
   */
  async fetch(url, opts = {}) {
    let current = url;
    const chain = [url];
    const max = opts.maxRedirects === undefined ? cfg.maxRedirects : opts.maxRedirects;

    for (let i = 0; i <= max; i += 1) {
      const res = await this.once(current, opts);

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) break;
        const next = new URL(loc, current).toString();
        chain.push(next);
        current = next;
        continue;
      }

      const isText =
        opts.asText === false
          ? false
          : /^(text\/|application\/(json|javascript|xml|x-www-form-urlencoded))/i.test(
              res.headers.get('content-type') || ''
            );

      const text = isText ? await res.text().catch(() => '') : '';

      this.redirectChain = chain;
      return { status: res.status, finalUrl: current, text, res, chain };
    }

    this.redirectChain = chain;
    return { status: 0, finalUrl: current, text: '', res: null, chain };
  }

  async fetchText(url, opts = {}) {
    const r = await this.fetch(url, opts);
    return r.text;
  }

  async fetchJson(url, opts = {}) {
    const r = await this.fetch(url, Object.assign({}, opts, { asText: true }));
    try {
      return JSON.parse(r.text);
    } catch (e) {
      return null;
    }
  }
}

/** 只跟跳、不要正文（省流量，短链还原够用） */
async function resolveFinalUrl(url, opts = {}) {
  const s = new Session();
  const r = await s.fetch(url, Object.assign({ asText: false }, opts));
  return { finalUrl: r.finalUrl, status: r.status, chain: r.chain, session: s };
}

/** 直接拉一段文本 */
async function getText(url, opts = {}) {
  const s = opts.session || new Session();
  const headers = Object.assign({}, opts.headers || {});
  if (!headers.Referer && opts.referer !== false) {
    headers.Referer = opts.referer || 'https://www.google.com/';
  }
  return s.fetchText(url, Object.assign({}, opts, { headers }));
}

module.exports = { Session, resolveFinalUrl, getText, pickUA, config };
