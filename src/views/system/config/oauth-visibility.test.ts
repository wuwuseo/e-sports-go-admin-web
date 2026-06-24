// eslint-disable-next-line import/no-unresolved
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('OAuth 配置入口', () => {
  it('admin 角色可以看到 OAuth 配置标签', () => {
    const source = readFileSync(resolve(__dirname, 'index.vue'), 'utf8');

    expect(source).toContain(
      "userStore.isSuperAdmin || userStore.role === 'admin'"
    );
  });
});
