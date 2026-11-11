/**
 * 历史记录本地存储（只存本机，不上传服务端）
 */
const cfg = require('./config.js');

const KEY = 'svp_history_v1';

function all() {
  try {
    const raw = wx.getStorageSync(KEY);
    if (!raw) return [];
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function save(list) {
  try {
    wx.setStorageSync(KEY, JSON.stringify(list.slice(0, cfg.HISTORY_LIMIT)));
  } catch (e) {
    // 存储写满等异常静默处理，不影响主流程
  }
}

/** 新增一条（同链接去重，最新的排最前） */
function add(record) {
  const list = all();
  const idx = list.findIndex((it) => it.sourceUrl === record.sourceUrl);
  if (idx > -1) list.splice(idx, 1);
  list.unshift(record);
  save(list);
  return list;
}

function removeById(id) {
  const list = all().filter((it) => it.id !== id);
  save(list);
  return list;
}

function clear() {
  try {
    wx.removeStorageSync(KEY);
  } catch (e) {}
  return [];
}

function count() {
  return all().length;
}

module.exports = { all, add, removeById, clear, count };
