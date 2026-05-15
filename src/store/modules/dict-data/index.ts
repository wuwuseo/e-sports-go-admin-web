import { defineStore } from 'pinia';
import { createCrudActions } from '@/store/mixins/crud';
import {
  getDictDataList,
  createDictData,
  updateDictData,
  deleteDictData,
  getDictDataDetail,
  getDictDataByType,
} from '@/api/dict-data';
import type {
  DictDataResponse,
  CreateDictDataRequest,
  UpdateDictDataRequest,
  DictDataQuery,
} from '@/types/api';

export interface DictDataState {
  items: DictDataResponse[];
  total: number;
  currentItem?: DictDataResponse;
  loading: boolean;
  typeMap: Record<string, DictDataResponse[]>;
}

const useDictDataStore = defineStore('dict-data', {
  state: (): DictDataState => ({
    items: [],
    total: 0,
    currentItem: undefined,
    loading: false,
    typeMap: {},
  }),

  getters: {
    dictDataList: (state) => state.items,
    currentDictData: (state) => state.currentItem,
  },

  actions: {
    // ==========================================
    // 标准 CRUD 操作：从 Mixin 注入
    // ==========================================
    ...createCrudActions<
      DictDataResponse,
      CreateDictDataRequest,
      UpdateDictDataRequest,
      DictDataQuery
    >({
      getList: getDictDataList,
      create: createDictData,
      getDetail: getDictDataDetail,
      update: updateDictData,
      delete: deleteDictData,
    }),

    // ==========================================
    // 别名：保持向后兼容
    // ==========================================
    async fetchDictDataList(query?: DictDataQuery) {
      await this.fetchList(query);
      return this.items;
    },

    async createDictData(data: CreateDictDataRequest) {
      return this.create(data);
    },

    async updateDictData(id: number, data: UpdateDictDataRequest) {
      return this.update(id, data);
    },

    async deleteDictData(id: number) {
      await this.delete(id);
    },

    async fetchDictDataDetail(id: number) {
      return this.fetchDetail(id);
    },

    // ==========================================
    // 业务特定方法
    // ==========================================
    async fetchByType(type: string, forceRefresh = false) {
      if (!forceRefresh && this.typeMap[type]) {
        return this.typeMap[type];
      }
      const res = await getDictDataByType(type);
      this.typeMap[type] = res.data.data;
      return this.typeMap[type];
    },

    clearTypeCache() {
      this.typeMap = {};
    },
  },
});

export default useDictDataStore;
