import axios from 'axios';
import type {
  LoginRequest,
  TokenResponse,
  RefreshTokenRequest,
  ChangePasswordRequest,
  PermissionResponse,
  PublicKeyResponse,
  ApiResponse,
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

// 登出（前端清除 token 即可，后端无登出接口）
export function logout() {
  // Swagger 中无登出接口，仅前端清除 token
  return Promise.resolve();
}

// 获取公钥（用于加密登录）
export function getPublicKey() {
  return axios.get<ApiResponse<PublicKeyResponse>>('/api/v1/public/public-key');
}
