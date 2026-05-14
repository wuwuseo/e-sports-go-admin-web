import axios from 'axios';
import type {
  PermissionResponse,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  PermissionQuery,
  PermissionsAllQuery,
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

// 获取所有权限（不带分页，支持筛选）
export function getAllPermissions(params?: PermissionsAllQuery) {
  return axios.get<ApiResponse<PermissionResponse[]>>(
    '/api/v1/admin/auth/permissions/all',
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
  return axios.put<ApiResponse<string>>('/api/v1/admin/auth/permissions', data);
}

// 删除权限
export function deletePermission(params: {
  role_name: string;
  domain: string;
  object: string;
  action: string;
}) {
  return axios.delete<ApiResponse<string>>('/api/v1/admin/auth/permissions', {
    params,
  });
}

// 获取权限详情
export function getPermissionDetail(params: {
  role_name: string;
  domain: string;
  object: string;
  action: string;
}) {
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
