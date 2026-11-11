'use strict';

/**
 * 通用媒体提取器
 * 从 HTML / 内嵌 JSON 里把视频、图片地址挖出来。
 * 平台专用解析器失效时，这一层是兜底。
 */

const {
  resolveUrl,
  looksLikeMedia,
  isVideoUrl,
  isImageUrl,
  cleanMediaUrl,
  isHttpUrl
} = require('./../utils/url.js');

const ENTITY = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&mdash;': '—',
  '&hellip;': '…'
};

function decodeEntities(s) {
  if (!s) return '';
  return String(s)
    .replace(/&[a-z]+;|&#\d+;/gi, (m) => {
      if (ENTITY[m]) return ENTITY[m];
      const code = m.match(/^&#(\d+);$/);
      if (code) return String.fromCharCode(Number(code[1]));
      return m;
    })
    .trim();
}

/** 处理 JSON 字符串里的转义：\/ \u002F 等 */
function unescapeUrl(s) {
  if (!s) return '';
  return String(s)
    .replace(/\\u002F/gi, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/\\\//g, '/')
    .replace(/\\n/g, '')
    .trim();
}

/** 取 meta 标签内容 */
function meta(html, names) {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name|itemprop)=["']${name}["'][^>]*>`,
      'i'
    );
    const tag = html.match(re);
    if (tag) {
      const c = tag[0].match(/content=["']([^"']*)["']/i);
      if (c && c[1]) return decodeEntities(unescapeUrl(c[1]));
    }
    // content 写在属性前面的情况
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name|itemprop)=["']${name}["'][^>]*>`,
      'i'
    );
    const tag2 = html.match(re2);
    if (tag2 && tag2[1]) return decodeEntities(unescapeUrl(tag2[1]));
  }
  return '';
}

/** <title> */
function pageTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1]).replace(/\s+/g, ' ') : '';
}

/** JSON-LD */
function jsonLd(html) {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const data = JSON.parse(m[1].trim());
      out.push(data);
    } catch (e) {
      /* 忽略坏 JSON */
    }
  }
  return out;
}

/** 深度找某个 key 的所有值（支持 a.b.c 路径） */
function deepFindAll(obj, path, limit = 200) {
  const keys = String(path).split('.');
  const found = [];

  function walk(node, depth) {
    if (found.length >= limit || node === null || node === undefined) return;
    if (Array.isArray(node)) {
      node.forEach((it) => walk(it, depth));
      return;
    }
    if (typeof node !== 'object') return;

    const k = keys[depth];
    if (Object.prototype.hasOwnProperty.call(node, k)) {
      const v = node[k];
      if (depth === keys.length - 1) {
        found.push(v);
      } else {
        walk(v, depth + 1);
      }
    }
    // 继续往下找
    Object.keys(node).forEach((key) => {
      const v = node[key];
      if (v && typeof v === 'object') walk(v, depth);
    });
  }

  walk(obj, 0);
  return found;
}

/** 从任意结构里收集字符串数组（url_list 这种） */
function flattenStrings(v, out = []) {
  if (!v) return out;
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => flattenStrings(x, out));
  else if (typeof v === 'object') {
    Object.keys(v).forEach((k) => {
      if (/url|uri|src/i.test(k)) flattenStrings(v[k], out);
    });
  }
  return out;
}

