import axios from 'axios';
import type {
  OperationLogResponse,
  OperationLogQuery,
  ApiResponse,
  PaginatedResponse,
} from '@/types/api';

// 获取操作日志列表
export function getOperationLogs(params?: OperationLogQuery) {
  return axios.get<ApiResponse<PaginatedResponse<OperationLogResponse>>>(
    '/api/v1/admin/auth/operation-logs',
    { params }
  );
}

// 获取操作日志详情
export function getOperationLogDetail(id: number) {
  return axios.get<ApiResponse<OperationLogResponse>>(
    `/api/v1/admin/auth/operation-logs/${id}`
  );
}
