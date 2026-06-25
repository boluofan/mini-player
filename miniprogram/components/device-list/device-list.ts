import { store } from '@/miniprogram/stores';
import { ComponentWithStore } from 'mobx-miniprogram-bindings';

ComponentWithStore({
  storeBindings: {
    store,
    fields: ['did', 'deviceGroups', 'deviceList', 'hasMiot'] as const,
    actions: [] as const,
  },
  methods: {
    handleSwitchDevice(e: any) {
      const { deviceid, gindex } = e.currentTarget.dataset;
      if (deviceid === store.did) return;
      if (deviceid === 'host') {
        store.switchDevice('host');
        return;
      }
      const group = store.deviceGroups[gindex];
      store.switchDevice(deviceid, group?.account_id);
    },
  },
});
