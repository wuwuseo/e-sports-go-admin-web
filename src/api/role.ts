import axios from 'axios';
import type {
  RoleResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
  RoleQuery,
  PermissionResponse,
  AssignPermissionsRequest,
  RemovePermissionsRequest,
  SaveRolePermissionsRequest,
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

// 根据角色ID获取已分配的权限列表（编辑时回显）
export function getRolePermissionsById(
  id: number,
  params?: { domain?: string }
) {
  return axios.get<
    ApiResponse<Array<{ object: string; action: string; domain: string }>>
  >(`/api/v1/admin/auth/roles/${id}/permissions`, { params });
}

// 覆盖式保存角色权限（根据角色ID，基于 Casbin）
export function saveRolePermissions(
  id: number,
  data: SaveRolePermissionsRequest
) {
  return axios.post<ApiResponse<null>>(
    `/api/v1/admin/auth/roles/${id}/permissions`,
    data
  );
}

// 获取所有角色（不带分页）
export function getAllRoles(params?: { keyword?: string; status?: string }) {
  return axios.get<ApiResponse<RoleResponse[]>>(
    '/api/v1/admin/auth/roles/all',
    {
      params,
    }
  );
}
