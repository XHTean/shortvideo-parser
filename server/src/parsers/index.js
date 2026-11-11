'use strict';

/**
 * 解析调度层
 * 统一入口：识别平台 → 选解析器 → 失败逐级兜底 → 结果归一化
 */

const logger = require('../utils/logger.js');
const { Session } = require('../services/fetcher.js');
const { detect, platformName } = require('../services/detector.js');
const { extractUrl, isHttpUrl } = require('../utils/url.js');
const { extract } = require('../services/extractor.js');

const generic = require('./generic.js');
const douyin = require('./douyin.js');
const kuaishou = require('./kuaishou.js');
const xiaohongshu = require('./xiaohongshu.js');
const bilibili = require('./bilibili.js');
const weibo = require('./weibo.js');

const REGISTRY = {
  douyin,
  kuaishou,
  xiaohongshu,
  bilibili,
  weibo,
  generic
};

const PARSE_TIMEOUT = 30000;

class ParseError extends Error {
  constructor(message, code = 1001) {
    super(message);
    this.code = code;
  }
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} 超时`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function makeCtx(url) {
  const session = new Session();
  let cached = null;

  return {
    url,
    session,

    /** 跟随短链，拿到最终地址（只跳转、不拉正文） */
    async resolve() {
      if (cached) return cached;
      try {
        const r = await session.fetch(url, { asText: false });
        cached = { finalUrl: r.finalUrl, status: r.status, chain: r.chain };
      } catch (e) {
        logger.debug('短链还原失败:', e.message);
        cached = { finalUrl: url, status: 0, chain: [url] };
      }
      return cached;
    },

    fetchText: (u, opts) => session.fetchText(u, opts),
    fetchJson: (u, opts) => session.fetchJson(u, opts)
  };
}

function normalizeResult(raw, platform, sourceUrl) {
  if (!raw) return null;
  const media = Array.isArray(raw.media)
    ? raw.media
        .filter((m) => m && isHttpUrl(m.url))
        .map((m) => ({
          type: m.type === 'image' ? 'image' : 'video',
          url: m.url,
          quality: m.quality || 'original'
        }))
    : [];

  if (!media.length) return null;

  const type =
    raw.type === 'image' || media.every((m) => m.type === 'image') ? 'image' : 'video';

  return {
    platform,
    platformName: platformName(platform),
    type,
    title: String(raw.title || '').slice(0, 200).trim() || `${platformName(platform)}素材`,
    author: String(raw.author || '').slice(0, 60),
    authorAvatar: raw.authorAvatar || '',
    cover: raw.cover || (type === 'image' ? media[0].url : ''),
    duration: Number(raw.duration) || 0,
    media,
    sourceUrl: raw.sourceUrl || sourceUrl,
    parsedAt: Date.now()
  };
}

/**
 * 主解析入口
 * @param {string} input 分享链接或含链接的分享文案
 * @returns {Promise<Object>} MediaResult
 */
async function parseUrl(input) {
  const url = extractUrl(input) || String(input || '').trim();
  if (!isHttpUrl(url)) {
    throw new ParseError('没有识别到有效链接，重新复制一次试试', 1002);
  }

  const platform = detect(url);
  const ctx = makeCtx(url);
  logger.info('解析开始', platform, url.slice(0, 120));

  // ---- 按平台解析 ----
  let result = null;
  const parser = REGISTRY[platform];
  if (parser) {
    try {
      result = await withTimeout(parser.parse(ctx), PARSE_TIMEOUT, parser.name);
    } catch (e) {
      logger.warn(`${platform} 解析异常:`, e.message);
    }
  }

  // ---- 兜底：通用提取 ----
  if (!result) {
    try {
      result = await withTimeout(generic.parse(ctx, platform), PARSE_TIMEOUT, '通用提取');
    } catch (e) {
      logger.warn('通用提取异常:', e.message);
    }
  }

  const normalized = normalizeResult(result, platform, url);
  if (!normalized) {
    throw new ParseError('这条链接没解析出可用素材，换个链接或者稍后再试', 1003);
  }

  logger.info('解析成功', platform, normalized.type, normalized.media.length);
  return normalized;
}

module.exports = { parseUrl, ParseError, REGISTRY };
