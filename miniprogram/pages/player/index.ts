import { ComponentWithStore } from 'mobx-miniprogram-bindings';
import { DEFAULT_COVER, store } from '../../stores';
import { GestureState, PlayOrderType } from '../../types';

const progress = wx.worklet.shared(0);

ComponentWithStore({
  data: {
    mode: 'cover' as 'cover' | 'lyric',
    statusBarHeight: 0,
    screenHeight: 0,
    orderIconMap: {
      [PlayOrderType.One]: 'danquxunhuan',
      [PlayOrderType.Rnd]: 'suijibofang',
      [PlayOrderType.All]: 'liebiaoxunhuan',
    },
    DEFAULT_COVER,
  },

  storeBindings: [
    {
      store,
      fields: [
        'did',
        'status',
        'currentDevice',
        'musicName',
        'musicCover',
        'primaryColor',
        'playOrder',
        'speed',
        'volume',
        'isFavorite',
        'hasMiot',
        'deviceGroups',
        'currentPlaylist',
        'currentSong',
      ] as const,
      actions: [] as const,
    },
  ],

  lifetimes: {
    attached() {
      const mode = wx.getStorageSync('playerMode');
      const { statusBarHeight, screenHeight } = wx.getWindowInfo();
      this.setData({ statusBarHeight, screenHeight, mode: mode || 'cover' });
      store.setData({ showAppBar: false });
      wx.setKeepScreenOn({ keepScreenOn: true });
    },
    detached() {
      store.setData({ showAppBar: true });
      wx.setKeepScreenOn({ keepScreenOn: false });
    },
  },

  methods: {
    onShareAppMessage() {
      return {
        title: store.musicName,
        imageUrl: store.musicCover,
        path: `/pages/player/index?name=${encodeURIComponent(store.musicName || '')}&src=${encodeURIComponent(store.musicUrl || '')}`,
      };
    },
    onShareTimeline() {
      return this.onShareAppMessage();
    },

    handleClose() {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack();
      } else {
        wx.reLaunch({ url: '/pages/index/index' });
      }
    },

    handleGesture(evt: any) {
      'worklet';
      if (evt.state === GestureState.ACTIVE) {
        progress.value = progress.value + evt.deltaY;
      } else if (evt.state === GestureState.END && progress.value > 50) {
        progress.value = 0;
        wx.worklet.runOnJS(this.handleClose)('Skyline');
      }
    },

    handleModeToggle() {
      const mode = this.data.mode === 'cover' ? 'lyric' : 'cover';
      this.setData({ mode });
      wx.setStorageSync('playerMode', mode);
    },

    async handlePlayToggle() {
      if (store.status !== 'paused') {
        await store.player.pauseMusic();
      } else {
        await store.player.playMusic(store.currentSong);
      }
    },

    handlePlayPrevMusic() {
      store.player.playPrevMusic();
    },
    handlePlayNextMusic() {
      store.player.playNextMusic();
    },

    async handleVolumeChange(e: any) {
      const volume = e.detail.value;
      await store.player.setVolume(volume);
      wx.showToast({ title: `音量 ${volume}`, icon: 'none' });
    },

    handleSwitchOrder() {
      let playOrder = store.playOrder;
      switch (playOrder) {
        case PlayOrderType.One:
          playOrder = PlayOrderType.Rnd;
          break;
        case PlayOrderType.Rnd:
          playOrder = PlayOrderType.All;
          break;
        default:
          playOrder = PlayOrderType.One;
      }
      store.setData({ playOrder });
    },

    handleSpeed() {
      const items = [
        { label: '0.5', value: 0.5 },
        { label: '1.0', value: 1.0 },
        { label: '1.5', value: 1.5 },
        { label: '2.0', value: 2.0 },
      ];
      wx.showActionSheet({
        alertText: '倍速播放',
        itemList: items.map((i) => i.label),
        success: (res) => {
          store.player.setSpeed(items[res.tapIndex].value);
        },
      });
    },

    handleSwitchDevice() {
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
        },
      });
    },

    handleSchedule() {
      const items = [
        { label: '10 分钟', value: 10 },
        { label: '30 分钟', value: 30 },
        { label: '60 分钟', value: 60 },
      ];
      wx.showActionSheet({
        alertText: '定时关闭',
        itemList: items.map((i) => i.label),
        success: (res) => {
          store.player.setStopAt(items[res.tapIndex].value);
        },
      });
    },

    handleToggleFavorite() {
      const song = store.currentSong;
      if (song) store.favorite.toggleFavorite(song.id);
    },

    handlePlayingList() {
      if (!store.currentPlaylist || !store.currentPlaylist.length) {
        wx.showToast({ title: '暂无播放列表', icon: 'none' });
        return;
      }
      wx.navigateTo({
        url: '/pages/list/playing',
        routeType: 'wx://bottom-sheet',
      });
    },

    handleMoreOperation() {
      const items = [
        { label: '定时关闭', value: 'schedule' },
        { label: '歌词调整', value: 'lyric' },
        { label: '模式切换', value: 'mode' },
      ];
      wx.showActionSheet({
        alertText: '更多操作',
        itemList: items.map((i) => i.label),
        success: (res) => {
          const { value } = items[res.tapIndex];
          switch (value) {
            case 'schedule':
              this.handleSchedule();
              break;
            case 'lyric':
              this.handleLyricOffset();
              break;
            case 'mode':
              this.handleModeToggle();
              break;
          }
        },
      });
    },

    handleLyricOffset() {
      wx.showModal({
        title: '歌词偏移',
        content: String(store.lyric.offset || ''),
        placeholderText: '毫秒',
        editable: true,
        success: (e) => {
          if (!e.confirm) return;
          const offset = parseInt(e.content || '0');
          if (isNaN(offset)) {
            wx.showToast({ title: '请输入数字', icon: 'none' });
            return;
          }
          store.lyric.setOffset(offset);
        },
      });
    },
  },
});
