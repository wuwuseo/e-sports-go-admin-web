// eslint-disable-next-line import/no-unresolved
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import {
  deleteOAuthProviderConfig,
  deleteAdminOAuthIdentity,
  exchangeOAuthCode,
  getAdminOAuthIdentities,
  unbindCurrentOAuthIdentity,
  updateOAuthProviderConfig,
} from './oauth';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  },
}));

describe('oauth api contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('仅提交后端要求的一次性 code', () => {
    exchangeOAuthCode({ code: 'one-time-code' });

    expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/public/oauth/exchange',
      { code: 'one-time-code' },
      { silentError: true }
    );
  });

  it('使用 provider 解绑当前管理员身份', () => {
    unbindCurrentOAuthIdentity('github');

    expect(axios.delete).toHaveBeenCalledWith(
      '/api/v1/admin/auth/oauth/github'
    );
  });

  it('使用后端第三方管理员接口管理全部身份', () => {
    getAdminOAuthIdentities({
      page: 1,
      page_size: 10,
      provider: 'github',
      keyword: 'admin',
    });
    deleteAdminOAuthIdentity(7);

    expect(axios.get).toHaveBeenCalledWith(
      '/api/v1/admin/auth/third-party-admins',
      {
        params: {
          page: 1,
          page_size: 10,
          provider: 'github',
          keyword: 'admin',
        },
      }
    );
    expect(axios.delete).toHaveBeenCalledWith(
      '/api/v1/admin/auth/third-party-admins/7'
    );
  });

  it('按后端字段保存和删除 Provider 配置', () => {
    const config = {
      provider: 'github',
      display_name: 'GitHub',
      client_id: 'client-id',
      client_secret: 'client-secret',
      clear_secret: false,
      callback_url:
        'https://api.example.com/api/v1/public/oauth/github/callback',
      user_redirect_url: '',
      admin_redirect_url: 'https://admin.example.com/oauth/callback',
      user_enabled: false,
      admin_enabled: true,
    };

    updateOAuthProviderConfig('github', config);
    deleteOAuthProviderConfig('github');

    expect(axios.put).toHaveBeenCalledWith(
      '/api/v1/admin/auth/oauth/providers/github',
      config
    );
    expect(axios.delete).toHaveBeenCalledWith(
      '/api/v1/admin/auth/oauth/providers/github'
    );
  });
});
