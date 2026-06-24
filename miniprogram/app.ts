import { store } from './stores';
import { hasAuth, clearAuth, saveServerUrl } from './utils';

globalThis.global = globalThis;

App<IAppOption>({
  globalData: {
    musiclist: {},
  },
  onShow() {
    store.player.syncMusic();
  },
  onLaunch() {
    if (hasAuth()) {
      store.initServer();
    } else if (wx.getStorageSync('songloftServer')) {
      store.initServer().catch(() => {
        clearAuth();
        wx.reLaunch({ url: '/pages/login/index' });
      });
    } else {
      wx.reLaunch({ url: '/pages/login/index' });
    }
  },
  onError(err) {
    console.log('error', err);
  },
  onUnhandledRejection(err) {
    console.log('rejection', err);
  },
});
