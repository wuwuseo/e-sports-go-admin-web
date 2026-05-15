import { defineStore } from 'pinia';
import { createCrudActions } from '@/store/mixins/crud';
import {
  getConfigList,
  createConfig,
  updateConfig,
  deleteConfig,
  getConfigDetail,
  getConfigByKey,
  getConfigByGroup,
  getConfigGroups,
} from '@/api/config';
import type {
  ConfigResponse,
  CreateConfigRequest,
  UpdateConfigRequest,
  ConfigQuery,
  ConfigGroup,
} from '@/types/api';

export interface ConfigState {
  items: ConfigResponse[];
  total: number;
  currentItem?: ConfigResponse;
  loading: boolean;
  groups: ConfigGroup[];
  groupData: Record<string, ConfigResponse[]>;
}

const useConfigStore = defineStore('config', {
  state: (): ConfigState => ({
    items: [],
    total: 0,
    currentItem: undefined,
    loading: false,
    groups: [],
    groupData: {},
  }),

  getters: {
    configList: (state) => state.items,
    currentConfig: (state) => state.currentItem,
  },

  actions: {
    // ==========================================
    // 标准 CRUD 操作：从 Mixin 注入
    // ==========================================
    ...createCrudActions<
      ConfigResponse,
      CreateConfigRequest,
      UpdateConfigRequest,
      ConfigQuery
    >({
      getList: getConfigList,
      create: createConfig,
      getDetail: getConfigDetail,
      update: updateConfig,
      delete: deleteConfig,
    }),

    // ==========================================
    // 别名：保持向后兼容
    // ==========================================
    async fetchConfigList(query?: ConfigQuery) {
      await this.fetchList(query);
      return this.items;
    },

    async createConfig(data: CreateConfigRequest) {
      return this.create(data);
    },

    async updateConfig(id: number, data: UpdateConfigRequest) {
      return this.update(id, data);
    },

    async deleteConfig(id: number) {
      await this.delete(id);
    },

    async fetchConfigDetail(id: number) {
      return this.fetchDetail(id);
    },

    // ==========================================
    // 业务特定方法
    // ==========================================
    async fetchByKey(key: string) {
      const res = await getConfigByKey(key);
      return res.data.data;
    },

    async fetchByGroup(group: string, forceRefresh = false) {
      if (!forceRefresh && this.groupData[group]) {
        return this.groupData[group];
      }
      const res = await getConfigByGroup(group);
      this.groupData[group] = res.data.data;
      return this.groupData[group];
    },

    async fetchGroups(forceRefresh = false) {
      if (!forceRefresh && this.groups.length > 0) {
        return this.groups;
      }
      const res = await getConfigGroups();
      this.groups = res.data.data;
      return this.groups;
    },

    clearCache() {
      this.groupData = {};
      this.groups = [];
    },
  },
});

export default useConfigStore;
