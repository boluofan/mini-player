import { ComponentWithStore } from 'mobx-miniprogram-bindings';
import { store } from '../../stores';
import type { Song } from '../../types';

ComponentWithStore({
  properties: {
    id: Number,
    name: String,
    search: String,
  },

  data: {
    songs: [] as Song[],
    loading: false,
    isSearch: false,
  },

  storeBindings: [
    {
      store,
      fields: [
        'did',
        'status',
        'hasMiot',
        'deviceList',
        'deviceGroups',
      ] as const,
      actions: [] as const,
    },
  ],

  lifetimes: {
    attached() {
      const { search } = this.properties;
      if (search) {
        this.setData({ isSearch: true });
        this.searchSongs(search);
      } else {
        this.fetchSongs();
      }
    },
  },

  methods: {
    async fetchSongs() {
      const { id: playlistId } = this.properties;
      if (!playlistId) return;
      this.setData({ loading: true });
      try {
        const songs = await store.playlist.fetchSongs(playlistId);
        this.setData({ songs });
      } finally {
        this.setData({ loading: false });
      }
    },

    async searchSongs(keyword: string) {
      this.setData({ loading: true });
      try {
        const res = await store.playlist.searchSongs(keyword);
        this.setData({ songs: res });
      } finally {
        this.setData({ loading: false });
      }
    },

    handleSongTap(e: any) {
      const index = e.currentTarget.dataset.index;
      const song = this.data.songs[index];
      if (song) {
        console.log(
          '[list] handleSongTap - songs count:',
          this.data.songs.length,
        );
        store.setData({ currentPlaylist: this.data.songs });
        console.log('[list] currentPlaylist set, now playing:', song.title);
        store.player.playMusic(song);
      } else {
        console.log('[list] handleSongTap - no song found at index:', index);
      }
    },

    handleSendToDevice(e: any) {
      const index = e.currentTarget.dataset.index;
      if (!store.hasMiot || !store.deviceGroups.length) {
        wx.showToast({ title: '未检测到可用设备', icon: 'none' });
        return;
      }
      const allDevices = store.deviceList.filter(
        (d) => d.deviceID !== store.did,
      );
      wx.showActionSheet({
        alertText: '设备投放',
        itemList: allDevices.map((d) => d.name),
        success: async (res) => {
          const device = allDevices[res.tapIndex];
          const account = store.deviceGroups.find((g) =>
            g.devices.find((d) => d.deviceID === device.deviceID),
          );
          await store.switchDevice(device.deviceID, account?.account_id);
          const song = this.data.songs[index];
          if (song) await store.player.playMusic(song);
        },
      });
    },

    async handleRemoveSong(e: any) {
      const index = e.currentTarget.dataset.index;
      const song = this.data.songs[index];
      const { id: playlistId } = this.properties;
      if (!song || !playlistId) return;

      wx.showModal({
        title: '移除歌曲',
        content: `确定从歌单中移除「${song.title}」？`,
        success: async (res) => {
          if (!res.confirm) return;
          await store.playlist.removeSong(playlistId, song.id);
          const songs = [...this.data.songs];
          songs.splice(index, 1);
          this.setData({ songs });
          wx.showToast({ title: '已移除', icon: 'none' });
        },
      });
    },

    handleSongOperation(e: any) {
      const index = e.currentTarget.dataset.index;
      const items = [
        { label: '投放到', value: 'sendTo' },
        { label: '移除歌曲', value: 'remove' },
      ];
      wx.showActionSheet({
        alertText: '歌曲操作',
        itemList: items.map((i) => i.label),
        success: (res) => {
          const { value } = items[res.tapIndex];
          if (value === 'sendTo') {
            this.handleSendToDevice(e);
          } else if (value === 'remove') {
            this.handleRemoveSong(e);
          }
        },
      });
    },
  },
});
