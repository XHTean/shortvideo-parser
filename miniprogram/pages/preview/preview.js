const util = require('../../utils/util.js');
const cfg = require('../../utils/config.js');

Page({
  data: {
    record: null,
    images: [],
    mediaIndex: 0,
    platformColor: '#8E8E93',
    durationText: '',
    saveLabel: '保存到相册',
    navHeight: 64,
    scrollTop: 0,
    busy: false,
    busyText: '正在保存',
    busySub: '',
    hideNativeMedia: false,
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

  onLoad() {
    const app = getApp();
    const info = (app && app.globalData && app.globalData.sysInfo) || null;
    if (info) {
      this.setData({ navHeight: info.statusBarHeight + info.navBarHeight });
    }

    const record = app.globalData.pendingMedia || app.globalData.pendingRecord;
    if (!record) return;

    const images = (record.media || []).filter((m) => m.type !== 'video');
    const isVideo = record.type === 'video' && (record.media || []).some((m) => m.type === 'video');

    this.setData({
      record,
      images,
      platformColor: util.platformColor(record.platform),
      durationText: util.formatDuration(record.duration),
      saveLabel: isVideo
        ? '保存视频到相册'
        : `保存全部图片到相册（${images.length || 1}）`
    });
  },

  onUnload() {
    const app = getApp();
    app.globalData.pendingMedia = null;
    app.globalData.pendingRecord = null;
  },

  onPageScroll(e) {
    const top = e.scrollTop;
    if ((this.data.scrollTop <= 12 && top > 12) || (this.data.scrollTop > 12 && top <= 12)) {
      this.setData({ scrollTop: top });
    }
  },

  onPlay() {},

  /* ============ 保存 ============ */

  /** 下载地址：默认走后端中转，绕开 CDN 域名白名单与防盗链 */
  buildDownloadUrl(url) {
    if (cfg.PROXY_DOWNLOAD === false) return url;
    const base = (getApp().getApiBase && getApp().getApiBase()) || '';
    if (!base || base.indexOf('your-api-domain') > -1) return url;
    return `${base}/api/download?u=${encodeURIComponent(url)}`;
  },

  ensureAlbumAuth() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting && res.authSetting['scope.writePhotosAlbum'] === false) {
            reject({ code: 'AUTH_DENIED' });
          } else {
            resolve();
          }
        },
        fail: () => resolve()
      });
    });
  },

  downloadAndSave(url, type) {
    return new Promise((resolve, reject) => {
      wx.downloadFile({
        url: this.buildDownloadUrl(url),
        timeout: 120000,
        success: (res) => {
          if (res.statusCode !== 200) {
            reject({ code: 'DOWNLOAD_FAIL', message: `下载失败（${res.statusCode}）` });
            return;
          }
          const filePath = res.tempFilePath;
          const saver =
            type === 'video' ? wx.saveVideoToPhotosAlbum : wx.saveImageToPhotosAlbum;
          saver({
            filePath,
            success: () => resolve(),
            fail: (err) => {
              if (err && /auth|deny|denied/i.test(err.errMsg || '')) {
                reject({ code: 'AUTH_DENIED' });
              } else {
                reject({ code: 'SAVE_FAIL', message: err.errMsg || '保存失败' });
              }
            }
          });
        },
        fail: () => reject({ code: 'DOWNLOAD_FAIL', message: '素材下载失败，检查下网络' })
      });
    });
  },

  onSaveAll() {
    const record = this.data.record;
    if (!record || this.data.busy) return;

    const videos = (record.media || []).filter((m) => m.type === 'video');
    const imgs = this.data.images;

    this.ensureAlbumAuth()
      .then(() => {
        this.setData({ busy: true, hideNativeMedia: true, busyText: '正在保存', busySub: '' });

        if (videos.length) {
          return this.downloadAndSave(videos[0].url, 'video');
        }
        return this.saveList(imgs);
      })
      .then(() => {
        this.setData({ busy: false, hideNativeMedia: false });
        wx.vibrateShort && wx.vibrateShort({ type: 'medium', fail: () => {} });
        util.toast('已保存到相册', 'success');
      })
      .catch((err) => {
        this.setData({ busy: false, hideNativeMedia: false });
        this.handleSaveError(err);
      });
  },

  /** 逐张串行保存，避免并发抢相册 */
  saveList(list) {
    if (!list || !list.length) {
      return Promise.reject({ code: 'NO_MEDIA', message: '这条记录里没有可保存的素材' });
    }
    let i = 0;
    const total = list.length;
    const next = () => {
      if (i >= total) return Promise.resolve();
      this.setData({ busySub: `${i + 1} / ${total}` });
      return this.downloadAndSave(list[i].url, 'image').then(() => {
        i += 1;
        return next();
      });
    };
    return next();
  },

  onSaveOne(e) {
    const index = Number(e.currentTarget.dataset.index);
    const item = this.data.images[index];
    if (!item || this.data.busy) return;

    this.ensureAlbumAuth()
      .then(() => {
        this.setData({ busy: true, hideNativeMedia: true, busyText: '正在保存', busySub: '' });
        return this.downloadAndSave(item.url, 'image');
      })
      .then(() => {
        this.setData({ busy: false, hideNativeMedia: false });
        util.toast('已保存到相册', 'success');
      })
      .catch((err) => {
        this.setData({ busy: false, hideNativeMedia: false });
        this.handleSaveError(err);
      });
  },

  handleSaveError(err) {
    const code = (err && err.code) || '';
    if (code === 'AUTH_DENIED') {
      this.setData({
        modal: {
          show: true,
          title: '需要相册权限',
          content: '保存素材需要「保存到相册」权限，去设置里打开就可以继续。',
          confirmText: '去设置',
          cancelText: '取消',
          showCancel: true,
          action: 'opensetting'
        }
      });
      return;
    }
    this.setData({
      modal: {
        show: true,
        title: '保存没成功',
        content: (err && err.message) || '素材下载失败，稍后重试。',
        confirmText: '好',
        cancelText: '取消',
        showCancel: false,
        action: ''
      }
    });
  },

  onModalConfirm() {
    if (this.data.modal.action === 'opensetting') {
      wx.openSetting({});
    }
  },

  onModalCancel() {},

  /* ============ 复制 ============ */

  copy(text, tip) {
    wx.setClipboardData({
      data: text,
      success: () => util.toast(tip || '已复制'),
      fail: () => util.toast('复制失败')
    });
  },

  onCopyLink() {
    const record = this.data.record;
    const first = (record.media || [])[0];
    if (!first) return util.toast('没有可复制的直链');
    this.copy(first.url, '直链已复制');
  },

  onCopyTitle() {
    const record = this.data.record;
    const text = record.author ? `${record.title} @${record.author}` : record.title;
    this.copy(text, '标题已复制');
  },

  onCopySource() {
    this.copy(this.data.record.sourceUrl, '分享链接已复制');
  },

  /* ============ 图片预览 ============ */
  previewImages(e) {
    const index = Number(e.currentTarget.dataset.index) || 0;
    const urls = this.data.images.map((m) => m.url);
    if (!urls.length) return;
    wx.previewImage({ current: urls[index], urls });
  },

  onShareAppMessage() {
    return {
      title: this.data.record ? this.data.record.title : '光影解析',
      path: '/pages/index/index'
    };
  }
});
