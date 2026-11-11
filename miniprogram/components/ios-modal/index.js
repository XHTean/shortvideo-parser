Component({
  options: { addGlobalClass: true },

  properties: {
    show: { type: Boolean, value: false },
    title: { type: String, value: '' },
    content: { type: String, value: '' },
    showCancel: { type: Boolean, value: false },
    cancelText: { type: String, value: '取消' },
    confirmText: { type: String, value: '好' },
    destructive: { type: Boolean, value: false },
    // 点击遮罩是否关闭
    maskClosable: { type: Boolean, value: false }
  },

  methods: {
    onCancel() {
      this.triggerEvent('cancel');
      this.setData({ show: false });
    },
    onConfirm() {
      this.triggerEvent('confirm');
      this.setData({ show: false });
    },
    onMaskTap() {
      if (this.data.maskClosable) {
        this.triggerEvent('cancel');
        this.setData({ show: false });
      }
    },
    noop() {}
  }
});
