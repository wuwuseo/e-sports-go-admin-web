const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ADMIN_LOGIN_KEY = 'is_admin_login';

const isLogin = () => {
  return !!localStorage.getItem(TOKEN_KEY);
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
