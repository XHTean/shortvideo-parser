const api = require('../../utils/api.js');
const store = require('../../utils/storage.js');
const util = require('../../utils/util.js');
const cfg = require('../../utils/config.js');

const LOADING_TIPS = [
  '正在识别链接来源…',
  '正在请求平台资源…',
  '正在提取原始直链…',
  '快好了，稍等一下…'
];

Page({
  data: {
    input: '',
    maxLen: 500,
    focused: false,
    loading: false,
    loadingTip: LOADING_TIPS[0],
    hideNative: false,
    scrollTop: 0,
    navHeight: 64,
    canParse: false,
    recent: [],
    platforms: [
      { key: 'douyin', name: '抖音', color: '#000000' },
      { key: 'kuaishou', name: '快手', color: '#FF4906' },
      { key: 'xiaohongshu', name: '小红书', color: '#FF2442' },
      { key: 'bilibili', name: '哔哩哔哩', color: '#00A1D6' },
      { key: 'weibo', name: '微博', color: '#E6162D' },
      { key: 'xigua', name: '西瓜视频', color: '#00C4CD' },
      { key: 'generic', name: '其他网页', color: '#8E8E93' }
    ],
    modal: {
      show: false,
      title: '',
      content: '',
      confirmText: '好',
      cancelText: '取消',
      showCancel: false,
      action: ''
    }
  },

  _tipTimer: null,

  onLoad() {
    const app = getApp();
    const info = (app && app.globalData && app.globalData.sysInfo) || null;
    if (info) {
      this.setData({ navHeight: info.statusBarHeight + info.navBarHeight });
    }
    this.refreshRecent();
  },

  onShow() {
    this.refreshRecent();
  },

  onHide() {
    this.stopTips();
  },

  onUnload() {
    this.stopTips();
  },

  onPageScroll(e) {
    // 只在跨过阈值时 setData，避免每帧渲染
    const top = e.scrollTop;
    if ((this.data.scrollTop <= 12 && top > 12) || (this.data.scrollTop > 12 && top <= 12)) {
      this.setData({ scrollTop: top });
    }
  },

  /* ---------- 本地历史 ---------- */
  refreshRecent() {
    const list = store.all().slice(0, 3);
    this.setData({
      recent: list.map((it) => ({
        id: it.id,
        title: it.title,
        cover: it.cover,
        type: it.type,
        platformName: it.platformName,
        platformColor: util.platformColor(it.platform),
        timeText: util.formatTime(it.parsedAt)
      }))
    });
  },

  /* ---------- 输入 ---------- */
  onInput(e) {
    const value = e.detail.value;
    this.setData({ input: value, canParse: !!util.extractUrl(value) });
  },

  onFocus() {
    this.setData({ focused: true });
  },

  onBlur() {
    this.setData({ focused: false });
  },

  onClear() {
    this.setData({ input: '', canParse: false });
  },

  onPaste() {
    wx.getClipboardData({
      success: (res) => {
        const text = (res.data || '').trim();
        if (!text) {
          util.toast('剪贴板是空的');
          return;
        }
        const url = util.extractUrl(text);
        if (!url) {
          this.setData({ input: text, canParse: false });
          util.toast('剪贴板里没找到链接');
          return;
        }
        this.setData({ input: text, canParse: true });
        wx.vibrateShort && wx.vibrateShort({ type: 'light', fail: () => {} });
      },
      fail: () => util.toast('读不到剪贴板，手动粘贴一下吧')
    });
  },

  /* ---------- 解析 ---------- */
  onParse() {
    if (this.data.loading) return;
    if (!this.data.canParse) {
      util.toast('先粘贴一条分享链接');
      return;
    }

    this.setData({ loading: true, hideNative: true });
    this.startTips();

    api
      .parse(this.data.input)
      .then((result) => {
        this.stopTips();
        this.setData({ loading: false, hideNative: false });

        // 本地留存（只在本机）
        store.add({
          id: result.id,
          platform: result.platform,
          platformName: result.platformName,
          type: result.type,
          title: result.title,
          author: result.author,
          cover: result.cover,
          duration: result.duration,
          media: result.media,
          sourceUrl: result.sourceUrl,
          parsedAt: result.parsedAt
        });
        this.refreshRecent();

        const app = getApp();
        app.globalData.pendingMedia = result;
        app.globalData.pendingRecord = null;

        wx.vibrateShort && wx.vibrateShort({ type: 'medium', fail: () => {} });
        wx.navigateTo({ url: '/pages/preview/preview' });
      })
      .catch((err) => {
        this.stopTips();
        this.setData({ loading: false, hideNative: false });
        this.showError(err);
      });
  },

  startTips() {
    let i = 0;
    this.setData({ loadingTip: LOADING_TIPS[0] });
    this._tipTimer = setInterval(() => {
      i = (i + 1) % LOADING_TIPS.length;
      this.setData({ loadingTip: LOADING_TIPS[i] });
    }, 2200);
  },

  stopTips() {
    if (this._tipTimer) {
      clearInterval(this._tipTimer);
      this._tipTimer = null;
    }
  },

  showError(err) {
    const code = (err && err.code) || '';
    let title = '解析失败';
    let content = (err && err.message) || '这条链接没解析出内容，换个链接试试。';
    let showCancel = false;
    let action = '';

    if (code === 'NO_BACKEND') {
      title = '还差一步';
      content = '解析服务地址还没配置。在 utils/config.js 里把 API_BASE 换成你自己的服务地址就能用了。';
    } else if (code === 'RATE_LIMIT') {
      title = '慢一点';
      content = '短时间内请求有点多，过几秒再试。';
    } else if (code === 'NETWORK') {
      title = '网络异常';
      content = '连不上解析服务，检查下网络或者稍后重试。';
      showCancel = true;
      action = 'retry';
    }

    this.setData({
      modal: {
        show: true,
        title,
        content,
        confirmText: '好',
        cancelText: '重试',
        showCancel,
        action
      }
    });
  },

  onModalConfirm() {
    this.setData({ 'modal.show': false });
  },

  onModalCancel() {
    if (this.data.modal.action === 'retry') {
      this.onParse();
    }
  },

  /* ---------- 跳转 ---------- */
  openRecent(e) {
    const id = e.currentTarget.dataset.id;
    const record = store.all().find((it) => it.id === id);
    if (!record) return;
    const app = getApp();
    app.globalData.pendingRecord = record;
    app.globalData.pendingMedia = null;
    wx.navigateTo({ url: '/pages/preview/preview' });
  },

  goHistory() {
    wx.switchTab({ url: '/pages/history/history' });
  },

  onShareAppMessage() {
    return {
      title: '光影解析 —— 分享链接取回无水印原片',
      path: '/pages/index/index'
    };
  }
});
