const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ADMIN_LOGIN_KEY = 'is_admin_login';

// 仅判断「本地是否存有 token」，不解析 JWT 是否过期：过期 token 也返回 true，
// 由接口 401 拦截器统一处理刷新与跳转。此前这里的 JWT 解析对结果没有任何影响。
const isLogin = () => !!localStorage.getItem(TOKEN_KEY);

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
