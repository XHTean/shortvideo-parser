const store = require('../../utils/storage.js');
const util = require('../../utils/util.js');

Page({
  data: {
    list: [],
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

  // 单条左滑露出的宽度（rpx）
  SWIPE_RPX: 176,
  // rpx -> px 换算比例
  _ratio: 0.5,
  // 临时记录滑动位置，避免频繁 setData
  _xMap: {},
  // 当前展开的记录 id
  _openId: '',

  onLoad() {
    const app = getApp();
    const info = (app && app.globalData && app.globalData.sysInfo) || null;
    let screenWidth = 375;
    if (info) {
      this.setData({ navHeight: info.statusBarHeight + info.navBarHeight });
      screenWidth = info.screenWidth || 375;
    } else if (wx.getSystemInfoSync) {
      screenWidth = wx.getSystemInfoSync().screenWidth || 375;
    }
    this._ratio = screenWidth / 750;
    this._deltaPx = this.data.swipeRpx * this._ratio || this.SWIPE_RPX * this._ratio;
    this._xMap = {};
    this._openId = '';
  },

  onShow() {
    this.load();
  },

  load() {
    const raw = store.all();
    const list = raw.map((it) => ({
      id: it.id,
      title: it.title,
      cover: it.cover,
      type: it.type,
      platformName: it.platformName,
      platformColor: util.platformColor(it.platform),
      timeText: util.formatTime(it.parsedAt),
      mediaCount: (it.media || []).length,
      x: 0
    }));
    this._xMap = {};
    this._openId = '';
    this.setData({ list });
  },

  onPageScroll(e) {
    const top = e.scrollTop;
    if ((this.data.scrollTop <= 12 && top > 12) || (this.data.scrollTop > 12 && top <= 12)) {
      this.setData({ scrollTop: top });
    }
  },

  /* ---------- 左滑 ---------- */
  onMove(e) {
    const id = e.currentTarget.dataset.id;
    this._xMap[id] = e.detail.x;
  },

  onTouchEnd(e) {
    const id = e.currentTarget.dataset.id;
    const x = this._xMap[id] || 0;
    const threshold = -this._deltaPx / 2;
    const shouldOpen = x < threshold;

    const patch = {};
    // 先收起上一个展开的
    if (this._openId && this._openId !== id) {
      const prevIndex = this.data.list.findIndex((it) => it.id === this._openId);
      if (prevIndex > -1) patch[`list[${prevIndex}].x`] = 0;
    }

    const index = this.data.list.findIndex((it) => it.id === id);
    if (index > -1) {
      patch[`list[${index}].x`] = shouldOpen ? -this._deltaPx : 0;
    }

    this._openId = shouldOpen ? id : '';
    if (Object.keys(patch).length) this.setData(patch);
  },

  /* ---------- 打开 / 删除 ---------- */
  onOpen(e) {
    const id = e.currentTarget.dataset.id;
    // 有展开项时，第一次点击只收起
    if (this._openId) {
      const index = this.data.list.findIndex((it) => it.id === this._openId);
      if (index > -1) {
        this.setData({ [`list[${index}].x`]: 0 });
        this._openId = '';
        if (this._openId !== id) return;
      }
    }

    const record = store.all().find((it) => it.id === id);
    if (!record) return;
    const app = getApp();
    app.globalData.pendingRecord = record;
    app.globalData.pendingMedia = null;
    wx.navigateTo({ url: '/pages/preview/preview' });
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    store.removeById(id);
    this._openId = '';
    this.load();
    util.toast('已删除');
  },

  onClearAll() {
    this.setData({
      modal: {
        show: true,
        title: '清空全部记录？',
        content: '清空后本机的解析历史就没了，已经保存到相册的素材不受影响。',
        confirmText: '清空',
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
      this.load();
      util.toast('已清空');
    }
  },

  onModalCancel() {},

  goParse() {
    wx.switchTab({ url: '/pages/index/index' });
  }
});
