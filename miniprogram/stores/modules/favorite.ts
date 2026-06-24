import { makeAutoObservable } from 'mobx-miniprogram';
import { Store } from '..';
import { request } from '@/miniprogram/utils';

const FAVORITE_PLAYLIST_ID = 1;

export class FavoriteModule {
  store: Store;
  favoriteSet: Set<number> = new Set();

  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this);
  }

  async initFavorites() {
    try {
      const res = await request<{ songs: any[]; total: number }>({
        url: `/api/v1/playlists/${FAVORITE_PLAYLIST_ID}/songs`,
        data: { limit: 10000 },
      });
      if (res.statusCode !== 200) return;
      const ids = (res.data.songs || []).map((s) => s.id);
      this.favoriteSet = new Set(ids);
    } catch {}
  }

  isFavorite(songId: number) {
    return this.favoriteSet.has(songId);
  }

  async toggleFavorite(songId: number) {
    if (this.isFavorite(songId)) {
      this.favoriteSet.delete(songId);
      try {
        await request({
          url: `/api/v1/playlists/${FAVORITE_PLAYLIST_ID}/songs/${songId}`,
          method: 'DELETE',
        });
      } catch {
        this.favoriteSet.add(songId);
      }
    } else {
      this.favoriteSet.add(songId);
      try {
        await request({
          url: `/api/v1/playlists/${FAVORITE_PLAYLIST_ID}/songs`,
          method: 'POST',
          data: { song_ids: [songId] },
        });
      } catch {
        this.favoriteSet.delete(songId);
      }
    }
  }
}
