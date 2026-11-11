const api = require('../../utils/api.js');
const store = require('../../utils/storage.js');
const util = require('../../utils/util.js');
const cfg = require('../../utils/config.js');

Page({
  data: {
    version: cfg.VERSION,
    disclaimer: cfg.DISCLAIMER,
    apiBase: cfg.API_BASE,
    historyCount: 0,
    status: { online: false },
    navHeight: 64,
    scrollTop: 0,
    modal: {
      show: false,
      title: '',
      content: '',
      confirmText: '好',
      cancelText: '取消',
      showCancel: false,
      destructive: false,
      action: ''
    }
  },

  onLoad() {
    const app = getApp();
    const info = (app && app.globalData && app.globalData.sysInfo) || null;
    if (info) {
      this.setData({ navHeight: info.statusBarHeight + info.navBarHeight });
    }
  },

  onShow() {
    this.setData({ historyCount: store.count() });
    this.checkStatus();
  },

  onPageScroll(e) {
    const top = e.scrollTop;
    if ((this.data.scrollTop <= 12 && top > 12) || (this.data.scrollTop > 12 && top <= 12)) {
      this.setData({ scrollTop: top });
    }
  },

  checkStatus() {
    api.health().then((res) => {
      this.setData({ status: res });
    });
  },

  onCopyBase() {
    wx.setClipboardData({
      data: this.data.apiBase,
      success: () => util.toast('服务地址已复制'),
      fail: () => util.toast('复制失败')
    });
  },

  onClearLocal() {
    this.setData({
      modal: {
        show: true,
        title: '清除本机全部记录？',
        content: '会删掉解析历史。已经保存到手机相册的素材不受影响。',
        confirmText: '清除',
        cancelText: '取消',
        showCancel: true,
        destructive: true,
        action: 'clear'
      }
    });
  },

  onModalConfirm() {
    if (this.data.modal.action === 'clear') {
      store.clear();
      this.setData({ historyCount: 0 });
      util.toast('已清除');
    }
  },

  onModalCancel() {},

  onShareAppMessage() {
    return { title: '光影解析 —— 短视频素材解析工具', path: '/pages/index/index' };
  }
});
