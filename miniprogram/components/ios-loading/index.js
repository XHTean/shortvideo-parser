Component({
  options: { addGlobalClass: true },

  properties: {
    show: { type: Boolean, value: false },
    text: { type: String, value: '处理中…' },
    subText: { type: String, value: '' }
  },

  data: {
    bars: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  },

  methods: {
    noop() {}
  }
});
