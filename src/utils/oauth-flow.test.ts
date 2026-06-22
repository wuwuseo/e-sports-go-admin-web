// eslint-disable-next-line import/no-unresolved
import { describe, expect, it } from 'vitest';
import shouldShowProviderLogin from './oauth-flow';

describe('oauth flow', () => {
  it('仅在管理员 GitHub Provider 启用时显示登录按钮', () => {
    expect(
      shouldShowProviderLogin({
        provider: 'github',
        enabled: true,
        subject_type: 'admin',
      })
    ).toBe(true);
    expect(
      shouldShowProviderLogin({
        provider: 'github',
        enabled: false,
        subject_type: 'admin',
      })
    ).toBe(false);
    expect(
      shouldShowProviderLogin({
        provider: 'github',
        enabled: true,
        subject_type: 'user',
      })
    ).toBe(false);
  });
});
