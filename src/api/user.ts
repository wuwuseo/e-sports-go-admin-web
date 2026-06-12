import axios from 'axios';
import type {
  LoginRequest,
  TokenResponse,
  RefreshTokenRequest,
  ChangePasswordRequest,
  SysPermissionTreeNode,
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
  AdminLoginRequest,
  AdminResponse,
  AdminDetailResponse,
  CreateAdminRequest,
  UpdateAdminRequest,
  AdminQuery,
  ChangeAdminPasswordRequest,
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
  return axios.get<ApiResponse<UserDetailResponse>>('/api/v1/admin/auth/user');
}

// 更新当前用户信息
export function updateCurrentUser(data: Record<string, any>) {
  return axios.put<ApiResponse<any>>('/api/v1/admin/auth/user', data);
}

// 修改密码
export function changePassword(data: ChangePasswordRequest) {
  return axios.put<ApiResponse<any>>('/api/v1/admin/auth/password', data);
}

// 获取用户混合权限树
export function getUserPermissions(params?: { domain?: string }) {
  return axios.get<ApiResponse<SysPermissionTreeNode[]>>(
    '/api/v1/admin/auth/user/permissions',
    { params }
  );
}

// 获取用户按钮权限
export function getUserButtonPermissions(params?: { domain?: string }) {
  return axios.get<ApiResponse<unknown>>(
    '/api/v1/admin/auth/user/button-permissions',
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

// ==========================================
// 管理员认证与管理
// ==========================================

// 管理员登录
export function adminLogin(data: AdminLoginRequest) {
  return axios.post<ApiResponse<TokenResponse>>(
    '/api/v1/admin/public/login',
    data
  );
}

// 管理员刷新 Token
export function adminRefreshToken(data: RefreshTokenRequest) {
  return axios.post<ApiResponse<TokenResponse>>(
    '/api/v1/admin/public/refresh',
    data
  );
}

// 获取当前登录管理员信息
export function getCurrentAdmin() {
  return axios.get<ApiResponse<AdminDetailResponse>>('/api/v1/admin/auth/user');
}

// 更新当前管理员信息
export function updateCurrentAdmin(data: Record<string, any>) {
  return axios.put<ApiResponse<any>>('/api/v1/admin/auth/user', data);
}

// 修改管理员密码
export function changeAdminPassword(data: ChangeAdminPasswordRequest) {
  return axios.put<ApiResponse<any>>('/api/v1/admin/auth/password', data);
}

// 管理员登出
export function adminLogout() {
  return axios.post<ApiResponse<null>>('/api/v1/admin/auth/logout');
}

// 获取管理员列表
export function getAdmins(params?: AdminQuery) {
  return axios.get<ApiResponse<PaginatedResponse<AdminResponse>>>(
    '/api/v1/admin/auth/admins',
    { params }
  );
}

// 获取管理员详情
export function getAdminDetail(id: number) {
  return axios.get<ApiResponse<AdminDetailResponse>>(
    `/api/v1/admin/auth/admins/${id}`
  );
}

// 创建管理员
export function createAdmin(data: CreateAdminRequest) {
  return axios.post<ApiResponse<AdminResponse>>(
    '/api/v1/admin/auth/admins',
    data
  );
}

// 激活管理员
export function activateAdmin(id: number) {
  return axios.put<ApiResponse<null>>(
    `/api/v1/admin/auth/admins/${id}/activate`
  );
}

// 停用管理员
export function deactivateAdmin(id: number) {
  return axios.put<ApiResponse<null>>(
    `/api/v1/admin/auth/admins/${id}/deactivate`
  );
}

// 获取管理员角色列表
export function getAdminRoles(id: number) {
  return axios.get<ApiResponse<RoleResponse[]>>(
    `/api/v1/admin/auth/admins/${id}/roles`
  );
}

// 分配管理员角色
export function assignAdminRoles(id: number, data: AssignUserRolesRequest) {
  return axios.put<ApiResponse<null>>(
    `/api/v1/admin/auth/admins/${id}/roles`,
    data
  );
}

// 更新管理员
export function updateAdmin(id: number, data: UpdateAdminRequest) {
  return axios.put<ApiResponse<AdminResponse>>(
    `/api/v1/admin/auth/admins/${id}`,
    data
  );
}
