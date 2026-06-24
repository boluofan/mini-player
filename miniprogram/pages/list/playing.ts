import { store } from '../../stores';
import { ComponentWithStore } from 'mobx-miniprogram-bindings';
import type { Song } from '../../types';

ComponentWithStore({
  data: {
    list: [] as Song[],
  },

  storeBindings: [
    {
      store,
      fields: ['currentPlaylist', 'currentSong', 'musicName'] as const,
      actions: [] as const,
    },
  ],

  lifetimes: {
    attached() {
      this.setData({ list: store.currentPlaylist });
    },
  },

  methods: {
    handleViewTap(e: any) {
      const index = e.currentTarget.dataset.index;
      const song = store.currentPlaylist[index];
      if (song) store.player.playMusic(song);
    },
  },
});
