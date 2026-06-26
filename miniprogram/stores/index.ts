import { reaction, makeAutoObservable } from 'mobx-miniprogram';
import { getImageColor, request } from '../utils';
import { PlayOrderType, DeviceGroup, DeviceInfo, Song } from '../types';
import { HostPlayerModule } from './modules/host';
import { MiotPlayerModule } from './modules/miot';
import { FavoriteModule } from './modules/favorite';
import { LyricModule } from './modules/lyric';
import { FeatureModule } from './modules/feature';
import { PlaylistModule } from './modules/playlist';

const { platform } = wx.getDeviceInfo();

export const DEFAULT_COVER = '/assets/icon/changpian.svg';
export const DEFAULT_PRIMARY_COLOR = '#7e7a91';

export interface MusicPlayer {
  speed: number;
  volume: number;
  setSpeed: (speed: number) => void;
  setStopAt: (minute: number) => void;
  setVolume: (volume: number) => Promise<any> | void;
  getMusic: () => { url?: string };
  playMusic: (song?: Song, playlist?: Song[]) => Promise<void>;
  pauseMusic(): Promise<void>;
  syncMusic: () => Promise<void>;
  seekMusic: (time: number) => Promise<void>;
  playPrevMusic(): Promise<void>;
  playNextMusic(): Promise<void>;
  handleMusicEnd(): Promise<void>;
}

export class Store {
  did: string = wx.getStorageSync('did') || 'host';
  status: 'paused' | 'loading' | 'playing' = 'paused';

  primaryColor: string = DEFAULT_PRIMARY_COLOR;

  currentSong?: Song;
  currentPlaylist: Song[] = [];

  musicName?: string;
  musicCover?: string;
  musicAlbum?: string;
  musicArtist?: string;
  musicLyric: { time: number; lrc: string }[] = [];
  musicLyricCurrent: { index: number; lrc: string } = { index: 0, lrc: '' };
  musicLyricLoading = false;

  musicUrl?: string;

  duration = 0;
  currentTime = 0;
  playOrder: PlayOrderType = PlayOrderType.All;
  playTimer: number | null = null;

  showAppBar = true;
  version: string =
    import.meta.env.VITE_APP_VERSION ||
    wx.getStorageSync('serverVersion') ||
    '0.9.0';
  hasMiot = false;
  miotAccountId: string = '';

  deviceGroups: DeviceGroup[] = [];

  isPC =
    platform !== 'ohos' &&
    (platform === 'windows' ||
      platform === 'mac' ||
      !wx.getSkylineInfoSync?.().isSupported);

  lyric: LyricModule;
  feature: FeatureModule;
  favorite: FavoriteModule;
  playlist: PlaylistModule;
  hostPlayer: HostPlayerModule;
  miotPlayer: MiotPlayerModule;

  colorsMap = new Map<string, string>();

  constructor() {
    makeAutoObservable(this);

    this.lyric = new LyricModule(this);
    this.feature = new FeatureModule(this);
    this.favorite = new FavoriteModule(this);
    this.playlist = new PlaylistModule(this);
    this.hostPlayer = new HostPlayerModule(this);
    this.miotPlayer = new MiotPlayerModule(this);

    reaction(
      () => this.did,
      (val) => wx.setStorageSync('did', val),
    );
    reaction(
      () => this.musicCover,
      () => this.updateColor(),
    );
  }

  get player() {
    if (this.did === 'host' || !this.hasMiot) return this.hostPlayer;
    return this.miotPlayer;
  }

  get speed() {
    return this.player.speed;
  }

  get volume() {
    return this.player.volume;
  }

  get isFavorite() {
    return this.currentSong
      ? this.favorite.isFavorite(this.currentSong.id)
      : false;
  }

  get deviceList() {
    return (this.deviceGroups || []).reduce<DeviceInfo[]>(
      (acc, g) => acc.concat(g.devices || []),
      [],
    );
  }

  get currentDevice() {
    if (this.did === 'host') return { name: '本机', deviceID: 'host' };
    const dev = this.deviceList.find((d) => d.deviceID === this.did);
    return dev || { name: '音箱', deviceID: this.did };
  }

  setData = (values: any) => {
    Object.assign(this, values);
  };

  async updateColor() {
    const image = this.musicCover;
    const cachedColor = image && this.colorsMap.get(image);
    if (cachedColor || !image) {
      this.primaryColor = cachedColor || DEFAULT_PRIMARY_COLOR;
      return;
    }
    const color = await getImageColor(image);
    this.colorsMap.set(image, color);
    this.primaryColor = color;
  }

  initServer = async () => {
    try {
      await this.detectMiotPlugin();
      await this.playlist.fetchPlaylists();
    } catch (err) {
      console.error('initServer error', err);
    }
  };

  detectMiotPlugin = async () => {
    try {
      const res = await request<{ plugins: any[] }>({
        url: '/api/v1/jsplugins',
      });
      if (res.statusCode !== 200) return;
      const miot = res.data.plugins?.find(
        (p: any) => p.entry_path === 'miot' && p.status === 'active',
      );
      this.setData({ hasMiot: !!miot });
      if (miot) {
        await this.fetchDevices();
      }
    } catch {
      this.setData({ hasMiot: false });
    }
  };

  fetchDevices = async () => {
    if (!this.hasMiot) return;
    try {
      const res = await request<any>({
        url: '/api/v1/jsplugin/miot/mina/devices',
      });
      if (res.statusCode !== 200 || !res.data) return;
      const groups: DeviceGroup[] = Array.isArray(res.data)
        ? res.data
        : res.data.groups || res.data.data || [];
      this.setData({ deviceGroups: groups });
      const allDevices = groups.reduce<DeviceInfo[]>(
        (acc, g) => acc.concat(g.devices || []),
        [],
      );
      if (
        this.did !== 'host' &&
        !allDevices.find((d) => d.deviceID === this.did)
      ) {
        this.setData({ did: 'host' });
      }
    } catch (err) {
      console.error('fetchDevices error', err);
    }
  };

  switchDevice = async (deviceID: string, accountId?: string) => {
    this.setData({ did: deviceID });
    if (deviceID === 'host') return;
    if (this.hasMiot && accountId) {
      this.setData({ miotAccountId: accountId });
      try {
        await request({
          url: '/api/v1/jsplugin/miot/mina/last_selection',
          method: 'POST',
          data: { account_id: accountId, device_id: deviceID },
        });
      } catch {}
    }
  };

  updateCurrentTime = () => {
    if (this.playTimer) clearTimeout(this.playTimer);
    if (this.status !== 'playing') return;
    if (this.duration && this.currentTime >= this.duration) {
      this.player.handleMusicEnd();
      return;
    }
    this.setData({
      currentTime: this.currentTime + 0.1 * this.speed,
    });
    this.playTimer = setTimeout(() => this.updateCurrentTime(), 100);
  };
}

export const store = new Store();
