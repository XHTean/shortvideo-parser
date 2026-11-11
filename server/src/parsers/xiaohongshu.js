'use strict';

/**
 * 小红书解析器
 * 通道：笔记页 __INITIAL_STATE__ → 通用提取
 * 说明：小红书详情接口带 xsec_token 校验，未登录态可能拿不到数据，
 *      拿不到时自动落到通用提取，再由「上游解析通道」补位。
 */

const logger = require('../utils/logger.js');
const { extract, matchBrace, deepFindAll, flattenStrings } = require('../services/extractor.js');
const { isHttpUrl, cleanMediaUrl } = require('../utils/url.js');

function pickNoteId(text) {
  const s = String(text || '');
  const m =
    s.match(/(?:explore|discovery\/item|item)\/([0-9a-f]{20,32})/i) ||
    s.match(/noteId=([0-9a-f]{20,32})/i);
  return m ? m[1] : '';
}

/** 小红书的内嵌 JSON 里有裸 undefined，得先洗一遍 */
function parseLenient(raw) {
  const fixed = raw
    .replace(/:\s*undefined/g, ':null')
    .replace(/,\s*undefined/g, ',null')
    .replace(/\[\s*undefined/g, '[null');
  try {
    return JSON.parse(fixed);
  } catch (e) {
    return null;
  }
}

function readInitialState(html) {
  const marker = 'window.__INITIAL_STATE__';
  const i = html.indexOf(marker);
  if (i < 0) return null;
  const s = html.indexOf('{', i);
  if (s < 0) return null;
  const end = matchBrace(html, s);
  if (end < 0) return null;
  return parseLenient(html.slice(s, end + 1));
}

module.exports = {
  key: 'xiaohongshu',
  name: '小红书',

  async parse(ctx) {
    const { finalUrl } = await ctx.resolve();
    const noteId = pickNoteId(finalUrl) || pickNoteId(ctx.url);

    // 先落地一次首页，把 cookie（a1 / web_session 之类）带进会话，提高拿到数据的概率
    try {
      await ctx.fetchText('https://www.xiaohongshu.com/explore', {
        uaKind: 'desktop',
        asText: false
      });
    } catch (e) {
      /* 忽略 */
    }

    const pageUrl = noteId
      ? `https://www.xiaohongshu.com/explore/${noteId}`
      : finalUrl;

    try {
      const html = await ctx.fetchText(pageUrl, {
        uaKind: 'desktop',
        referer: 'https://www.xiaohongshu.com/'
      });

      if (html) {
        const state = readInitialState(html);
        if (state) {
          const maps = deepFindAll(state, 'noteDetailMap', 3);
          for (const map of maps) {
            if (!map || typeof map !== 'object') continue;
            const keys = Object.keys(map);
            for (const k of keys) {
              const entry = map[k];
              const note = (entry && (entry.note || entry.noteCard)) || null;
              if (!note) continue;

              const info = normalizeNote(note, finalUrl);
              if (info) {
                logger.debug('小红书：__INITIAL_STATE__ 命中');
                return info;
              }
            }
          }
        }

        const data = extract(html, finalUrl);
        if (data.media.length) {
          logger.debug('小红书：通用提取命中');
          return {
            title: data.title || '小红书笔记',
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
      logger.debug('小红书通道失败:', e.message);
    }

    return null;
  },

  pickNoteId,
  readInitialState
};

function normalizeNote(note, sourceUrl) {
  const videoUrls = [];
  if (note.video && note.video.media && note.video.media.stream) {
    const stream = note.video.media.stream;
    ['h264', 'h265', 'av1'].forEach((codec) => {
      (stream[codec] || []).forEach((item) => {
        if (item.masterUrl) flattenStrings(item.masterUrl, videoUrls);
        if (item.backupUrls) flattenStrings(item.backupUrls, videoUrls);
      });
    });
  }

  const images = [];
  (note.imageList || note.image_list || []).forEach((img) => {
    const u =
      img.urlDefault || img.urlPre || img.url || img.urlTrace || '';
    if (u) flattenStrings(u, images);
  });

  const coverCandidates = [];
  if (note.video && note.video.image) flattenStrings(note.video.image, coverCandidates);
  if (note.cover) flattenStrings(note.cover, coverCandidates);

  const videos = videoUrls.filter(isHttpUrl).map(cleanMediaUrl);
  const imgs = images.filter(isHttpUrl);

  if (!videos.length && !imgs.length) return null;

  return {
    title: (note.title || note.desc || '小红书笔记').toString().trim().slice(0, 120),
    author: (note.user && (note.user.nickname || note.user.nickName)) || '',
    authorAvatar: (note.user && note.user.avatar) || '',
    cover: coverCandidates.find((u) => isHttpUrl(u)) || imgs[0] || '',
    duration: 0,
    type: videos.length ? 'video' : 'image',
    media: videos.length
      ? videos.slice(0, 3).map((u, i) => ({
          type: 'video',
          url: u,
          quality: i === 0 ? 'original' : 'backup'
        }))
      : imgs.map((u) => ({ type: 'image', url: u })),
    sourceUrl
  };
}
