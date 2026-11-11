'use strict';

/**
 * 上游解析通道（可选）
 * 平台接口失效时，配一个可用的解析服务地址就能顶上，不用改代码。
 * 约定：POST {url} → {code:0, data:{platform,title,media:[...]}}
 */

const cfg = require('../config.js');
const logger = require('../utils/logger.js');

function enabled() {
  return !!cfg.upstreamUrl;
}

async function tryUpstream(url) {
  if (!enabled()) return null;

  const headers = { 'content-type': 'application/json' };
  if (cfg.upstreamToken) headers.Authorization = cfg.upstreamToken;

  try {
    const res = await fetch(cfg.upstreamUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(cfg.upstreamTimeout)
    });

    if (!res.ok) {
      logger.warn('上游解析返回异常状态:', res.status);
      return null;
    }

    const json = await res.json();
    const data = json && (json.data || json);
    if (!data || !Array.isArray(data.media) || !data.media.length) {
      logger.debug('上游解析没有可用素材');
      return null;
    }

    return {
      platform: data.platform || '',
      title: data.title || '',
      author: data.author || '',
      authorAvatar: data.authorAvatar || '',
      cover: data.cover || '',
      duration: Number(data.duration) || 0,
      type: data.type === 'image' ? 'image' : 'video',
      media: data.media
        .filter((m) => m && m.url)
        .map((m) => ({
          type: m.type === 'image' ? 'image' : 'video',
          url: m.url,
          quality: m.quality || 'original'
        })),
      sourceUrl: data.sourceUrl || url
    };
  } catch (e) {
    logger.warn('上游解析调用失败:', e.message);
    return null;
  }
}

module.exports = { tryUpstream, enabled };
