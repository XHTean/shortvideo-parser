/**
 * 解析服务接口封装
 *
 * 后端约定：
 *   POST {API_BASE}/api/parse
 *   body: { "url": "分享链接或含链接的分享文案" }
 *   200 : { "code": 0, "data": { ...MediaResult } }
 *   非0 : { "code": 1xxx, "message": "人话错误信息" }
 *
 * MediaResult:
 * {
 *   id, platform, platformName, type: 'video' | 'image',
 *   title, author, cover, duration,
 *   media: [ { type:'video'|'image', url, quality } ],
 *   sourceUrl, parsedAt
 * }
 */
const util = require('./util.js');
const cfg = require('./config.js');

function isConfigured() {
  const base = (cfg && cfg.API_BASE) || '';
  return !!base && base.indexOf('your-api-domain') === -1;
}

/**
 * 调用后端解析
 * @returns {Promise<Object>} MediaResult
 */
async function parse(rawText) {
  const url = util.extractUrl(rawText);
  if (!url) {
    const err = new Error('没有识别到链接，检查一下是不是复制漏了');
    err.code = 'NO_URL';
    throw err;
  }
  if (url.length > cfg.MAX_URL_LENGTH) {
    const err = new Error('链接太长了，只支持常规分享链接');
    err.code = 'TOO_LONG';
    throw err;
  }
  if (!isConfigured()) {
    const err = new Error('还没配置解析服务地址，先在 utils/config.js 里填上你的后端域名');
    err.code = 'NO_BACKEND';
    throw err;
  }

  let res;
  try {
    res = await util.request(
      { path: '/api/parse', method: 'POST', data: { url } },
      cfg.RETRY_TIMES
    );
  } catch (e) {
    const err = new Error('网络不太顺，检查下网络后重试');
    err.code = 'NETWORK';
    throw err;
  }

  if (res.statusCode === 429) {
    const err = new Error('请求有点频繁，缓几秒再试');
    err.code = 'RATE_LIMIT';
    throw err;
  }
  if (res.statusCode < 200 || res.statusCode >= 300) {
    const err = new Error(
      (res.data && res.data.message) || `解析服务返回异常（${res.statusCode}）`
    );
    err.code = 'HTTP_' + res.statusCode;
    throw err;
  }

  const body = res.data || {};
  if (body.code !== 0 || !body.data) {
    const err = new Error(body.message || '这条链接没解析出内容');
    err.code = body.code || 'PARSE_FAIL';
    throw err;
  }

  const data = body.data;
  return {
    id: util.uid(),
    platform: data.platform || 'generic',
    platformName: util.platformLabel(data.platform),
    type: data.type === 'image' ? 'image' : 'video',
    title: data.title || '未命名素材',
    author: data.author || '',
    authorAvatar: data.authorAvatar || '',
    cover: data.cover || '',
    duration: data.duration || 0,
    media: Array.isArray(data.media) ? data.media : [],
    sourceUrl: data.sourceUrl || url,
    parsedAt: Date.now()
  };
}

/** 健康检查，用于「关于」页显示服务状态 */
async function health() {
  if (!isConfigured()) return { online: false, reason: '未配置' };
  try {
    const res = await util.request({ path: '/api/health', method: 'GET' }, 0);
    if (res.statusCode === 200 && res.data && res.data.code === 0) {
      return { online: true, version: (res.data.data && res.data.data.version) || '' };
    }
    return { online: false, reason: `HTTP ${res.statusCode}` };
  } catch (e) {
    return { online: false, reason: '连不上' };
  }
}

module.exports = { parse, health, isConfigured };
