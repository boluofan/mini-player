import { store } from '@/miniprogram/stores';
import { request } from '@/miniprogram/utils';
import { ComponentWithStore } from 'mobx-miniprogram-bindings';

ComponentWithStore({
  data: {
    connected: true,
    error: '',
    filterValue: '',
    musics: [] as any[],
    pageSize: 25,
  },
  storeBindings: [
    {
      store,
      fields: ['isPC', 'status', 'hasMiot', 'deviceGroups', 'did'] as const,
      actions: [] as const,
    },
    {
      store: store.playlist,
      fields: ['playlists', 'normalPlaylists'] as const,
      actions: ['createPlaylist'] as const,
    },
  ],
  lifetimes: {
    attached() {
      if (!store.playlist.playlists.length) {
        store.playlist.fetchPlaylists();
      }
    },
  },
  methods: {
    onShareAppMessage() {
      return { title: '菠萝倾听' };
    },
    onShareTimeline() {
      return { title: '菠萝倾听' };
    },

    handlePlaylistTap(e: any) {
      const { id, name } = e.currentTarget.dataset;
      wx.navigateTo({
        url: `/pages/list/index?id=${id}&name=${encodeURIComponent(name)}`,
      });
    },

    handleAllSongs() {
      wx.navigateTo({ url: '/pages/list/index?search=' });
    },

    handleSearch(e: any) {
      const keyword = e.detail.value || '';
      wx.navigateTo({
        url: `/pages/list/index?search=${encodeURIComponent(keyword)}`,
      });
    },

    handleDeviceSelect(e: any) {
      const { deviceid, accountid } = e.currentTarget.dataset;
      if (deviceid === store.did) return;
      store.switchDevice(deviceid, accountid);
    },

    async handleRefresh() {
      try {
        await store.playlist.fetchPlaylists();
        if (store.hasMiot) await store.fetchDevices();
        wx.showToast({ title: '刷新成功', icon: 'none' });
      } catch {}
    },

    navigateToSetting() {
      wx.navigateTo({ url: '/pages/setting/index' });
    },
  },
});
