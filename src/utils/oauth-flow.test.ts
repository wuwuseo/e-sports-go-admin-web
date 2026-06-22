// eslint-disable-next-line import/no-unresolved
import { describe, expect, it } from 'vitest';
import shouldShowProviderLogin from './oauth-flow';

describe('oauth flow', () => {
  it('后端返回 GitHub Provider 时显示登录按钮', () => {
    expect(
      shouldShowProviderLogin({
        provider: 'github',
        display_name: 'GitHub',
      })
    ).toBe(true);
    expect(
      shouldShowProviderLogin({
        provider: 'wechat',
        display_name: '微信',
      })
    ).toBe(false);
    expect(shouldShowProviderLogin(undefined)).toBe(false);
  });
});
