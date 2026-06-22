// eslint-disable-next-line import/no-unresolved
import { describe, expect, it } from 'vitest';
import {
  formatOAuthErrorMessage,
  getOAuthProviderLabel,
  isSafeRedirectPath,
  normalizeOAuthRedirectPath,
} from './oauth';

describe('oauth utils', () => {
  it('只允许站内相对回跳地址', () => {
    expect(isSafeRedirectPath('/dashboard/workplace')).toBe(true);
    expect(isSafeRedirectPath('/system/admin?tab=oauth')).toBe(true);
    expect(isSafeRedirectPath('https://example.com')).toBe(false);
    expect(isSafeRedirectPath('//example.com')).toBe(false);
    const scriptUrl = ['java', 'script:alert(1)'].join('');
    expect(isSafeRedirectPath(scriptUrl)).toBe(false);
  });

  it('非法回跳地址会归一到默认工作台', () => {
    expect(normalizeOAuthRedirectPath('/system/config')).toBe('/system/config');
    expect(normalizeOAuthRedirectPath('https://example.com')).toBe(
      '/dashboard/workplace'
    );
    expect(normalizeOAuthRedirectPath(undefined)).toBe('/dashboard/workplace');
  });

  it('将 OAuth 错误码映射为友好提示', () => {
    expect(formatOAuthErrorMessage('access_denied')).toBe('用户取消授权');
    expect(formatOAuthErrorMessage('provider_disabled')).toBe(
      '当前登录方式未启用'
    );
    expect(formatOAuthErrorMessage('unknown_code')).toBe('OAuth 授权失败');
  });

  it('动态平台名称保留未知平台并映射常见平台', () => {
    expect(getOAuthProviderLabel('github')).toBe('GitHub');
    expect(getOAuthProviderLabel('wechat')).toBe('微信');
    expect(getOAuthProviderLabel('custom_platform')).toBe('custom_platform');
  });
});
