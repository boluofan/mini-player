import { ComponentWithStore } from 'mobx-miniprogram-bindings';
import { store } from '../../stores';

ComponentWithStore({
  data: {
    serverUrl: '',
    version: '',
  },

  storeBindings: [
    {
      store,
      fields: ['did', 'hasMiot', 'version'] as const,
      actions: [] as const,
    },
  ],

  lifetimes: {
    attached() {
      store.setData({ showAppBar: false });
      const serverUrl = wx.getStorageSync('songloftServer') || '';
      this.setData({ serverUrl, version: store.version });
    },
    detached() {
      store.setData({ showAppBar: true });
    },
  },

  methods: {
    handleLogout() {
      wx.showModal({
        title: '退出登录',
        content: '确定退出当前账号？',
        success: (res) => {
          if (!res.confirm) return;
          wx.removeStorageSync('songloftAuth');
          wx.reLaunch({ url: '/pages/login/index' });
        },
      });
    },

    handleRestartServer() {
      store.initServer();
      wx.showToast({ title: '已重新初始化', icon: 'none' });
    },

    openLink(e: any) {
      const { url } = e.currentTarget.dataset;
      wx.setClipboardData({ data: url });
    },
  },
});
