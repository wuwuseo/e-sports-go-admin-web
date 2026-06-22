// eslint-disable-next-line import/no-unresolved
import { describe, expect, it } from 'vitest';
import {
  buildAdminOAuthAuthorizeUrl,
  buildOAuthProviderCallbackUrl,
  formatOAuthErrorMessage,
  getOAuthProviderLabel,
  isSafeRedirectPath,
  normalizeOAuthRedirectPath,
  parseOAuthCallbackQuery,
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
    expect(formatOAuthErrorMessage('oauth_authorization_failed')).toBe(
      'GitHub 授权已取消或失败'
    );
    expect(formatOAuthErrorMessage('oauth_provider_disabled')).toBe(
      '当前登录方式未启用'
    );
    expect(formatOAuthErrorMessage('oauth_admin_not_bound')).toBe(
      '当前 GitHub 身份尚未绑定管理员账号'
    );
    expect(formatOAuthErrorMessage('unknown_code')).toBe('OAuth 授权失败');
  });

  it('动态平台名称保留未知平台并映射常见平台', () => {
    expect(getOAuthProviderLabel('github')).toBe('GitHub');
    expect(getOAuthProviderLabel('wechat')).toBe('微信');
    expect(getOAuthProviderLabel('custom_platform')).toBe('custom_platform');
  });

  it('按当前 API 根地址生成后端 OAuth URL', () => {
    expect(
      buildAdminOAuthAuthorizeUrl(
        'github',
        'https://admin.example.com',
        'https://api.example.com'
      )
    ).toBe(
      'https://api.example.com/api/v1/public/oauth/admin/github/authorize'
    );
    expect(
      buildOAuthProviderCallbackUrl('github', 'https://admin.example.com', '')
    ).toBe('https://admin.example.com/api/v1/public/oauth/github/callback');
  });

  it('区分登录、绑定成功和错误回调', () => {
    expect(
      parseOAuthCallbackQuery({
        oauth_status: 'success',
        code: 'one-time-code',
      })
    ).toEqual({ kind: 'login', code: 'one-time-code' });
    expect(
      parseOAuthCallbackQuery({
        oauth_status: 'success',
        bound: 'true',
      })
    ).toEqual({ kind: 'bound' });
    expect(
      parseOAuthCallbackQuery({
        oauth_status: 'error',
        error: 'oauth_admin_not_bound',
      })
    ).toEqual({ kind: 'error', code: 'oauth_admin_not_bound' });
  });
});
