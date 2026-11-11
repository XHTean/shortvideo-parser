'use strict';

/**
 * 哔哩哔哩解析器
 * 走公开的 view / playurl 接口，不需要登录（清晰度受未登录策略限制）
 */

const logger = require('../utils/logger.js');
const { isHttpUrl } = require('../utils/url.js');

const REFERER = 'https://www.bilibili.com/';

function pickBv(text) {
  const s = String(text || '');
  const bv = s.match(/(BV[0-9A-Za-z]{10})/);
  if (bv) return { bvid: bv[1] };
  const av = s.match(/\/av(\d+)/i) || s.match(/aid=(\d+)/i);
  if (av) return { aid: av[1] };
  return null;
}

module.exports = {
  key: 'bilibili',
  name: '哔哩哔哩',

  async parse(ctx) {
    const { finalUrl } = await ctx.resolve();
    const id = pickBv(finalUrl) || pickBv(ctx.url);
    if (!id) return null;

    // 拿一个访客指纹，绕过最常见的 412 风控
    let cookie = '';
    try {
      const spi = await ctx.fetchJson('https://api.bilibili.com/x/frontend/finger/spi', {
        uaKind: 'desktop',
        referer: REFERER
      });
      if (spi && spi.data && spi.data.b_3) cookie = `buvid3=${spi.data.b_3}`;
    } catch (e) {
      logger.debug('bilibili spi 失败:', e.message);
    }

    const headers = {
      Referer: REFERER,
      Origin: 'https://www.bilibili.com',
      Accept: 'application/json, text/plain, */*'
    };
    if (cookie) headers.Cookie = cookie;

    const viewUrl = id.bvid
      ? `https://api.bilibili.com/x/web-interface/view?bvid=${id.bvid}`
      : `https://api.bilibili.com/x/web-interface/view?aid=${id.aid}`;

    let view = null;
    try {
      view = await ctx.fetchJson(viewUrl, { uaKind: 'desktop', headers });
    } catch (e) {
      logger.debug('bilibili view 失败:', e.message);
    }

    if (!view || view.code !== 0 || !view.data) return null;

    const d = view.data;
    const cid = d.cid || (d.pages && d.pages[0] && d.pages[0].cid);

    const videoUrls = [];
    if (cid) {
      try {
        const play = await ctx.fetchJson(
          `https://api.bilibili.com/x/player/playurl?bvid=${d.bvid}&cid=${cid}&qn=80&fnval=1&fourk=1`,
          { uaKind: 'desktop', headers }
        );
        if (play && play.code === 0 && play.data) {
          (play.data.durl || []).forEach((x) => {
            if (x.url) videoUrls.push(x.url);
            (x.backup_url || []).forEach((u) => videoUrls.push(u));
          });
          if (play.data.dash) {
            (play.data.dash.video || []).forEach((v) => {
              if (v.baseUrl) videoUrls.push(v.baseUrl);
            });
          }
        }
      } catch (e) {
        logger.debug('bilibili playurl 失败:', e.message);
      }
    }

    const uniq = [];
    const seen = new Set();
    videoUrls.forEach((u) => {
      if (!isHttpUrl(u)) return;
      const k = u.split('?')[0];
      if (seen.has(k)) return;
      seen.add(k);
      uniq.push(u);
    });

    if (!uniq.length && !d.pic) return null;

    return {
      title: d.title || '哔哩哔哩视频',
      author: (d.owner && d.owner.name) || '',
      authorAvatar: (d.owner && d.owner.face) || '',
      cover: d.pic || '',
      duration: Number(d.duration) || 0,
      type: 'video',
      media: uniq.slice(0, 3).map((u, i) => ({
        type: 'video',
        url: u,
        quality: i === 0 ? 'original' : 'backup'
      })),
      sourceUrl: finalUrl
    };
  },

  pickBv
};
