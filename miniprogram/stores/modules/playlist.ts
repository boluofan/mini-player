import { makeAutoObservable } from 'mobx-miniprogram';
import { Store } from '..';
import { buildResourceUrl, request } from '@/miniprogram/utils';
import type { Playlist, Song } from '@/miniprogram/types';

export class PlaylistModule {
  store: Store;

  playlists: Playlist[] = [];

  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this);
  }

  get normalPlaylists() {
    return this.playlists.filter((p) => p.type === 'normal');
  }

  getPlaylistIdByName(name: string): number {
    return this.playlists.find((p) => p.name === name)?.id || 0;
  }

  async fetchPlaylists() {
    try {
      const res = await request<{ playlists: Playlist[]; total: number }>({
        url: '/api/v1/playlists',
        data: { limit: 100 },
      });
      if (res.statusCode !== 200) return;
      this.playlists = (res.data.playlists || [])
        .filter((p) => p.type === 'normal')
        .map((p) => ({
          ...p,
          cover_url: p.cover_url
            ? buildResourceUrl(p.cover_url)
            : '/assets/icon/changpian.svg',
        }));
    } catch {}
  }

  async fetchSongs(
    playlistId: number,
    offset = 0,
    limit = 50,
  ): Promise<Song[]> {
    try {
      const res = await request<{ songs: Song[]; total: number }>({
        url: `/api/v1/playlists/${playlistId}/songs`,
        data: { offset, limit },
      });
      if (res.statusCode !== 200) return [];
      return (res.data.songs || []).map((s) => ({
        ...s,
        cover_url: s.cover_url ? buildResourceUrl(s.cover_url) : '',
      }));
    } catch {
      return [];
    }
  }

  async createPlaylist(name: string) {
    const exists = this.playlists.find((p) => p.name === name);
    if (exists) {
      wx.showToast({ title: '歌单名称不可重复', icon: 'none' });
      return;
    }
    try {
      const res = await request<Playlist>({
        url: '/api/v1/playlists',
        method: 'POST',
        data: { type: 'normal', name },
      });
      if (res.statusCode === 200) {
        this.playlists = this.playlists.concat(res.data);
      }
    } catch {}
  }

  async deletePlaylist(id: number) {
    wx.showModal({
      title: '确认删除',
      content: '仅删除歌单，歌曲文件不会被删除',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await request({
            url: `/api/v1/playlists/${id}`,
            method: 'DELETE',
          });
          this.playlists = this.playlists.filter((p) => p.id !== id);
        } catch {}
      },
    });
  }

  async addSongs(playlistId: number, songIds: number[]) {
    try {
      await request({
        url: `/api/v1/playlists/${playlistId}/songs`,
        method: 'POST',
        data: { song_ids: songIds },
      });
    } catch {}
  }

  async searchSongs(keyword: string): Promise<Song[]> {
    try {
      const res = await request<{ songs: Song[]; total: number }>({
        url: '/api/v1/songs',
        data: { q: keyword, limit: 100 },
      });
      if (res.statusCode !== 200) return [];
      return res.data.songs || [];
    } catch {
      return [];
    }
  }

  async removeSong(playlistId: number, songId: number) {
    try {
      await request({
        url: `/api/v1/playlists/${playlistId}/songs/${songId}`,
        method: 'DELETE',
      });
    } catch {}
  }
}
