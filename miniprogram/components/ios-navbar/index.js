const app = getApp();

Component({
  options: {
    addGlobalClass: true
  },

  properties: {
    title: { type: String, value: '' },
    showBack: { type: Boolean, value: false },
    // 页面滚动距离（由页面传入），超过阈值标题淡入
    scrollTop: { type: Number, value: 0, observer: 'onScroll' }
  },

  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    scrolled: false
  },

  lifetimes: {
    attached() {
      const info = (app && app.globalData && app.globalData.sysInfo) || null;
      if (info) {
        this.setData({
          statusBarHeight: info.statusBarHeight,
          navBarHeight: info.navBarHeight
        });
      } else if (wx.getSystemInfoSync) {
        const sys = wx.getSystemInfoSync();
        this.setData({ statusBarHeight: sys.statusBarHeight || 20 });
      }
    }
  },

  methods: {
    onScroll(top) {
      const scrolled = top > 12;
      if (scrolled !== this.data.scrolled) {
        this.setData({ scrolled });
      }
    },

    onBack() {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack({ delta: 1 });
      } else {
        wx.switchTab({ url: '/pages/index/index' });
      }
    }
  }
});
