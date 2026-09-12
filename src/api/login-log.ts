import axios from 'axios';
import type {
  LoginLogResponse,
  LoginLogQuery,
  ApiResponse,
  PaginatedResponse,
} from '@/types/api';

// 获取登录日志列表
export function getLoginLogs(params?: LoginLogQuery) {
  return axios.get<ApiResponse<PaginatedResponse<LoginLogResponse>>>(
    '/api/v1/admin/auth/login-logs',
    { params }
  );
}

// 获取登录日志详情
export function getLoginLogDetail(id: number) {
  return axios.get<ApiResponse<LoginLogResponse>>(
    `/api/v1/admin/auth/login-logs/${id}`
  );
}
