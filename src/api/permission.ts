import axios from 'axios';
import type {
  PermissionResponse,
  SysPermissionTreeNode,
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

// 获取用户混合权限树
export function getUserPermissions(params?: { domain?: string }) {
  return axios.get<ApiResponse<SysPermissionTreeNode[]>>(
    '/api/v1/admin/auth/user/permissions',
    { params }
  );
}
