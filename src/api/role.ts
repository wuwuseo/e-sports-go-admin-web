import axios from 'axios';
import type {
  RoleResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
  RoleQuery,
  PermissionResponse,
  AssignPermissionsRequest,
  RemovePermissionsRequest,
  ApiResponse,
  PaginatedResponse,
} from '@/types/api';

// 获取角色列表
export function getRoles(params?: RoleQuery) {
  return axios.get<ApiResponse<PaginatedResponse<RoleResponse>>>(
    '/api/v1/admin/auth/roles',
    { params }
  );
}

// 创建角色
export function createRole(data: CreateRoleRequest) {
  return axios.post<ApiResponse<RoleResponse>>(
    '/api/v1/admin/auth/roles',
    data
  );
}

// 获取角色详情
export function getRoleDetail(id: number) {
  return axios.get<ApiResponse<RoleResponse>>(`/api/v1/admin/auth/roles/${id}`);
}

// 更新角色
export function updateRole(id: number, data: UpdateRoleRequest) {
  return axios.put<ApiResponse<RoleResponse>>(
    `/api/v1/admin/auth/roles/${id}`,
    data
  );
}

// 删除角色
export function deleteRole(id: number) {
  return axios.delete<ApiResponse<null>>(`/api/v1/admin/auth/roles/${id}`);
}

// 启用角色
export function enableRole(id: number) {
  return axios.put<ApiResponse<null>>(`/api/v1/admin/auth/roles/${id}/enable`);
}

// 禁用角色
export function disableRole(id: number) {
  return axios.put<ApiResponse<null>>(`/api/v1/admin/auth/roles/${id}/disable`);
}

// 获取角色权限列表
export function getRolePermissions(params: {
  role_name: string;
  domain?: string;
}) {
  return axios.get<ApiResponse<PermissionResponse[]>>(
    '/api/v1/admin/auth/roles/permissions',
    { params }
  );
}

// 为角色分配权限
export function assignRolePermissions(data: AssignPermissionsRequest) {
  return axios.post<ApiResponse<null>>(
    '/api/v1/admin/auth/roles/permissions/assign',
    data
  );
}

// 从角色移除权限
export function removeRolePermissions(data: RemovePermissionsRequest) {
  return axios.post<ApiResponse<null>>(
    '/api/v1/admin/auth/roles/permissions/remove',
    data
  );
}
