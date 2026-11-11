/**
 * 通用工具函数
 */

/** 从任意文本里抓出第一个 http(s) 链接（分享文案通常是「标题 + 链接」混排） */
function extractUrl(text) {
  if (!text) return '';
  const matched = String(text).match(/https?:\/\/[^\s"'<>）)】\]]+/i);
  if (!matched) return '';
  // 去掉中文标点尾巴
  return matched[0].replace(/[，。；！？、,.;!?)）】\]"'<>]+$/, '');
}

/** 平台展示名 */
const PLATFORM_LABEL = {
  douyin: '抖音',
  kuaishou: '快手',
  xiaohongshu: '小红书',
  bilibili: '哔哩哔哩',
  weibo: '微博',
  xigua: '西瓜视频',
  pipixia: '皮皮虾',
  weishi: '微视',
  generic: '其他'
};

/** 平台主色（用于结果卡片的小徽章） */
const PLATFORM_COLOR = {
  douyin: '#000000',
  kuaishou: '#FF4906',
  xiaohongshu: '#FF2442',
  bilibili: '#00A1D6',
  weibo: '#E6162D',
  xigua: '#00C4CD',
  pipixia: '#FF6B00',
  weishi: '#FDB800',
  generic: '#8E8E93'
};

function platformLabel(key) {
  return PLATFORM_LABEL[key] || '其他';
}

function platformColor(key) {
  return PLATFORM_COLOR[key] || '#8E8E93';
}

/** 秒 -> mm:ss */
function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  if (!s) return '';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}

/** 时间戳 -> 友好时间 */
function formatTime(ts) {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} 小时前`;
  const d = new Date(ts);
  const today = new Date();
  const sameYear = d.getFullYear() === today.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, '0');
  const dd = `${d.getDate()}`.padStart(2, '0');
  const hh = `${d.getHours()}`.padStart(2, '0');
  const mi = `${d.getMinutes()}`.padStart(2, '0');
  return sameYear ? `${mm}-${dd} ${hh}:${mi}` : `${d.getFullYear()}-${mm}-${dd}`;
}

/** 文件大小展示 */
function formatSize(bytes) {
  const n = Number(bytes);
  if (!n || n < 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** 轻提示 */
function toast(title, icon = 'none') {
  wx.showToast({ title, icon, duration: 1800 });
}

/** 生成唯一 id */
function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** 带重试的请求封装 */
function request(options, retry = 0) {
  const app = getApp();
  const base = (app && app.getApiBase && app.getApiBase()) || '';
  const cfg = require('./config.js');

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${base}${options.path}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: Object.assign(
        { 'content-type': 'application/json' },
        options.header || {}
      ),
      timeout: cfg.REQUEST_TIMEOUT,
      success: (res) => resolve(res),
      fail: (err) => {
        if (retry > 0) {
          setTimeout(() => {
            request(options, retry - 1).then(resolve).catch(reject);
          }, 600);
        } else {
          reject(err);
        }
      }
    });
  });
}

module.exports = {
  extractUrl,
  platformLabel,
  platformColor,
  formatDuration,
  formatTime,
  formatSize,
  toast,
  uid,
  request
};
