import { defineStore } from 'pinia';
import type { RouteRecordNormalized, RouteRecordRaw } from 'vue-router';
import defaultSettings from '@/config/settings.json';
import { AppState } from './types';

const useAppStore = defineStore('app', {
  state: (): AppState => ({ ...defaultSettings }),

  getters: {
    appCurrentSetting(state: AppState): AppState {
      return { ...state };
    },
    appDevice(state: AppState) {
      return state.device;
    },
    appAsyncMenus(state: AppState): RouteRecordNormalized[] {
      return state.serverMenu;
    },
  },

  actions: {
    // Update app settings
    updateSettings(partial: Partial<AppState>) {
      // AppState 含 RouteRecordNormalized，Pinia 的 _DeepPartial 推导会触发 TS2589，
      // 这里只能整体赋值；用 @ts-expect-error 保证 Pinia 类型修复后能立刻发现。
      // @ts-expect-error 深度 Partial 推导超限（TS2589）
      this.$patch(partial);
    },

    // Change theme color
    toggleTheme(dark: boolean) {
      if (dark) {
        this.theme = 'dark';
        document.body.setAttribute('arco-theme', 'dark');
      } else {
        this.theme = 'light';
        document.body.removeAttribute('arco-theme');
      }
    },
    toggleDevice(device: string) {
      this.device = device;
    },
    toggleMenu(value: boolean) {
      this.hideMenu = value;
    },
    setServerMenu(routes: RouteRecordNormalized[]) {
      this.serverMenu = routes;
    },
    setSourceAppMenus(routes: RouteRecordRaw[]) {
      this.sourceAppMenus = routes;
    },
    clearSourceAppMenus() {
      this.sourceAppMenus = [];
    },
    clearServerMenu() {
      this.serverMenu = [];
    },
  },
});

export default useAppStore;
