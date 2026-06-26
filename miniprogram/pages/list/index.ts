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
    keyword: '',
    offset: 0,
    limit: 50,
    hasMore: true,
    loadingMore: false,
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
      const { id, search } = this.properties;
      if (id) {
        this.fetchSongs();
      } else {
        this.setData({ isSearch: true, keyword: search });
        this.searchSongs(search);
      }
    },
  },

  methods: {
    async fetchSongs() {
      const { id: playlistId } = this.properties;
      if (!playlistId) return;
      this.setData({ loading: true, offset: 0, songs: [] });
      try {
        const limit = this.data.limit;
        const songs = await store.playlist.fetchSongs(playlistId, 0, limit);
        this.setData({ songs, hasMore: songs.length >= limit });
      } finally {
        this.setData({ loading: false });
      }
    },

    async searchSongs(keyword: string) {
      this.setData({ loading: true, offset: 0, songs: [] });
      try {
        const limit = keyword ? 100 : 1000;
        const songs = await store.playlist.searchSongs(keyword, 0, limit);
        this.setData({ songs, hasMore: !!keyword && songs.length >= limit });
      } finally {
        this.setData({ loading: false });
      }
    },

    async loadMore() {
      if (!this.data.hasMore || this.data.loadingMore || this.data.loading)
        return;
      const { offset, limit, keyword, isSearch } = this.data;
      this.setData({ loadingMore: true });
      try {
        let newSongs: Song[];
        if (isSearch) {
          const newOffset = offset + 100;
          newSongs = await store.playlist.searchSongs(keyword, newOffset, 100);
        } else {
          const newOffset = offset + limit;
          newSongs = await store.playlist.fetchSongs(
            this.properties.id!,
            newOffset,
            limit,
          );
        }
        this.setData({
          songs: [...this.data.songs, ...newSongs],
          offset: isSearch ? offset + 100 : offset + limit,
          hasMore: newSongs.length >= (isSearch ? 100 : limit),
        });
      } finally {
        this.setData({ loadingMore: false });
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
