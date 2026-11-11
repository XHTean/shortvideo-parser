'use strict';

const net = require('net');

const URL_RE = /https?:\/\/[^\s"'<>，。；！？、）)】\]}]+/i;

/** 从一段文本里取第一个链接（分享文案常年是「标题 + 链接」混排） */
function extractUrl(text) {
  if (!text) return '';
  const m = String(text).match(URL_RE);
  if (!m) return '';
  return m[0].replace(/[.,;:!?)"'\]】，。；：！？、）】]+$/g, '');
}

function isHttpUrl(u) {
  return /^https?:\/\//i.test(String(u || ''));
}

/** 绝对化 */
function resolveUrl(base, rel) {
  try {
    return new URL(rel, base).toString();
  } catch (e) {
    return rel;
  }
}

/** 取主域名，用于 Referer 伪造 */
function originOf(u) {
  try {
    const x = new URL(u);
    return `${x.protocol}//${x.host}/`;
  } catch (e) {
    return '';
  }
}

function hostOf(u) {
  try {
    return new URL(u).hostname.toLowerCase();
  } catch (e) {
    return '';
  }
}

/**
 * SSRF 防护：禁止下载接口被拿来探测内网
 */
function isPrivateHost(host) {
  if (!host) return true;
  const h = host.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true;
  if (h === '0.0.0.0' || h === '[::1]' || h === '::1') return true;

  // 纯 IP 判断
  if (net.isIP(h)) {
    if (net.isIPv4(h)) {
      const p = h.split('.').map(Number);
      if (p[0] === 10) return true;
      if (p[0] === 127) return true;
      if (p[0] === 0) return true;
      if (p[0] === 169 && p[1] === 254) return true;
      if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
      if (p[0] === 192 && p[1] === 168) return true;
      if (p[0] >= 224) return true;
      return false;
    }
    // IPv6 私有段
    if (/^f[cd]/i.test(h)) return true;
    if (/^fe80/i.test(h)) return true;
  }
  return false;
}

/** 屏蔽明显不是媒体的地址 */
const BLOCK_EXT = [
  '.css', '.js', '.woff', '.woff2', '.ttf', '.otf', '.ico', '.svg',
  '.json', '.xml', '.txt'
];

/** 站点自身的静态资源 / 报错页配图，这些不是用户素材 */
const STATIC_ASSET_RE =
  /(\/static\/|\/platform\/|\/assets\/|jinkela|bfs\/static|web\/static|\/dist\/|favicon|sprite|logo\.|\.svg|error[-_]?page|404\.|412\.)/i;

function looksLikeMedia(u) {
  const s = String(u).toLowerCase();
  if (!isHttpUrl(s)) return false;
  if (BLOCK_EXT.some((e) => s.split('?')[0].endsWith(e))) return false;
  if (STATIC_ASSET_RE.test(s)) return false;
  if (/(avatar|icon|logo|sprite|placeholder|qrcode|watermark)/i.test(s)) return false;
  return true;
}

function isVideoUrl(u) {
  const s = String(u).toLowerCase().split('?')[0];
  return /\.(mp4|m3u8|mov|m4v|flv|webm)$/.test(s);
}

function isImageUrl(u) {
  const s = String(u).toLowerCase().split('?')[0];
  if (/\.(jpg|jpeg|png|webp|heic|bmp)$/.test(s)) return true;
  // CDN 常见无扩展名，带图片处理参数也算
  return /(imageview|image_view|x-oss-process|\/obj\/|\.jpeg)/i.test(String(u));
}

/** 去掉 URL 里的防盗链/追踪参数，尽量保留资源本体参数 */
function cleanMediaUrl(u) {
  try {
    const x = new URL(u);
    // 抖音的 playwm -> play 是无水印直链的关键
    if (/\/playwm\//.test(x.pathname)) {
      x.pathname = x.pathname.replace('/playwm/', '/play/');
    }
    return x.toString();
  } catch (e) {
    return u;
  }
}

module.exports = {
  extractUrl,
  isHttpUrl,
  resolveUrl,
  originOf,
  hostOf,
  isPrivateHost,
  looksLikeMedia,
  isVideoUrl,
  isImageUrl,
  cleanMediaUrl,
  STATIC_ASSET_RE
};
