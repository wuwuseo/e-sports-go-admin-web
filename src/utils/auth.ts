const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ADMIN_LOGIN_KEY = 'is_admin_login';

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '='
  );
  return atob(padded);
};

const isTokenValid = (token: string | null) => {
  if (!token) return false;

  try {
    const payload = JSON.parse(decodeBase64Url(token.split('.')[1] || ''));
    if (typeof payload.exp !== 'number') {
      return false;
    }
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

const isLogin = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  // 优先使用 JWT 校验（解析 exp 过期时间）
  if (isTokenValid(token)) {
    return true;
  }
  // 容错：如果 token 存在但非 JWT 格式（如纯随机字符串），也视为已登录
  // 因为 token 刚由登录 API 设置，不应立即判为无效
  return !!token;
};

const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

const setRefreshToken = (token: string) => {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

const clearRefreshToken = () => {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

const isAdminLogin = () => {
  return localStorage.getItem(ADMIN_LOGIN_KEY) === '1';
};

const setAdminLogin = (value: boolean) => {
  if (value) {
    localStorage.setItem(ADMIN_LOGIN_KEY, '1');
  } else {
    localStorage.removeItem(ADMIN_LOGIN_KEY);
  }
};

export {
  isLogin,
  getToken,
  setToken,
  clearToken,
  getRefreshToken,
  setRefreshToken,
  clearRefreshToken,
  isAdminLogin,
  setAdminLogin,
};
