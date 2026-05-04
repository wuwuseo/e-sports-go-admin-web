import axios from 'axios';
import type {
  PermissionResponse,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  PermissionQuery,
  ApiResponse,
  PaginatedResponse,
} from '@/types/api';

// 获取权限列表
export function getPermissions(params?: PermissionQuery) {
  return axios.get<ApiResponse<PaginatedResponse<PermissionResponse>>>(
    '/api/v1/admin/auth/permissions',
    { params }
  );
}

// 创建权限
export function createPermission(data: CreatePermissionRequest) {
  return axios.post<ApiResponse<PermissionResponse>>(
    '/api/v1/admin/auth/permissions',
    data
  );
}

// 更新权限
export function updatePermission(data: UpdatePermissionRequest) {
  return axios.put<ApiResponse<PermissionResponse>>(
    '/api/v1/admin/auth/permissions',
    data
  );
}

// 删除权限
export function deletePermission(params: { id: number }) {
  return axios.delete<ApiResponse<null>>('/api/v1/admin/auth/permissions', {
    params,
  });
}

// 获取权限详情
export function getPermissionDetail(params: { id: number }) {
  return axios.get<ApiResponse<PermissionResponse>>(
    '/api/v1/admin/auth/permissions/detail',
    { params }
  );
}

// 获取用户所有权限
export function getUserPermissions(params?: { domain?: string }) {
  return axios.get<ApiResponse<PermissionResponse[]>>(
    '/api/v1/admin/auth/user/permissions',
    { params }
  );
}

// 获取用户菜单权限
export function getUserMenuPermissions(params?: { domain?: string }) {
  return axios.get<ApiResponse<PermissionResponse[]>>(
    '/api/v1/admin/auth/user/menu-permissions',
    { params }
  );
}

// 获取用户按钮权限
export function getUserButtonPermissions(params?: { domain?: string }) {
  return axios.get<ApiResponse<PermissionResponse[]>>(
    '/api/v1/admin/auth/user/button-permissions',
    { params }
  );
}

// 获取用户API权限
export function getUserApiPermissions(params?: { domain?: string }) {
  return axios.get<ApiResponse<PermissionResponse[]>>(
    '/api/v1/admin/auth/user/api-permissions',
    { params }
  );
}
