import { defineStore } from 'pinia';
import {
  createFetchListAction,
  createFetchDetailAction,
} from '@/store/mixins/crud';
import { getOperationLogs, getOperationLogDetail } from '@/api/operation-log';
import type { OperationLogResponse, OperationLogQuery } from '@/types/api';

export interface OperationLogState {
  items: OperationLogResponse[];
  total: number;
  currentItem?: OperationLogResponse;
  loading: boolean;
}

const useOperationLogStore = defineStore('operation-log', {
  state: (): OperationLogState => ({
    items: [],
    total: 0,
    currentItem: undefined,
    loading: false,
  }),

  getters: {
    logs: (state) => state.items,
    currentLog: (state) => state.currentItem,
  },

  actions: {
    // 只使用 "查"（日志只有查询，没有增删改
    ...createFetchListAction<OperationLogResponse, OperationLogQuery>({
      getList: getOperationLogs,
    }),
    ...createFetchDetailAction<OperationLogResponse>({
      getDetail: getOperationLogDetail,
    }),

    // 别名：保持向后兼容
    async fetchLogs(query?: OperationLogQuery) {
      await this.fetchList(query);
    },

    async fetchLogDetail(id: number) {
      return this.fetchDetail(id);
    },
  },
});

export default useOperationLogStore;
