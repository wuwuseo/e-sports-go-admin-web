import axios from 'axios';
import type {
  QueueTaskResponse,
  QueueStatsResponse,
  QueueTaskQuery,
  EnqueueQueueTaskRequest,
  ApiResponse,
  PaginatedResponse,
} from '@/types/api';

// 获取队列任务列表（state 必传）
export function getQueueTasks(params: QueueTaskQuery) {
  return axios.get<ApiResponse<PaginatedResponse<QueueTaskResponse>>>(
    '/api/v1/admin/auth/queue-jobs',
    { params }
  );
}

// 获取队列统计
export function getQueueStats() {
  return axios.get<ApiResponse<QueueStatsResponse[]>>(
    '/api/v1/admin/auth/queue-jobs/stats'
  );
}

// 获取已注册处理器列表
export function getQueueHandlers() {
  return axios.get<ApiResponse<string[]>>(
    '/api/v1/admin/auth/queue-jobs/handlers'
  );
}

// 手动入队任务
export function enqueueQueueTask(data: EnqueueQueueTaskRequest) {
  return axios.post<ApiResponse<{ task_id: string }>>(
    '/api/v1/admin/auth/queue-jobs',
    data
  );
}

// 获取任务详情
export function getQueueTaskDetail(queue: string, id: string) {
  return axios.get<ApiResponse<QueueTaskResponse>>(
    `/api/v1/admin/auth/queue-jobs/${queue}/${id}`
  );
}

// 立即重试任务
export function retryQueueTask(queue: string, id: string) {
  return axios.post<ApiResponse<null>>(
    `/api/v1/admin/auth/queue-jobs/${queue}/${id}/retry`
  );
}

// 取消执行中任务
export function cancelQueueTask(queue: string, id: string) {
  return axios.post<ApiResponse<null>>(
    `/api/v1/admin/auth/queue-jobs/${queue}/${id}/cancel`
  );
}

// 删除任务
export function deleteQueueTask(queue: string, id: string) {
  return axios.delete<ApiResponse<null>>(
    `/api/v1/admin/auth/queue-jobs/${queue}/${id}`
  );
}
