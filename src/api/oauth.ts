import axios from 'axios';
import type {
  AdminOAuthIdentityListItem,
  ApiResponse,
  OAuthExchangeRequest,
  OAuthIdentity,
  OAuthProviderConfig,
  OAuthProviderConfigInput,
  PaginatedResponse,
  PublicOAuthProvider,
  TokenResponse,
} from '@/types/api';

export interface OAuthIdentityQuery {
  page?: number;
  page_size?: number;
  provider?: string;
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
  return axios.post<ApiResponse<TokenResponse>>(
    '/api/v1/public/oauth/exchange',
    data,
    {
      silentError: true,
    }
  );
}

export function getCurrentOAuthIdentities() {
  return axios.get<ApiResponse<OAuthIdentity[]>>(
    '/api/v1/admin/auth/oauth/identities'
  );
}

export function unbindCurrentOAuthIdentity(provider: string) {
  return axios.delete<ApiResponse<null>>(
    `/api/v1/admin/auth/oauth/${provider}`
  );
}

export function getAdminOAuthIdentities(params?: OAuthIdentityQuery) {
  return axios.get<ApiResponse<PaginatedResponse<AdminOAuthIdentityListItem>>>(
    '/api/v1/admin/auth/third-party-admins',
    { params }
  );
}

export function deleteAdminOAuthIdentity(id: number) {
  return axios.delete<ApiResponse<null>>(
    `/api/v1/admin/auth/third-party-admins/${id}`
  );
}

export function getOAuthProviderConfig(provider: string) {
  return axios.get<ApiResponse<OAuthProviderConfig>>(
    `/api/v1/admin/auth/oauth/providers/${provider}`,
    { silentError: true }
  );
}

export function updateOAuthProviderConfig(
  provider: string,
  data: OAuthProviderConfigInput
) {
  return axios.put<ApiResponse<OAuthProviderConfig>>(
    `/api/v1/admin/auth/oauth/providers/${provider}`,
    data
  );
}

export function deleteOAuthProviderConfig(provider: string) {
  return axios.delete<ApiResponse<null>>(
    `/api/v1/admin/auth/oauth/providers/${provider}`
  );
}
