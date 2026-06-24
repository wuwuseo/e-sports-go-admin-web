// eslint-disable-next-line import/no-unresolved
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { adminLogin } from './user';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  },
}));

describe('adminLogin captcha token header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未携带 captchaToken 时不设置 X-Captcha-Token 请求头', () => {
    const data = { username: 'admin', password: 'admin' };
    adminLogin(data);

    expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/admin/public/login',
      data,
      { headers: {} }
    );
  });

  it('携带 captchaToken 时设置 X-Captcha-Token 请求头', () => {
    const data = { username: 'admin', password: 'admin' };
    adminLogin(data, 'captcha-token-abc');

    expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/admin/public/login',
      data,
      { headers: { 'X-Captcha-Token': 'captcha-token-abc' } }
    );
  });
});
