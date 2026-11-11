const config = require('./utils/config.js');

App({
  globalData: {
    // 系统信息，供自定义导航栏计算安全区高度
    sysInfo: null,
    // 待预览的资源（由解析页写入，预览页读取）
    pendingMedia: null,
    // 从历史页点进来的记录
    pendingRecord: null
  },

  onLaunch() {
    this.measureSystem();
  },

  /**
   * 读取系统信息，计算自定义导航栏所需的高度
   * 优先使用新版 API，旧基础库回退到 getSystemInfoSync
   */
  measureSystem() {
    const fallback = () => {
      const info = wx.getSystemInfoSync();
      const statusBarHeight = info.statusBarHeight || 20;
      const menu = wx.getMenuButtonBoundingClientRect
        ? wx.getMenuButtonBoundingClientRect()
        : null;
      const navBarHeight = menu
        ? (menu.top - statusBarHeight) * 2 + menu.height
        : 44;
      this.globalData.sysInfo = {
        statusBarHeight,
        navBarHeight,
        screenWidth: info.screenWidth,
        screenHeight: info.screenHeight,
        platform: info.platform,
        safeBottom: info.safeArea
          ? info.screenHeight - info.safeArea.bottom
          : 0
      };
    };

    if (wx.getWindowInfo && wx.getMenuButtonBoundingClientRect) {
      try {
        const win = wx.getWindowInfo();
        const menu = wx.getMenuButtonBoundingClientRect();
        const statusBarHeight = win.statusBarHeight || 20;
        const navBarHeight = (menu.top - statusBarHeight) * 2 + menu.height;
        this.globalData.sysInfo = {
          statusBarHeight,
          navBarHeight,
          screenWidth: win.screenWidth,
          screenHeight: win.windowHeight,
          platform: win.platform,
          safeBottom: Math.max(0, win.screenHeight - (win.safeArea ? win.safeArea.bottom : win.screenHeight))
        };
        return;
      } catch (e) {
        // 落到旧接口
      }
    }
    fallback();
  },

  /**
   * 解析服务地址（放在这里方便全局替换）
   */
  getApiBase() {
    return config.API_BASE;
  }
});
