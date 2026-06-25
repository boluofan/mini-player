import { makeAutoObservable, reaction } from 'mobx-miniprogram';
import { MusicPlayer, Store } from '..';
import { request, buildResourceUrl, sleep } from '@/miniprogram/utils';
import { Song, PlayerStatus } from '@/miniprogram/types';

export class MiotPlayerModule implements MusicPlayer {
  store: Store;
  speed = 1;
  volume = 20;
  stopAt = 0;
  pollTimer: number | null = null;
  lastSyncTime = 0;
  lastSyncPosition = 0;

  constructor(store: Store) {
    makeAutoObservable(this);
    this.store = store;

    reaction(
      () => ({ did: this.store.did, hasMiot: this.store.hasMiot }),
      ({ did, hasMiot }) => {
        this.stopPolling();
        if (did !== 'host' && hasMiot) {
          this.syncMusic();
          this.startPolling();
        }
      },
    );
  }

  getMusic() {
    return {};
  }

  playMusic = async (song?: Song, playlist?: Song[]) => {
    if (!song) return;

    const { miotAccountId } = this.store;
    if (!miotAccountId || !this.store.did) return;

    if (playlist && playlist.length > 0) {
      const playlistId = this.store.musicAlbum
        ? this.store.playlist.getPlaylistIdByName(this.store.musicAlbum)
        : 0;

      this.store.setData({ currentPlaylist: playlist });

      if (playlistId) {
        await request({
          url: '/api/v1/jsplugin/miot/player/play',
          method: 'POST',
          data: {
            account_id: miotAccountId,
            device_id: this.store.did,
            playlist_id: playlistId,
            start_index: playlist.findIndex((s) => s.id === song.id),
            play_mode: this.mapPlayOrder(),
          },
        });
      } else {
        const url = buildResourceUrl(song.url);
        if (url) {
          await request({
            url: '/api/v1/jsplugin/miot/mina/play-url',
            method: 'POST',
            data: {
              account_id: miotAccountId,
              device_id: this.store.did,
              url,
            },
          });
        }
      }
    } else {
      const url = buildResourceUrl(song.url);
      if (!url) return;
      await request({
        url: '/api/v1/jsplugin/miot/mina/play-url',
        method: 'POST',
        data: {
          account_id: miotAccountId,
          device_id: this.store.did,
          url,
        },
      });
    }

    this.store.setData({
      musicName: song.title,
      musicAlbum: song.album,
      musicCover: song.cover_url,
      status: 'playing',
      currentSong: song,
      duration: song.duration,
    });

    this.store.lyric.fetchLyric(song.id);
  };

  private mapPlayOrder(): string {
    const map: Record<number, string> = {
      0: 'single',
      1: 'loop',
      2: 'random',
    };
    return map[this.store.playOrder] || 'loop';
  }

  handleMusicEnd = async () => {
    await this.syncMusic();
  };

  playPrevMusic = async () => {
    this.store.setData({
      status: 'loading',
      currentTime: 0,
      musicLyric: [],
      musicLyricLoading: true,
    });
    try {
      await request({
        url: '/api/v1/jsplugin/miot/player/previous',
        method: 'POST',
        data: {
          account_id: this.store.miotAccountId,
          device_id: this.store.did,
        },
      });
    } catch {}
    await sleep(500);
    this.syncMusic();
  };

  playNextMusic = async () => {
    this.store.setData({
      status: 'loading',
      currentTime: 0,
      musicLyric: [],
      musicLyricLoading: true,
    });
    try {
      await request({
        url: '/api/v1/jsplugin/miot/player/next',
        method: 'POST',
        data: {
          account_id: this.store.miotAccountId,
          device_id: this.store.did,
        },
      });
    } catch {}
    await sleep(500);
    this.syncMusic();
  };

  pauseMusic = async () => {
    try {
      await request({
        url: '/api/v1/jsplugin/miot/mina/pause',
        method: 'POST',
        data: {
          account_id: this.store.miotAccountId,
          device_id: this.store.did,
        },
      });
    } catch {}
    this.store.setData({ status: 'paused' });
  };

  seekMusic = async () => {};

  syncMusic = async () => {
    if (this.store.did === 'host' || !this.store.hasMiot) return;
    this.lastSyncTime = Date.now();

    try {
      const res = await request<PlayerStatus>({
        url: '/api/v1/jsplugin/miot/player/status',
        data: {
          account_id: this.store.miotAccountId,
          device_id: this.store.did,
        },
      });

      if (this.store.did === 'host') return;

      const status = res.data;
      const song = status.current_song;

      this.lastSyncPosition = status.position;
      this.lastSyncTime = Date.now();

      this.store.setData({
        status: status.is_playing ? 'playing' : 'paused',
        musicName: song?.title || this.store.musicName,
        musicAlbum: this.store.musicAlbum,
        musicCover: song?.cover_url || this.store.musicCover,
        duration: status.duration || this.store.duration,
        currentTime: status.position,
      });
      if (status.volume >= 0) {
        this.volume = status.volume;
      }

      if (song?.lyric_url && song.id !== this.store.currentSong?.id) {
        this.store.lyric.fetchLyric(song.id);
      }

      this.store.updateCurrentTime();
    } catch (err) {
      console.error('syncMusic error', err);
    }
  };

  private startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(() => this.syncMusic(), 5000);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  setVolume = async (volume: number) => {
    this.volume = volume;
    try {
      await request({
        url: '/api/v1/jsplugin/miot/mina/volume',
        method: 'POST',
        data: {
          account_id: this.store.miotAccountId,
          device_id: this.store.did,
          volume,
        },
      });
    } catch {}
  };

  setSpeed() {}

  setStopAt(minute: number) {
    this.stopAt = Date.now() + minute * 60 * 1000;
  }
}
