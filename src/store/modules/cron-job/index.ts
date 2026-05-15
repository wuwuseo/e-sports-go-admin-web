import { defineStore } from 'pinia';
import { createCrudActions } from '@/store/mixins/crud';
import {
  getCronJobs,
  createCronJob,
  updateCronJob,
  deleteCronJob,
  getCronJobDetail,
  enableCronJob,
  disableCronJob,
  runCronJob,
  getCronJobLogs,
  getCronJobLogContent,
  getCronJobLogTail,
} from '@/api/cron-job';
import type {
  CronJobResponse,
  CreateCronJobRequest,
  UpdateCronJobRequest,
  CronJobQuery,
  LogFileInfo,
} from '@/types/api';

export interface CronJobState {
  items: CronJobResponse[];
  total: number;
  currentItem?: CronJobResponse;
  loading: boolean;
  logs: LogFileInfo[];
  logContent: string;
}

const useCronJobStore = defineStore('cron-job', {
  state: (): CronJobState => ({
    items: [],
    total: 0,
    currentItem: undefined,
    loading: false,
    logs: [],
    logContent: '',
  }),

  getters: {
    cronJobs: (state) => state.items,
    currentCronJob: (state) => state.currentItem,
  },

  actions: {
    // ==========================================
    // 标准 CRUD 操作：从 Mixin 注入
    // ==========================================
    ...createCrudActions<
      CronJobResponse,
      CreateCronJobRequest,
      UpdateCronJobRequest,
      CronJobQuery
    >({
      getList: getCronJobs,
      create: createCronJob,
      getDetail: getCronJobDetail,
      update: updateCronJob,
      delete: deleteCronJob,
    }),

    // ==========================================
    // 别名：保持向后兼容
    // ==========================================
    async fetchCronJobs(query?: CronJobQuery) {
      await this.fetchList(query);
      return this.items;
    },

    async createCronJob(data: CreateCronJobRequest) {
      return this.create(data);
    },

    async updateCronJob(id: number, data: UpdateCronJobRequest) {
      return this.update(id, data);
    },

    async deleteCronJob(id: number) {
      await this.delete(id);
    },

    async fetchCronJobDetail(id: number) {
      return this.fetchDetail(id);
    },

    // ==========================================
    // 业务特定方法
    // ==========================================
    async enableCronJob(id: number) {
      await enableCronJob(id);
    },

    async disableCronJob(id: number) {
      await disableCronJob(id);
    },

    async toggleCronJobStatus(id: number, enabled: boolean) {
      if (enabled) {
        await this.enableCronJob(id);
      } else {
        await this.disableCronJob(id);
      }
    },

    async runCronJob(id: number) {
      await runCronJob(id);
    },

    async fetchCronJobLogs(id: number) {
      const res = await getCronJobLogs(id);
      this.logs = res.data.data;
      return this.logs;
    },

    async fetchCronJobLogContent(id: number, filename: string) {
      const res = await getCronJobLogContent(id, filename);
      this.logContent = res.data.data;
      return this.logContent;
    },

    async fetchCronJobLogTail(id: number, params?: { lines?: number }) {
      const res = await getCronJobLogTail(id, params);
      this.logContent = res.data.data;
      return this.logContent;
    },
  },
});

export default useCronJobStore;
