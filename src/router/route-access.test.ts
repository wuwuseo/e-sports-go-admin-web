import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { canAccessRoute, findLoginFallback } from './route-access';

const component = {};
const menuAccess = (codes: string[], role = 'cs_admin') => ({
  role,
  hasMenuPermission: (code: string) => codes.includes(code),
  hasAnyPermission: (values: string[]) =>
    values.some((code) => codes.includes(code)),
});

function routerWithDashboard() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/dashboard/workplace',
        name: 'Workplace',
        component,
        meta: {
          requiresAuth: true,
          roles: ['*'],
          permissionCode: '/dashboard/workplace',
        },
      },
      { path: '/login', name: 'login', component },
      { path: '/:pathMatch(.*)*', name: 'notFound', component },
    ],
  });
}

describe('登录后的可访问页面', () => {
  it('客服无仪表盘权限时选择刚注册的客服工作台', () => {
    const router = routerWithDashboard();
    const access = menuAccess(['/esports/cs']);
    expect(findLoginFallback(router, access)).toBeUndefined();
    router.addRoute({
      path: '/esports',
      component,
      meta: { requiresAuth: true },
      children: [
        {
          path: 'cs',
          name: 'SourceApp:esports:cs:menu',
          component,
          meta: { requiresAuth: true, permissionCode: '/esports/cs' },
        },
      ],
    });
    expect(findLoginFallback(router, access)).toBe('/esports/cs');
    expect(canAccessRoute(router.resolve('/dashboard/workplace'), access)).toBe(
      false
    );
  });

  it('普通管理员和超级管理员继续优先进入仪表盘', () => {
    const router = routerWithDashboard();
    expect(
      findLoginFallback(
        router,
        menuAccess(['/dashboard/workplace'], 'normal_admin')
      )
    ).toBe('/dashboard/workplace');
    expect(findLoginFallback(router, menuAccess([], 'admin'))).toBe(
      '/dashboard/workplace'
    );
  });

  it('只读角色选择页面，跳过目录、隐藏页和带参数的详情页', () => {
    const router = routerWithDashboard();
    const access = menuAccess(['/esports/pages/home'], 'cs_readonly');
    router.addRoute({
      path: '/esports/pages/home',
      name: 'PageDesigner',
      component,
      meta: { requiresAuth: true, permissionCode: '/esports/pages/home' },
    });
    router.addRoute({
      path: '/hidden',
      component,
      meta: { requiresAuth: true, roles: ['*'], hideInMenu: true, order: -2 },
    });
    router.addRoute({
      path: '/details/:id',
      component,
      meta: { requiresAuth: true, roles: ['*'], order: -1 },
    });
    expect(findLoginFallback(router, access)).toBe('/esports/pages/home');
  });

  it('保留数组权限别名、单个菜单权限和角色限制的判定', () => {
    const access = menuAccess(['cronjob'], 'test');
    expect(
      canAccessRoute(
        {
          name: 'SystemCronJob',
          meta: {
            requiresAuth: true,
            permissionCode: ['/system/cron-job', 'cronjob'],
          },
        },
        access
      )
    ).toBe(true);
    expect(
      canAccessRoute(
        {
          name: 'SystemAdmin',
          meta: { requiresAuth: true, permissionCode: '/system/admin' },
        },
        access
      )
    ).toBe(false);
    expect(
      canAccessRoute(
        {
          name: 'Restricted',
          meta: { requiresAuth: true, roles: ['finance_admin'] },
        },
        access
      )
    ).toBe(false);
  });
});
