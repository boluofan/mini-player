import { makeAutoObservable, reaction } from 'mobx-miniprogram';
import { Store } from '..';
import { request } from '@/miniprogram/utils';
import type { LyricPayload } from '@/miniprogram/types';

export interface Lyric {
  time: number;
  lrc: string;
}

export const parseLrc = (lrc: string = ''): Lyric[] => {
  try {
    return lrc
      .split('\n')
      .map((line) => {
        const trimmedLine = line.trim();
        const timeMatch = trimmedLine.match(/\[\d{2}:\d{2}(\.\d+)?\](.*)/);
        if (!timeMatch) return null;
        const timeStr = timeMatch[0].match(/\[(\d{2}):(\d{2})(\.\d+)?\]/);
        if (!timeStr) return null;
        let timeMs =
          parseInt(timeStr[1], 10) * 60000 + parseInt(timeStr[2], 10) * 1000;
        if (timeStr[3]) {
          timeMs += parseFloat(timeStr[3]) * 1000;
        }
        const lrcText = timeMatch[2]?.trim();
        return { time: timeMs, lrc: lrcText } as Lyric;
      })
      .filter((item): item is Lyric => !!item?.lrc);
  } catch {
    return [];
  }
};

export class LyricModule {
  store: Store;

  ready = false;
  offset = 0;

  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this);

    reaction(
      () => this.store.musicLyric,
      () => {
        this.ready = false;
        this.setOffset(0);
        setTimeout(() => this.syncLyric(), 1000);
      },
    );
    reaction(
      () => this.store.currentTime,
      (val) => {
        if (!this.ready) return;
        if (val < 1) {
          this.syncLyric();
          return;
        }
        const currentTime = (val + this.offset) * 1000;
        const { index: currentIndex } = this.store.musicLyricCurrent;
        const nextIndex = currentIndex + 1;
        const nextLyric = this.store.musicLyric[nextIndex];
        const { time: nextTime, lrc } = nextLyric || {};
        if (nextTime && nextTime < currentTime) {
          this.store.setData({
            musicLyricCurrent: {
              lrc,
              index: nextIndex,
            },
          });
        }
      },
    );
  }

  get linePercent() {
    if (this.store.status !== 'playing' || !this.store.feature.advanceLyric) {
      return 1;
    }
    const { musicLyric, currentTime } = this.store;
    const { index } = this.store.musicLyricCurrent;
    const a = musicLyric[index]?.time;
    const b = musicLyric[index + 1]?.time;
    const time = currentTime + this.offset;
    return b ? Math.max((time * 1000 - a) / (b - a), 0) : 0;
  }

  syncLyric(currentTime = this.store.currentTime) {
    const time = currentTime + this.offset;
    const index = this.findCurrentIndex(time);
    const preIndex = Math.max(0, index - 1);
    this.store.setData({
      musicLyricCurrent: {
        index: preIndex,
        lrc: this.store.musicLyric[preIndex]?.lrc,
      },
    });
    this.ready = true;
  }

  setOffset(val: number) {
    this.offset = val;
    this.syncLyric();
  }

  findCurrentIndex = (time: number) => {
    let index = 0;
    const list = this.store.musicLyric;
    while (list[index] && list[index].time < time * 1000) {
      index += 1;
    }
    return Math.min(index, list.length - 1);
  };

  fetchLyric = async (songId?: number) => {
    const id = songId || this.store.currentSong?.id;
    if (!id) {
      this.store.setData({ musicLyricLoading: false });
      return;
    }

    this.store.setData({ musicLyricLoading: true });

    try {
      const res = await request<LyricPayload>({
        url: `/api/v1/songs/${id}/lyric`,
      });
      if (res.statusCode !== 200 || !res.data) {
        this.store.setData({ musicLyricLoading: false });
        return;
      }
      const payload = res.data;
      const lrcText = payload.tlyric || payload.lyric || '';
      const parsed = parseLrc(lrcText);
      this.store.setData({
        musicLyric: parsed,
        musicLyricLoading: false,
      });
    } catch {
      this.store.setData({ musicLyricLoading: false });
    }
  };
}
