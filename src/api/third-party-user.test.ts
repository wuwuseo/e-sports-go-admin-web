// eslint-disable-next-line import/no-unresolved
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { getThirdPartyUsers, unbindThirdPartyUser } from './user';

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  },
}));

describe('third-party user api contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('使用 platform 查询并按身份 ID 解绑', () => {
    const params = {
      page: 2,
      page_size: 20,
      platform: 'wechat',
      keyword: 'demo',
    };

    getThirdPartyUsers(params);
    unbindThirdPartyUser(9);

    expect(axios.get).toHaveBeenCalledWith(
      '/api/v1/admin/auth/third-party-users',
      { params }
    );
    expect(axios.delete).toHaveBeenCalledWith(
      '/api/v1/admin/auth/third-party-users/9'
    );
  });
});
