'use strict';

/**
 * 通用网页解析器（兜底）
 * 适用于任何把媒体地址写在 HTML / meta / 内嵌 JSON 里的网页
 */

const { extract } = require('../services/extractor.js');

module.exports = {
  key: 'generic',
  name: '通用网页',
  match: () => true,

  async parse(ctx) {
    const { finalUrl } = await ctx.resolve();
    const html = await ctx.fetchText(finalUrl, { uaKind: 'desktop' });
    if (!html) return null;

    const data = extract(html, finalUrl);
    if (!data.media.length) return null;

    return {
      title: data.title || '未命名素材',
      author: data.author || '',
      cover: data.cover || '',
      duration: data.duration || 0,
      type: data.type,
      media: data.media,
      sourceUrl: finalUrl
    };
  }
};