/** 扫描整段文本里的媒体直链 */
function scanMedia(html) {
  const text = unescapeUrl(html);
  const videos = new Set();
  const images = new Set();

  const re =
    /https?:\/\/[^\s"'\\<>()\[\]{}，。；、]+?(?:\.(?:mp4|m3u8|mov|m4v|flv|webm|jpg|jpeg|png|webp)|(?:imageview|x-oss-process|\.jpeg))[^\s"'\\<>()\[\]{}，。；、]*/gi;

  let m;
  let guard = 0;
  while ((m = re.exec(text)) && guard < 4000) {
    guard += 1;
    const u = m[0].replace(/[",')\]}]+$/g, '');
    if (!isHttpUrl(u) || !looksLikeMedia(u)) continue;
    if (isVideoUrl(u)) videos.add(u);
    else if (isImageUrl(u)) images.add(u);
  }

  // <video src="..."> / <source src="...">
  const srcRe = /<(?:video|source)[^>]+src=["']([^"']+)["']/gi;
  while ((m = srcRe.exec(text))) {
    const u = unescapeUrl(m[1]);
    if (isHttpUrl(u) && looksLikeMedia(u)) {
      if (isVideoUrl(u)) videos.add(u);
      else images.add(u);
    }
  }

  return {
    videos: Array.from(videos),
    images: Array.from(images)
  };
}

/** 从内嵌 JSON 里挖视频（抖音/快手/小红书那套字段名） */
function extractFromEmbeddedJson(jsonText) {
  const result = { videos: [], images: [], title: '', author: '', cover: '', duration: 0 };
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch (e) {
    return result;
  }

  // 标题
  ['desc', 'title', 'caption', 'content', 'noteTitle', 'aweme_desc'].forEach((k) => {
    if (result.title) return;
    const v = deepFindAll(data, k, 3).find((x) => typeof x === 'string' && x.trim());
    if (v) result.title = v.trim();
  });

  // 作者
  ['nickname', 'author.nickname', 'user.nickname', 'name', 'authorName'].forEach((k) => {
    if (result.author) return;
    const v = deepFindAll(data, k, 3).find((x) => typeof x === 'string' && x.trim());
    if (v) result.author = v.trim();
  });

  // 时长
  ['duration', 'video.duration', 'video_duration'].forEach((k) => {
    if (result.duration) return;
    const v = deepFindAll(data, k, 3).find((x) => Number(x) > 0);
    if (v) result.duration = Number(v);
  });

  // 封面
  [
    'cover',
    'coverUrl',
    'cover_url',
    'origin_cover',
    'originCover',
    'dynamic_cover',
    'thumbnail',
    'image',
    'poster'
  ].forEach((k) => {
    if (result.cover) return;
    const v = deepFindAll(data, k, 4);
    const urls = [];
    v.forEach((x) => flattenStrings(x, urls));
    const hit = urls.find((u) => isHttpUrl(u) && looksLikeMedia(u));
    if (hit) result.cover = cleanMediaUrl(hit);
  });

  // 视频
  [
    'play_addr',
    'playAddr',
    'playApi',
    'video.play_addr',
    'video.playAddr',
    'srcNoMark',
    'src_no_mark',
    'video.src',
    'videoUrl',
    'video_url',
    'mainMvUrls',
    'photoUrl',
    'contentUrl'
  ].forEach((k) => {
    deepFindAll(data, k, 6).forEach((x) => {
      const urls = [];
      flattenStrings(x, urls);
      urls.forEach((u) => {
        if (isHttpUrl(u) && looksLikeMedia(u)) {
          if (isVideoUrl(u) || /video|play|aweme|stream|m3u8/i.test(u)) {
            result.videos.push(cleanMediaUrl(u));
          }
        }
      });
    });
  });

  // 图片
  [
    'image_list',
    'imageList',
    'images',
    'url_list',
    'urlList',
    'displayUrl',
    'originUrl',
    'infoList',
    'note_card.image_list'
  ].forEach((k) => {
    deepFindAll(data, k, 6).forEach((x) => {
      const urls = [];
      flattenStrings(x, urls);
      urls.forEach((u) => {
        if (isHttpUrl(u) && looksLikeMedia(u) && (isImageUrl(u) || /imageview|oss/i.test(u))) {
          result.images.push(u);
        }
      });
    });
  });

  result.videos = dedupe(result.videos);
  result.images = dedupe(result.images);
  return result;
}

function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const u of list) {
    const key = String(u).split('?')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out;
}

/** 平台报错页 / 404 页识别 */
const ERROR_TITLE_RE =
  /(出错啦|页面不见了|页面不存在|内容不存在|内容已删除|笔记不存在|视频不存在|访问异常|安全验证|请稍后再试|无权访问|资源不存在|Not Found|Error\s*\|)/i;

function looksLikeErrorPage(html) {
  if (!html) return true;
  const t = pageTitle(html) || '';
  const og = meta(html, ['og:title', 'twitter:title']) || '';
  if (ERROR_TITLE_RE.test(`${t} | ${og}`)) return true;
  if (html.length < 8000 && /(412 Precondition|403 Forbidden|页面不存在|出错啦)/i.test(html.slice(0, 5000))) {
    return true;
  }
  return false;
}

/** 从 HTML 里抽出所有可能的内嵌 JSON 块 */
function embeddedJsonBlocks(html) {
  const blocks = [];
  const markers = [
    'window._ROUTER_DATA',
    'window.__INITIAL_STATE__',
    'window.__APOLLO_STATE__',
    'window._SSR_DATA',
    'window.__NUXT__',
    'window.__PRELOADED_STATE__',
    'window.__data',
    'RENDER_DATA'
  ];

  markers.forEach((mk) => {
    let from = 0;
    while (true) {
      const i = html.indexOf(mk, from);
      if (i < 0) break;
      from = i + mk.length;
      const s = html.indexOf('{', i);
      if (s < 0 || s - i > 40) continue;
      const end = matchBrace(html, s);
      if (end > s) {
        blocks.push({ source: mk, raw: html.slice(s, end + 1) });
      }
    }
  });

  // __NEXT_DATA__
  const nextRe = /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = nextRe.exec(html))) blocks.push({ source: '__NEXT_DATA__', raw: m[1] });

  return blocks;
}

