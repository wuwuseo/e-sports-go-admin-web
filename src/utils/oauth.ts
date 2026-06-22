export const OAUTH_REDIRECT_KEY = 'oauth_redirect_path';

const DEFAULT_REDIRECT_PATH = '/dashboard/workplace';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: '用户取消授权',
  provider_disabled: '当前登录方式未启用',
  invalid_code: '授权码无效或已过期',
  identity_not_bound: '当前 GitHub 身份尚未绑定管理员账号',
  bind_failed: 'OAuth 身份绑定失败',
  exchange_failed: 'OAuth 授权交换失败',
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

export function getOAuthCallbackUrl() {
  return `${window.location.origin}/oauth/callback`;
}
