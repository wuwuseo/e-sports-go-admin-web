import axios from 'axios';
import type {
  SysPermissionResponse,
  SysPermissionTreeNode,
  CreateSysPermissionRequest,
  UpdateSysPermissionRequest,
  SysPermissionQuery,
  ApiResponse,
  PaginatedResponse,
} from '@/types/api';

// 获取权限定义列表
export function getSysPermissions(params?: SysPermissionQuery) {
  return axios.get<ApiResponse<PaginatedResponse<SysPermissionResponse>>>(
    '/api/v1/admin/auth/system-permissions',
    { params }
  );
}

// 获取权限树
export function getSysPermissionTree(params?: { domain?: string }) {
  return axios.get<ApiResponse<SysPermissionTreeNode[]>>(
    '/api/v1/admin/auth/system-permissions/tree',
    { params }
  );
}

// 获取权限定义详情
export function getSysPermissionDetail(id: number) {
  return axios.get<ApiResponse<SysPermissionResponse>>(
    `/api/v1/admin/auth/system-permissions/${id}`
  );
}

// 创建权限定义
export function createSysPermission(data: CreateSysPermissionRequest) {
  return axios.post<ApiResponse<SysPermissionResponse>>(
    '/api/v1/admin/auth/system-permissions',
    data
  );
}

// 更新权限定义
export function updateSysPermission(
  id: number,
  data: UpdateSysPermissionRequest
) {
  return axios.put<ApiResponse<SysPermissionResponse>>(
    `/api/v1/admin/auth/system-permissions/${id}`,
    data
  );
}

// 删除权限定义
export function deleteSysPermission(id: number) {
  return axios.delete<ApiResponse<null>>(
    `/api/v1/admin/auth/system-permissions/${id}`
  );
}
