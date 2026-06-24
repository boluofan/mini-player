import { makeAutoObservable, reaction } from 'mobx-miniprogram';
import { Store } from '..';

export class FeatureModule {
  store: Store;

  advanceLyric: boolean;
  bgAudio: boolean;

  constructor(store: Store) {
    this.store = store;
    makeAutoObservable(this);

    const info = wx.getStorageSync('featureInfo') || {};
    this.advanceLyric = info.advanceLyric ?? true;
    this.bgAudio = info.bgAudio ?? true;

    reaction(
      () => ({ advanceLyric: this.advanceLyric, bgAudio: this.bgAudio }),
      (val) => wx.setStorageSync('featureInfo', val),
      { delay: 1000 },
    );
  }

  setAdvanceLyric(value: boolean) {
    this.advanceLyric = value;
  }

  setBgAudio(value: boolean) {
    this.bgAudio = value;
    this.store.hostPlayer.audioContext?.stop();
  }
}
