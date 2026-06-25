import { makeAutoObservable, observable, reaction } from 'mobx-miniprogram';
import { DEFAULT_PRIMARY_COLOR, MusicPlayer, Store } from '..';
import { buildResourceUrl } from '@/miniprogram/utils';
import { PlayOrderType, Song } from '@/miniprogram/types';

export class HostPlayerModule implements MusicPlayer {
  store: Store;
  stopAt: number = 0;
  speed = 1;
  volume = wx.getStorageSync('hostVolume') || 80;
  currentList: Song[] = [];

  bgAudioContext?: WechatMiniprogram.BackgroundAudioManager;
  innerAudioContext?: WechatMiniprogram.InnerAudioContext;
  private _starting = false;

  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this, {
      bgAudioContext: observable.ref,
      innerAudioContext: observable.ref,
    });
    reaction(
      () => this.volume,
      (val) => wx.setStorageSync('hostVolume', val),
    );
    reaction(
      () => this.store.did,
      (did) => {
        if (did === 'host') this.syncMusic();
      },
    );
    reaction(
      () => ({
        url: this.store.musicUrl,
        name: this.store.musicName,
        album: this.store.musicAlbum,
        cover: this.store.musicCover,
        color: this.store.primaryColor,
        lyric: this.store.musicLyric,
        order: this.store.playOrder,
      }),
      (val) => {
        if (this.store.did !== 'host') return;
        wx.setStorageSync('hostMusicInfo', val);
      },
      { delay: 300 },
    );
  }

  get audioContext() {
    return this.store.feature.bgAudio
      ? this.bgAudioContext
      : this.innerAudioContext;
  }

  async syncMusic() {
    if (this.store.did !== 'host') return;
    const ctx = this.audioContext;
    const info = wx.getStorageSync('hostMusicInfo') || {};
    this.store.setData({
      musicUrl: info.url,
      musicName: info.name || '',
      musicAlbum: info.album || '',
      musicCover: info.cover,
      primaryColor: info.color || DEFAULT_PRIMARY_COLOR,
      musicLyric: info.lyric || [],
      playOrder: info.order || PlayOrderType.All,
      ...(ctx && {
        status: ctx.paused ? 'paused' : 'playing',
        duration: ctx.duration,
        currentTime: ctx.currentTime,
      }),
    });
    this.store.updateCurrentTime();
  }

  getMusic() {
    return { url: this.audioContext?.src };
  }

  playMusic = async (song?: Song) => {
    if (!song) {
      if (this.audioContext?.src) {
        this.store.setData({ status: 'playing' });
        this._starting = true;
        this.audioContext.play();
        this.store.updateCurrentTime();
      }
      return;
    }

    this.store.setData({
      status: 'loading',
      currentTime: 0,
      musicUrl: undefined,
    });

    const musicUrl = buildResourceUrl(song.url);
    if (!musicUrl) {
      wx.showToast({ title: '播放地址获取失败', icon: 'none' });
      this.pauseMusic();
      return;
    }

    this.innerAudioContext?.destroy();
    this.currentList = this.store.currentPlaylist;

    this.store.setData({
      currentSong: song,
      musicName: song.title,
      musicArtist: song.artist,
      musicAlbum: song.album,
      musicCover: song.cover_url,
      musicUrl,
      duration: song.duration,
    });

    wx.showLoading({ title: '加载中' });

    this.store.lyric.fetchLyric(song.id);

    if (this.store.feature.bgAudio) {
      const ctx = wx.getBackgroundAudioManager();
      ctx.audioType = 'music';
      ctx.title = song.title;
      ctx.singer = song.artist || song.album;
      ctx.coverImgUrl = song.cover_url || '';
      ctx.playbackRate = this.speed;
      ctx.src = musicUrl;
      this._starting = true;
      ctx.play();
      ctx.onPrev(() => this.playPrevMusic());
      ctx.onNext(() => this.playNextMusic());
      ctx.onError(() => {
        this.store.setData({ status: 'paused' });
        wx.showModal({
          title: '播放失败，是否关闭后台播放后重试',
          success: (res) => {
            if (!res.confirm) return;
            this.store.feature.setBgAudio(false);
            this.playMusic(song);
          },
        });
      });
      this.addCommonListener(ctx);
      this.bgAudioContext = ctx;
      return;
    }

    const ctx = wx.createInnerAudioContext();
    ctx.volume = this.volume / 100;
    ctx.playbackRate = this.speed;
    ctx.src = musicUrl;
    this._starting = true;
    ctx.play();
    ctx.onError(() => {
      this._starting = false;
      this.store.setData({ status: 'paused' });
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
    this.addCommonListener(ctx);
    this.innerAudioContext = ctx;
  };

  addCommonListener(
    context:
      | WechatMiniprogram.BackgroundAudioManager
      | WechatMiniprogram.InnerAudioContext,
  ) {
    context.onCanplay(() => wx.hideLoading());
    context.onPlay(() => {
      this._starting = false;
      if (this.store.did !== 'host' || this.store.status === 'playing') return;
      wx.hideLoading();
      this.store.setData({
        status: 'playing',
        duration: context.duration,
        currentTime: context.currentTime,
      });
      this.store.updateCurrentTime();
    });
    context.onPause(() => {
      if (this.store.did !== 'host') return;
      this.store.setData({ status: 'paused' });
      if (this.store.playTimer) clearTimeout(this.store.playTimer);
    });
    context.onStop(() => {
      if (this.store.did !== 'host') return;
      this.store.setData({ status: 'paused' });
      if (this.store.playTimer) clearTimeout(this.store.playTimer);
    });
    context.onTimeUpdate(() => {
      const duration = context.duration;
      if (duration !== this.store.duration) {
        this.store.setData({
          duration,
          currentTime: context.currentTime,
        });
        this.store.updateCurrentTime();
      }
    });
    context.onEnded(() => this.handleMusicEnd());
  }

  handleMusicEnd = async () => {
    if (this.stopAt && this.stopAt < Date.now()) {
      this.stopAt = 0;
      return;
    }
    if (!this.currentList.length) return;
    if (this.store.playOrder === PlayOrderType.One) {
      const song = this.store.currentSong;
      if (song) this.playMusic(song);
    } else {
      this.playNextMusic();
    }
  };

  private getCurrentIndex(): number {
    const song = this.store.currentSong;
    if (!song || !this.currentList.length) return -1;
    return this.currentList.findIndex((s) => s.id === song.id);
  }

  playPrevMusic = async () => {
    if (!this.currentList.length) {
      wx.showToast({ title: '暂无播放中的列表', icon: 'none' });
      return;
    }
    const idx = this.getCurrentIndex();
    if (idx < 0) {
      this.playMusic(this.currentList[0]);
      return;
    }
    const prev = idx === 0 ? this.currentList.length - 1 : idx - 1;
    this.playMusic(this.currentList[prev]);
  };

  playNextMusic = async () => {
    if (!this.currentList.length) {
      wx.showToast({ title: '暂无播放中的列表', icon: 'none' });
      return;
    }
    const idx = this.getCurrentIndex();
    if (idx < 0) {
      this.playMusic(this.currentList[0]);
      return;
    }
    const next = idx === this.currentList.length - 1 ? 0 : idx + 1;
    this.playMusic(this.currentList[next]);
  };

  pauseMusic = async () => {
    if (this._starting) {
      this._starting = false;
      this.innerAudioContext?.destroy();
      this.innerAudioContext = undefined;
    } else {
      this.audioContext?.pause();
    }
    this.store.setData({ status: 'paused' });
  };

  seekMusic = async (time: number) => {
    this.audioContext?.seek(time);
    this.store.setData({ currentTime: time });
    this.store.lyric.syncLyric(time);
  };

  setVolume = (volume: number) => {
    this.volume = volume;
    if (this.innerAudioContext) {
      this.innerAudioContext.volume = volume / 100;
    }
  };

  setSpeed = (speed: number) => {
    this.speed = speed;
    if (this.audioContext) {
      this.audioContext.playbackRate = speed;
    }
  };

  setStopAt = (minute: number) => {
    this.stopAt = Date.now() + minute * 60 * 1000;
  };
}
