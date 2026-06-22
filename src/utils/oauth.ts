export const OAUTH_REDIRECT_KEY = 'oauth_redirect_path';

const DEFAULT_REDIRECT_PATH = '/dashboard/workplace';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_provider_not_found: 'OAuth 登录方式不存在',
  oauth_provider_disabled: '当前登录方式未启用',
  oauth_config_incomplete: 'OAuth 配置不完整',
  oauth_invalid_url: 'OAuth 回调地址配置无效',
  oauth_session_invalid: 'OAuth 会话无效或已过期',
  oauth_login_code_invalid: '授权码无效或已过期',
  oauth_provider_mismatch: 'OAuth 登录方式不匹配',
  oauth_identity_already_bound: '该 GitHub 身份已绑定其他账号',
  oauth_admin_not_bound: '当前 GitHub 身份尚未绑定管理员账号',
  oauth_last_login_method: '不能解绑最后一种登录方式',
  oauth_identity_not_found: 'OAuth 身份不存在',
  oauth_account_inactive: '当前账号已停用',
  oauth_verified_email_required: 'GitHub 账号需要已验证的邮箱',
  oauth_authorization_failed: 'GitHub 授权已取消或失败',
  oauth_internal_error: 'OAuth 服务暂时不可用',
};

const PROVIDER_LABEL_MAP: Record<string, string> = {
  github: 'GitHub',
  wechat: '微信',
  qq: 'QQ',
  weibo: '微博',
};

export function isSafeRedirectPath(path?: string | null) {
  if (!path) return false;
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  return !/^[a-z][a-z\d+.-]*:/i.test(path);
}

export function normalizeOAuthRedirectPath(path?: string | null) {
  return path && isSafeRedirectPath(path) ? path : DEFAULT_REDIRECT_PATH;
}

export function saveOAuthRedirectPath(path?: string | null) {
  sessionStorage.setItem(OAUTH_REDIRECT_KEY, normalizeOAuthRedirectPath(path));
}

export function consumeOAuthRedirectPath() {
  const redirectPath = normalizeOAuthRedirectPath(
    sessionStorage.getItem(OAUTH_REDIRECT_KEY)
  );
  sessionStorage.removeItem(OAUTH_REDIRECT_KEY);
  return redirectPath;
}

export function formatOAuthErrorMessage(code?: string | null) {
  if (!code) return 'OAuth 授权失败';
  return OAUTH_ERROR_MESSAGES[code] || 'OAuth 授权失败';
}

export function getOAuthProviderLabel(provider?: string | null) {
  if (!provider) return '-';
  return PROVIDER_LABEL_MAP[provider] || provider;
}

function resolveApiUrl(
  path: string,
  origin = window.location.origin,
  apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
) {
  const baseUrl = apiBaseUrl ? new URL(apiBaseUrl, origin) : new URL(origin);
  return new URL(path, baseUrl).toString();
}

export function buildAdminOAuthAuthorizeUrl(
  provider: string,
  origin?: string,
  apiBaseUrl?: string
) {
  return resolveApiUrl(
    `/api/v1/public/oauth/admin/${encodeURIComponent(provider)}/authorize`,
    origin,
    apiBaseUrl
  );
}

export function buildOAuthProviderCallbackUrl(
  provider: string,
  origin?: string,
  apiBaseUrl?: string
) {
  return resolveApiUrl(
    `/api/v1/public/oauth/${encodeURIComponent(provider)}/callback`,
    origin,
    apiBaseUrl
  );
}

export function getOAuthCallbackUrl(origin = window.location.origin) {
  return new URL('/oauth/callback', origin).toString();
}

function firstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return firstQueryValue(value[0]);
  return typeof value === 'string' ? value : undefined;
}

export type OAuthCallbackResult =
  | { kind: 'login'; code: string }
  | { kind: 'bound' }
  | { kind: 'error'; code: string };

export function parseOAuthCallbackQuery(
  query: Record<string, unknown>
): OAuthCallbackResult {
  const status = firstQueryValue(query.oauth_status);
  const error = firstQueryValue(query.error);
  const bound = firstQueryValue(query.bound);
  const code = firstQueryValue(query.code);

  if (status === 'error' || error) {
    return { kind: 'error', code: error || 'oauth_authorization_failed' };
  }
  if (status === 'success' && bound === 'true') {
    return { kind: 'bound' };
  }
  if (status === 'success' && code) {
    return { kind: 'login', code };
  }
  return { kind: 'error', code: 'oauth_session_invalid' };
}
