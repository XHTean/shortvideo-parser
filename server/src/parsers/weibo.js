'use strict';

/**
 * 微博解析器
 * 微博的视频地址基本都写在内嵌 JSON 的 page_info 里，用移动端页面命中率更高
 */

const logger = require('../utils/logger.js');
const { extract, deepFindAll, flattenStrings } = require('../services/extractor.js');
const { isHttpUrl, isVideoUrl, cleanMediaUrl } = require('../utils/url.js');

module.exports = {
  key: 'weibo',
  name: '微博',

  async parse(ctx) {
    const { finalUrl } = await ctx.resolve();

    // 统一换成移动端页面，结构简单、命中率高
    let pageUrl = finalUrl;
    const m = finalUrl.match(/weibo\.com\/(?:detail|[^/]+\/([A-Za-z0-9]{6,}))/) || finalUrl.match(/status\/(\d{6,})/);
    if (/weibo\.com|weibo\.cn/.test(finalUrl)) {
      pageUrl = finalUrl.replace('weibo.com', 'm.weibo.cn').replace('weibo.cn', 'm.weibo.cn');
      if (m && !/\/status\//.test(pageUrl)) {
        pageUrl = `https://m.weibo.cn/status/${m[1]}`;
      }
    }

    for (const url of [pageUrl, finalUrl]) {
      try {
        const html = await ctx.fetchText(url, {
          uaKind: 'android',
          referer: 'https://m.weibo.cn/'
        });
        if (!html) continue;

        const data = extract(html, finalUrl);

        // page_info 里通常还藏着高清版本
        const extra = [];
        const marker = html.indexOf('page_info');
        if (marker > -1) {
          const jsonStart = html.indexOf('{', marker);
          if (jsonStart > -1) {
            const chunk = html.slice(jsonStart, jsonStart + 8000);
            const urls = chunk.match(/https?:\\?\/\\?\/[^"'\\\s]+?(?:\.mp4|\.m3u8)[^"'\\\s]*/gi) || [];
            urls.forEach((u) => {
              const clean = cleanMediaUrl(u.replace(/\\\//g, '/'));
              if (isHttpUrl(clean)) extra.push(clean);
            });
          }
        }

        const videos = []
          .concat(extra)
          .concat((data.media || []).filter((x) => x.type === 'video').map((x) => x.url))
          .filter((u) => isHttpUrl(u) && isVideoUrl(u));

        if (videos.length) {
          return {
            title: data.title || '微博视频',
            author: data.author || '',
            cover: data.cover || '',
            duration: data.duration || 0,
            type: 'video',
            media: dedupe(videos)
              .slice(0, 3)
              .map((u, i) => ({ type: 'video', url: u, quality: i === 0 ? 'original' : 'backup' })),
            sourceUrl: finalUrl
          };
        }

        if (data.media.length) {
          return {
            title: data.title || '微博素材',
            author: data.author || '',
            cover: data.cover || '',
            duration: data.duration || 0,
            type: data.type,
            media: data.media,
            sourceUrl: finalUrl
          };
        }
      } catch (e) {
        logger.debug('微博通道失败:', url, e.message);
      }
    }

    return null;
  }
};

function dedupe(list) {
  const seen = new Set();
  return list.filter((u) => {
    const k = String(u).split('?')[0];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