/** 花括号配对，返回结束位置 */
function matchBrace(str, start) {
  let depth = 0;
  let inStr = false;
  let quote = '';
  for (let i = start; i < str.length; i += 1) {
    const c = str[i];
    if (inStr) {
      if (c === '\\') {
        i += 1;
      } else if (c === quote) {
        inStr = false;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = true;
      quote = c;
    } else if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * 通用提取主入口
 * @returns {{title,author,cover,duration,type,media,videos,images}}
 */
function extract(html, baseUrl, options) {
  const out = {
    title: '',
    author: '',
    cover: '',
    duration: 0,
    type: 'video',
    media: [],
    videos: [],
    images: []
  };

  if (!html || typeof html !== 'string') return out;

  // 平台报错页 / 404 页里也有一堆静态图，别当成用户素材
  if (!(options && options.allowErrorPage) && looksLikeErrorPage(html)) {
    return out;
  }

  // 1) meta
  out.title =
    meta(html, ['og:title', 'twitter:title', 'title']) || pageTitle(html) || '';
  out.cover = meta(html, [
    'og:image',
    'og:image:secure_url',
    'twitter:image',
    'twitter:image:src'
  ]);
  out.author = meta(html, ['og:site_name', 'author', 'article:author']);

  const metaVideos = [
    'og:video',
    'og:video:url',
    'og:video:secure_url',
    'twitter:player:stream',
    'og:video:iframe'
  ]
    .map((n) => meta(html, [n]))
    .filter((u) => isHttpUrl(u) && /\.(mp4|m3u8|mov)/i.test(u));

  const metaImages = ['og:image', 'og:image:secure_url', 'twitter:image']
    .map((n) => meta(html, [n]))
    .filter((u) => isHttpUrl(u));

  // 2) JSON-LD
  let ldDuration = 0;
  jsonLd(html).forEach((block) => {
    const list = Array.isArray(block) ? block : [block];
    list.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      if (!out.title && item.name) out.title = String(item.name);
      if (!out.author && item.author) {
        out.author = String(
          typeof item.author === 'string' ? item.author : item.author.name || ''
        );
      }
      if (!out.cover && item.thumbnailUrl) out.cover = String(item.thumbnailUrl);
      if (item.contentUrl && isHttpUrl(item.contentUrl)) {
        out.videos.push(cleanMediaUrl(String(item.contentUrl)));
      }
      if (item.duration) {
        const m = String(item.duration).match(/^PT(?:(\d+)M)?(?:(\d+)S)?$/i);
        if (m) ldDuration = (Number(m[1]) || 0) * 60 + (Number(m[2]) || 0);
        else if (Number(item.duration) > 0) ldDuration = Number(item.duration);
      }
    });
  });
  if (ldDuration) out.duration = ldDuration;

  // 3) 内嵌 JSON
  embeddedJsonBlocks(html).forEach((b) => {
    const r = extractFromEmbeddedJson(b.raw);
    if (!out.title && r.title) out.title = r.title;
    if (!out.author && r.author) out.author = r.author;
    if (!out.cover && r.cover) out.cover = r.cover;
    if (!out.duration && r.duration) out.duration = r.duration;
    out.videos.push(...r.videos);
    out.images.push(...r.images);
  });

  // 4) 全页扫描
  const scanned = scanMedia(html);
  out.videos.push(...scanned.videos);
  out.images.push(...scanned.images);

  metaVideos.forEach((u) => out.videos.push(cleanMediaUrl(u)));
  metaImages.forEach((u) => {
    if (!out.cover) out.cover = u;
  });

  out.videos = dedupe(out.videos).slice(0, 20);
  out.images = dedupe(out.images).slice(0, 40);

  out.title = (out.title || '').replace(/\s*-\s*(抖音|快手|小红书|哔哩哔哩|微博).*$/, '').trim();

  if (baseUrl) {
    out.cover = out.cover ? resolveUrl(baseUrl, out.cover) : '';
  }

  // 组装 media
  if (out.videos.length) {
    out.type = 'video';
    out.media = out.videos.slice(0, 3).map((u, i) => ({
      type: 'video',
      url: u,
      quality: i === 0 ? 'original' : 'backup'
    }));
  } else if (out.images.length) {
    out.type = 'image';
    out.media = out.images.map((u) => ({ type: 'image', url: u }));
  }

  return out;
}

module.exports = {
  extract,
  meta,
  pageTitle,
  jsonLd,
  deepFindAll,
  flattenStrings,
  scanMedia,
  embeddedJsonBlocks,
  matchBrace,
  unescapeUrl,
  decodeEntities,
  looksLikeErrorPage
};
