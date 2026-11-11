'use strict';

/**
 * 抖音解析器
 *
 * 通道顺序（前一个拿不到就往下走，全部失败返回 null 交给兜底）：
 *   1. 官方 Web 详情接口 —— 需要 a_bogus 签名，配置 DOUYIN_SIGNER_URL 后启用
 *   2. 分享页 SSR / 内嵌 JSON 提取
 *   3. 通用网页提取
 *
 * ⚠️ 抖音的 Web 接口签名策略会不定期升级，失效时优先用「上游解析通道」，
 *    或者把签名服务的地址配到 DOUYIN_SIGNER_URL。
 */

const cfg = require('../config.js');
const logger = require('../utils/logger.js');
const {
  deepFindAll,
  flattenStrings,
  extract
} = require('../services/extractor.js');
const { cleanMediaUrl, isHttpUrl } = require('../utils/url.js');

const ID_RE = /(\d{15,25})/;

function pickId(text) {
  const m = String(text || '').match(/(?:video|note|modal_id=|share\/video\/)(\d{15,25})/);
  if (m) return m[1];
  const m2 = String(text || '').match(ID_RE);
  return m2 ? m2[1] : '';
}

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function buildDetailApi(id) {
  const params = new URLSearchParams({
    aweme_id: id,
    device_platform: 'webapp',
    aid: '6383',
    channel: 'channel_pc_web',
    pc_client_type: '1',
    version_code: '170400',
    version_name: '17.4.0',
    cookie_enabled: 'true',
    screen_width: '1920',
    screen_height: '1080',
    browser_language: 'zh-CN',
    browser_platform: 'Win32',
    browser_name: 'Chrome',
    browser_version: '126.0.0.0',
    browser_online: 'true',
    engine_name: 'Blink',
    engine_version: '126.0.0.0',
    os_name: 'Windows',
    os_version: '10',
    cpu_core_num: '8',
    device_memory: '8',
    platform: 'PC',
    downlink: '10',
    effective_type: '4g',
    round_trip_time: '50'
  });
  return `https://www.douyin.com/aweme/v1/web/aweme/detail/?${params.toString()}`;
}

/** 调用外部签名服务换取 a_bogus（可选能力） */
async function sign(url) {
  if (!cfg.douyinSignerUrl) return url;
  try {
    const res = await fetch(cfg.douyinSignerUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(cfg.upstreamTimeout)
    });
    const json = await res.json();
    const bogus = json && (json.a_bogus || json.data || json.sign);
    if (typeof bogus === 'string' && bogus) {
      return `${url}&a_bogus=${encodeURIComponent(bogus)}`;
    }
  } catch (e) {
    logger.warn('抖音签名服务调用失败:', e.message);
  }
  return url;
}

/** 把 aweme_detail 结构拍平成统一格式 */
function normalizeAweme(a, sourceUrl) {
  if (!a || typeof a !== 'object') return null;

  const video = a.video || {};
  const coverObj = video.origin_cover || video.cover || video.dynamic_cover || {};

  const videoUrls = [];
  ['play_addr', 'play_addr_h264', 'play_addr_265', 'download_addr'].forEach((k) => {
    if (!video[k]) return;
    flattenStrings(video[k], videoUrls);
  });
  (video.bit_rate || []).forEach((br) => {
    flattenStrings(br.play_addr, videoUrls);
  });

  const uri =
    (video.play_addr && video.play_addr.uri) ||
    (video.download_addr && video.download_addr.uri) ||
    video.uri ||
    '';

  const cleaned = videoUrls
    .filter((u) => isHttpUrl(u))
    .map((u) => cleanMediaUrl(u));

  if (uri) {
    cleaned.push(
      `https://aweme.snssdk.com/aweme/v1/play/?video_id=${uri}&ratio=1080p&line=0`
    );
  }

  const images = [];
  (a.images || []).forEach((img) => {
    flattenStrings(img, images);
  });

  const coverList = [];
  flattenStrings(coverObj, coverList);

  const uniq = (list) => {
    const seen = new Set();
    return list.filter((u) => {
      const k = String(u).split('?')[0];
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const finalVideos = uniq(cleaned);
  const finalImages = uniq(images.filter((u) => isHttpUrl(u)));

  if (!finalVideos.length && !finalImages.length) return null;

  const type = finalVideos.length ? 'video' : 'image';
  const media = finalVideos.length
    ? finalVideos.slice(0, 3).map((u, i) => ({
        type: 'video',
        url: u,
        quality: i === 0 ? 'original' : 'backup'
      }))
    : finalImages.map((u) => ({ type: 'image', url: u }));

  return {
    title: (a.desc || a.item_title || '').trim() || '抖音素材',
    author: (a.author && a.author.nickname) || '',
    authorAvatar: (a.author && a.author.avatar_thumb && flattenStrings(a.author.avatar_thumb)[0]) || '',
    cover: coverList.find((u) => isHttpUrl(u)) || '',
    duration: Number(video.duration || a.duration || 0) || 0,
    type,
    media,
    sourceUrl
  };
}

module.exports = {
  key: 'douyin',
  name: '抖音',

  async parse(ctx) {
    const { finalUrl } = await ctx.resolve();
    const id = pickId(finalUrl) || pickId(ctx.url);
    if (!id) return null;

    const referer = `https://www.douyin.com/video/${id}`;

    // ---- 通道 1：官方 Web 详情接口 ----
    try {
      const api = await sign(buildDetailApi(id));
      const json = await ctx.fetchJson(api, {
        ua: DESKTOP_UA,
        referer,
        headers: { Accept: 'application/json, text/plain, */*' }
      });
      if (json && json.aweme_detail) {
        const r = normalizeAweme(json.aweme_detail, finalUrl);
        if (r) {
          logger.debug('抖音：Web 接口命中');
          return r;
        }
      }
    } catch (e) {
      logger.debug('抖音 Web 接口未命中:', e.message);
    }

    // ---- 通道 2：分享页提取 ----
    try {
      const shareUrl = `https://www.iesdouyin.com/share/video/${id}/`;
      const html = await ctx.fetchText(shareUrl, { uaKind: 'ios', referer });
      if (html) {
        const data = extract(html, finalUrl);
        if (data.media.length) {
          logger.debug('抖音：分享页命中');
          return {
            title: data.title || `抖音作品 ${id}`,
            author: data.author || '',
            cover: data.cover || '',
            duration: data.duration || 0,
            type: data.type,
            media: data.media,
            sourceUrl: finalUrl
          };
        }
      }
    } catch (e) {
      logger.debug('抖音分享页未命中:', e.message);
    }

    return null;
  },

  normalizeAweme,
  pickId
};
