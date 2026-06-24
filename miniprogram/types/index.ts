export enum GestureState {
  START = 0,
  ACTIVE = 1,
  END = 2,
  CANCELLED = 3,
}

export enum PlayOrderType {
  One = 0,
  All = 1,
  Rnd = 2,
}

export interface Song {
  id: number;
  type: 'local' | 'remote' | 'radio';
  title: string;
  artist: string;
  album: string;
  duration: number;
  url: string;
  cover_url: string;
  lyric_url: string;
  format: string;
  file_size: number;
}

export interface Playlist {
  id: number;
  type: 'normal' | 'radio';
  name: string;
  description: string;
  cover_url: string;
  song_count: number;
  labels: string[];
  updated_at: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface DeviceInfo {
  deviceID: string;
  name: string;
  model: string;
  hardware: string;
  alias: string;
  presence: string;
  managed: boolean;
  volume: number;
  play_mode: string;
  playlist_id: number;
  current_song_index: number;
  last_selected_at: string;
}

export interface DeviceGroup {
  account_id: string;
  account_name: string;
  devices: DeviceInfo[];
  last_selected_device_id: string;
}

export interface PlayerStatus {
  state: string;
  play_mode: string;
  playlist_id: number;
  current_index: number;
  current_song?: {
    id: number;
    title: string;
    artist: string;
    cover_url?: string;
    lyric_url?: string;
  };
  position: number;
  duration: number;
  is_playing: boolean;
  volume: number;
}

export interface LyricPayload {
  lyric: string;
  tlyric?: string;
  rlyric?: string;
  lxlyric?: string;
}

export interface MiPluginInfo {
  id: number;
  entry_path: string;
  status: string;
  version: string;
}
