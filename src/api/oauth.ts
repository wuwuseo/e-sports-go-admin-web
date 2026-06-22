import axios from 'axios';
import type {
  AdminOAuthIdentityListItem,
  ApiResponse,
  OAuthExchangeRequest,
  OAuthIdentity,
  OAuthProviderConfig,
  PaginatedResponse,
  PublicOAuthProvider,
} from '@/types/api';

export interface OAuthIdentityQuery {
  page?: number;
  page_size?: number;
  provider?: string;
  platform?: string;
  keyword?: string;
}

export function getPublicOAuthProviders(params?: {
  subject_type?: 'admin' | 'user';
}) {
  return axios.get<ApiResponse<PublicOAuthProvider[]>>(
    '/api/v1/public/oauth/providers',
    { params, silentError: true }
  );
}

export function exchangeOAuthCode(data: OAuthExchangeRequest) {
  return axios.post<ApiResponse<any>>('/api/v1/public/oauth/exchange', data, {
    silentError: true,
  });
}

export function getCurrentOAuthIdentities() {
  return axios.get<ApiResponse<OAuthIdentity[]>>(
    '/api/v1/admin/auth/oauth/identities'
  );
}

export function bindOAuthIdentity(provider: string, redirectUri: string) {
  return axios.post<ApiResponse<{ authorize_url: string }>>(
    '/api/v1/admin/auth/oauth/bind',
    { provider, redirect_uri: redirectUri }
  );
}

export function unbindCurrentOAuthIdentity(id: number) {
  return axios.delete<ApiResponse<null>>(
    `/api/v1/admin/auth/oauth/identities/${id}`
  );
}

export function getAdminOAuthIdentities(params?: OAuthIdentityQuery) {
  return axios.get<ApiResponse<PaginatedResponse<AdminOAuthIdentityListItem>>>(
    '/api/v1/admin/auth/admin-oauth/identities',
    { params }
  );
}

export function deleteAdminOAuthIdentity(id: number) {
  return axios.delete<ApiResponse<null>>(
    `/api/v1/admin/auth/admin-oauth/identities/${id}`
  );
}

export function getOAuthProviderConfig(provider: string) {
  return axios.get<ApiResponse<OAuthProviderConfig>>(
    `/api/v1/admin/auth/oauth/providers/${provider}`
  );
}

export function updateOAuthProviderConfig(
  provider: string,
  data: Partial<OAuthProviderConfig> & { clear_secret?: boolean }
) {
  return axios.put<ApiResponse<OAuthProviderConfig>>(
    `/api/v1/admin/auth/oauth/providers/${provider}`,
    data
  );
}
