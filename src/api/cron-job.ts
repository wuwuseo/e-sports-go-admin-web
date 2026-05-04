import axios from 'axios';
import type {
  CronJobResponse,
  CreateCronJobRequest,
  UpdateCronJobRequest,
  CronJobQuery,
  ApiResponse,
  PaginatedResponse,
  LogFileInfo,
} from '@/types/api';

// 获取定时任务列表
export function getCronJobs(params?: CronJobQuery) {
  return axios.get<ApiResponse<PaginatedResponse<CronJobResponse>>>(
    '/api/v1/admin/auth/cron-jobs',
    { params }
  );
}

// 创建定时任务
export function createCronJob(data: CreateCronJobRequest) {
  return axios.post<ApiResponse<CronJobResponse>>(
    '/api/v1/admin/auth/cron-jobs',
    data
  );
}

// 获取定时任务详情
export function getCronJobDetail(id: number) {
  return axios.get<ApiResponse<CronJobResponse>>(
    `/api/v1/admin/auth/cron-jobs/${id}`
  );
}

// 更新定时任务
export function updateCronJob(id: number, data: UpdateCronJobRequest) {
  return axios.put<ApiResponse<CronJobResponse>>(
    `/api/v1/admin/auth/cron-jobs/${id}`,
    data
  );
}

// 删除定时任务
export function deleteCronJob(id: number) {
  return axios.delete<ApiResponse<null>>(`/api/v1/admin/auth/cron-jobs/${id}`);
}

// 启用定时任务
export function enableCronJob(id: number) {
  return axios.post<ApiResponse<null>>(
    `/api/v1/admin/auth/cron-jobs/${id}/enable`
  );
}

// 禁用定时任务
export function disableCronJob(id: number) {
  return axios.post<ApiResponse<null>>(
    `/api/v1/admin/auth/cron-jobs/${id}/disable`
  );
}

// 立即执行定时任务
export function runCronJob(id: number) {
  return axios.post<ApiResponse<null>>(
    `/api/v1/admin/auth/cron-jobs/${id}/run`
  );
}

// 获取任务日志列表
export function getCronJobLogs(id: number) {
  return axios.get<ApiResponse<LogFileInfo[]>>(
    `/api/v1/admin/auth/cron-jobs/${id}/logs`
  );
}

// 获取特定日志文件内容
export function getCronJobLogContent(id: number, filename: string) {
  return axios.get<ApiResponse<string>>(
    `/api/v1/admin/auth/cron-jobs/${id}/logs/${filename}`
  );
}

// 读取日志尾部
export function getCronJobLogTail(id: number, params?: { lines?: number }) {
  return axios.get<ApiResponse<string>>(
    `/api/v1/admin/auth/cron-jobs/${id}/logs/tail`,
    { params }
  );
}
