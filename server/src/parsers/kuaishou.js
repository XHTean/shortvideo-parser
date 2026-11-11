'use strict';

/**
 * 快手解析器
 * 通道：分享页内嵌状态 → 通用提取
 */

const logger = require('../utils/logger.js');
const {
  embeddedJsonBlocks,
  extract,
  deepFindAll,
  flattenStrings
} = require('../services/extractor.js');
const { isHttpUrl, isVideoUrl, cleanMediaUrl } = require('../utils/url.js');

function pickId(text) {
  const s = String(text || '');
  const m =
    s.match(/short-video\/([A-Za-z0-9_-]{6,})/) ||
    s.match(/fw\/photo\/([A-Za-z0-9_-]{6,})/) ||
    s.match(/photoId=([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : '';
}

module.exports = {
  key: 'kuaishou',
  name: '快手',

  async parse(ctx) {
    const { finalUrl } = await ctx.resolve();
    const id = pickId(finalUrl) || pickId(ctx.url);

    const candidates = [];
    if (id) {
      candidates.push(`https://www.kuaishou.com/short-video/${id}`);
      candidates.push(`https://v.m.chenzhongtech.com/fw/photo/${id}`);
    }
    candidates.push(finalUrl);

    for (const page of candidates) {
      try {
        const html = await ctx.fetchText(page, {
          uaKind: 'desktop',
          referer: 'https://www.kuaishou.com/'
        });
        if (!html) continue;

        // ---- 内嵌状态（__APOLLO_STATE__ 里的 VisionVideoDetailPhoto） ----
        const blocks = embeddedJsonBlocks(html);
        for (const b of blocks) {
          let data;
          try {
            data = JSON.parse(b.raw);
          } catch (e) {
            continue;
          }

          const photoUrls = [];
          [
            'photoUrl',
            'srcNoMark',
            'playUrl',
            'manifest',
            'src',
            'mainMvUrls',
            'downloadUrl'
          ].forEach((k) => {
            deepFindAll(data, k, 6).forEach((v) => flattenStrings(v, photoUrls));
          });

          const videos = photoUrls
            .filter((u) => isHttpUrl(u) && (isVideoUrl(u) || /video|\.mp4|m3u8/i.test(u)))
            .map(cleanMediaUrl);

          if (!videos.length) continue;

          const caption =
            (deepFindAll(data, 'caption', 3).find((x) => typeof x === 'string') || '') ||
            (deepFindAll(data, 'title', 3).find((x) => typeof x === 'string') || '');

          const user =
            (deepFindAll(data, 'userName', 3).find((x) => typeof x === 'string') || '') ||
            (deepFindAll(data, 'name', 3).find((x) => typeof x === 'string') || '');

          const coverCandidates = [];
          ['coverUrl', 'coverUrls', 'webpCoverUrl', 'cover'].forEach((k) => {
            deepFindAll(data, k, 4).forEach((v) => flattenStrings(v, coverCandidates));
          });

          logger.debug('快手：内嵌状态命中');
          return {
            title: String(caption).trim() || '快手素材',
            author: String(user).trim(),
            cover: coverCandidates.find((u) => isHttpUrl(u)) || '',
            duration: 0,
            type: 'video',
            media: videos.slice(0, 3).map((u, i) => ({
              type: 'video',
              url: u,
              quality: i === 0 ? 'original' : 'backup'
            })),
            sourceUrl: finalUrl
          };
        }

        // ---- 通用提取兜底 ----
        const data = extract(html, finalUrl);
        if (data.media.length) {
          logger.debug('快手：通用提取命中');
          return {
            title: data.title || '快手素材',
            author: data.author || '',
            cover: data.cover || '',
            duration: data.duration || 0,
            type: data.type,
            media: data.media,
            sourceUrl: finalUrl
          };
        }
      } catch (e) {
        logger.debug('快手通道失败:', page, e.message);
      }
    }

    return null;
  },

  pickId
};
