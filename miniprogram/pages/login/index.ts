import { store } from '@/miniprogram/stores';
import { saveAuth, saveServerUrl, request } from '@/miniprogram/utils';
import { ComponentWithStore } from 'mobx-miniprogram-bindings';

ComponentWithStore({
  data: {
    serverUrl: '',
    username: '',
    password: '',
    showPassword: false,
    loading: false,
    error: '',
    savedServerUrl: '',
  },
  lifetimes: {
    attached() {
      store.setData({ showAppBar: false });
      const saved = wx.getStorageSync('songloftServer') || '';
      this.setData({
        savedServerUrl: saved,
        serverUrl: saved,
        username: wx.getStorageSync('savedUsername') || '',
      });
    },
    detached() {
      store.setData({ showAppBar: true });
    },
  },
  methods: {
    async handleLogin() {
      let { serverUrl, username, password } = this.data;
      serverUrl = serverUrl.trim().replace(/\/+$/, '');

      if (!serverUrl) {
        this.setData({ error: '请输入服务器地址' });
        return;
      }
      if (!username || !password) {
        this.setData({ error: '请输入用户名和密码' });
        return;
      }

      this.setData({ loading: true, error: '' });

      try {
        const res = await new Promise<any>((resolve, reject) => {
          wx.request({
            url: `${serverUrl}/api/v1/auth/login`,
            method: 'POST',
            data: { username, password },
            header: { 'content-type': 'application/json' },
            timeout: 10000,
            success: resolve,
            fail: reject,
          });
        });

        if (res.statusCode !== 200) {
          const body = res.data as any;
          this.setData({
            error: body?.error || `登录失败 (${res.statusCode})`,
            loading: false,
          });
          return;
        }

        const data = res.data as any;
        saveAuth({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: Date.now() + (data.expires_in || 604800) * 1000,
        });
        saveServerUrl(serverUrl);
        wx.setStorageSync('savedUsername', username);

        try {
          await store.initServer();
        } catch {}

        wx.reLaunch({ url: '/pages/index/index' });
      } catch (err: any) {
        this.setData({
          error: err.errMsg || '连接失败，请检查服务器地址',
          loading: false,
        });
      }
    },

    togglePassword() {
      this.setData({ showPassword: !this.data.showPassword });
    },

    handleInput(e: any) {
      const { field } = e.currentTarget.dataset;
      this.setData({ [field]: e.detail.value, error: '' });
    },

    openLink(e: any) {
      const { url } = e.currentTarget.dataset;
      wx.setClipboardData({ data: url });
    },
  },
});
