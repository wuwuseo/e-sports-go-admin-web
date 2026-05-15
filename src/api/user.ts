import axios from 'axios';
import type {
  LoginRequest,
  TokenResponse,
  RefreshTokenRequest,
  ChangePasswordRequest,
  PermissionResponse,
  PublicKeyResponse,
  ApiResponse,
  PaginatedResponse,
  UserResponse,
  UserDetailResponse,
  CreateUserRequest,
  UpdateUserRequest,
  UserQuery,
  ThirdPartyUserResponse,
  ThirdPartyUserQuery,
  BlacklistResponse,
  BlacklistUserRequest,
  AssignUserRolesRequest,
  RoleResponse,
} from '@/types/api';

// 登录
export function login(data: LoginRequest) {
  return axios.post<ApiResponse<TokenResponse>>('/api/v1/public/login', data);
}

// 刷新令牌
export function refreshToken(data: RefreshTokenRequest) {
  return axios.post<ApiResponse<TokenResponse>>(
    '/api/v1/admin/refresh-token',
    data
  );
}

// 获取当前登录用户信息
export function getCurrentUser() {
  return axios.get<ApiResponse<any>>('/api/v1/admin/auth/user');
}

// 更新当前用户信息
export function updateCurrentUser(data: Record<string, any>) {
  return axios.put<ApiResponse<any>>('/api/v1/admin/auth/user', data);
}

// 修改密码
export function changePassword(data: ChangePasswordRequest) {
  return axios.put<ApiResponse<any>>('/api/v1/admin/auth/password', data);
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

// 登出
export function logout() {
  return axios.post<ApiResponse<null>>('/api/v1/admin/auth/logout');
}

// 获取公钥（用于加密登录）
export function getPublicKey() {
  return axios.get<ApiResponse<PublicKeyResponse>>('/api/v1/public/public-key');
}

// ==========================================
// 用户管理（管理员）
// ==========================================

// 获取用户列表（分页+搜索+过滤+排序）
export function getUsers(params?: UserQuery) {
  return axios.get<ApiResponse<PaginatedResponse<UserResponse>>>(
    '/api/v1/admin/auth/users',
    { params }
  );
}

// 获取用户详情
export function getUserDetail(id: number) {
  return axios.get<ApiResponse<UserDetailResponse>>(
    `/api/v1/admin/auth/users/${id}`
  );
}

// 创建用户
export function createUser(data: CreateUserRequest) {
  return axios.post<ApiResponse<UserResponse>>(
    '/api/v1/admin/auth/users',
    data
  );
}

// 更新用户
export function updateUser(id: number, data: UpdateUserRequest) {
  return axios.put<ApiResponse<UserResponse>>(
    `/api/v1/admin/auth/users/${id}`,
    data
  );
}

// 删除用户
export function deleteUser(id: number) {
  return axios.delete<ApiResponse<null>>(`/api/v1/admin/auth/users/${id}`);
}

// 导出用户列表
export function exportUsers(params?: UserQuery) {
  return axios.post<ApiResponse<Blob>>(
    '/api/v1/admin/auth/users/export',
    {},
    { params, responseType: 'blob' }
  );
}

// 激活用户
export function activateUser(id: number) {
  return axios.put<ApiResponse<null>>(
    `/api/v1/admin/auth/users/${id}/activate`
  );
}

// 停用用户
export function deactivateUser(id: number) {
  return axios.put<ApiResponse<null>>(
    `/api/v1/admin/auth/users/${id}/deactivate`
  );
}

// ==========================================
// 用户第三方账号管理
// ==========================================

// 获取用户的第三方账号列表
export function getUserThirdPartyAccounts(id: number) {
  return axios.get<ApiResponse<ThirdPartyUserResponse[]>>(
    `/api/v1/admin/auth/users/${id}/third-party`
  );
}

// ==========================================
// 黑名单管理
// ==========================================

// 加入黑名单
export function addUserToBlacklist(id: number, data?: BlacklistUserRequest) {
  return axios.post<ApiResponse<null>>(
    `/api/v1/admin/auth/users/${id}/blacklist`,
    data
  );
}

// 移除黑名单
export function removeUserFromBlacklist(id: number) {
  return axios.delete<ApiResponse<null>>(
    `/api/v1/admin/auth/users/${id}/blacklist`
  );
}

// 获取黑名单列表
export function getBlacklist(params?: UserQuery) {
  return axios.get<ApiResponse<PaginatedResponse<BlacklistResponse>>>(
    '/api/v1/admin/auth/blacklist',
    { params }
  );
}

// ==========================================
// 用户角色管理
// ==========================================

// 查看用户角色
export function getUserRoles(id: number) {
  return axios.get<ApiResponse<RoleResponse[]>>(
    `/api/v1/admin/auth/users/${id}/roles`
  );
}

// 分配用户角色
export function assignUserRoles(id: number, data: AssignUserRolesRequest) {
  return axios.put<ApiResponse<null>>(
    `/api/v1/admin/auth/users/${id}/roles`,
    data
  );
}

// ==========================================
// 第三方用户管理
// ==========================================

// 获取第三方用户列表（分页+筛选）
export function getThirdPartyUsers(params?: ThirdPartyUserQuery) {
  return axios.get<ApiResponse<PaginatedResponse<ThirdPartyUserResponse>>>(
    '/api/v1/admin/auth/third-party-users',
    { params }
  );
}

// 解绑第三方账号
export function unbindThirdPartyUser(id: number) {
  return axios.delete<ApiResponse<null>>(
    `/api/v1/admin/auth/third-party-users/${id}`
  );
}
