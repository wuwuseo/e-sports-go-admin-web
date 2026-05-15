import type { Router } from 'vue-router';
import NProgress from 'nprogress';

import { useUserStore } from '@/store';
import usePermission from '@/hooks/permission';
import { WHITE_LIST, NOT_FOUND } from '../constants';

export default function setupPermissionGuard(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    const userStore = useUserStore();
    const permission = usePermission();

    // 白名单路由直接放行
    if (WHITE_LIST.find((el) => el.name === to.name)) {
      next();
      return;
    }

    // 等待权限加载完成（避免竞态条件）
    if (userStore.permissionsLoading) {
      // 使用轮询等待权限加载完成，最多等待 3 秒
      const maxWaitTime = 3000;
      const startTime = Date.now();
      while (
        userStore.permissionsLoading &&
        Date.now() - startTime < maxWaitTime
      ) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 100);
        });
      }
    }

    // admin 用户拥有所有权限，直接放行
    if (userStore.role === 'admin') {
      next();
      return;
    }

    // 检查路由权限
    let permissionsAllow = true;

    // 1. 首先检查基于角色的权限
    if (to.meta?.roles && to.meta.roles.length > 0) {
      // 如果角色包含 '*'，表示所有角色都可以访问，直接放行
      if (to.meta.roles.includes('*')) {
        permissionsAllow = true;
      } else if (!to.meta.roles.includes(userStore.role)) {
        permissionsAllow = false;
      }
    }

    // 2. 只有角色权限通过，且路由没有配置 '*' 角色时，才检查权限码
    // 注意：如果 roles: ['*']，表示对所有用户开放，不需要额外检查权限码
    if (
      permissionsAllow &&
      to.meta?.requiresAuth &&
      !(to.meta?.roles && to.meta.roles.includes('*'))
    ) {
      if (to.meta?.permissionCode) {
        const permissionCode = to.meta.permissionCode as string | string[];
        if (Array.isArray(permissionCode)) {
          permissionsAllow = permission.hasAnyPermission(permissionCode);
        } else {
          permissionsAllow = permission.hasMenuPermission(permissionCode);
        }
      } else if (to.name) {
        // 如果没有配置 permissionCode，使用路由的 name 作为权限标识
        permissionsAllow = permission.hasMenuPermission(to.name.toString());
      }
    }

    if (permissionsAllow) {
      next();
    } else {
      // 无权限，跳转到 404 或 403 页面
      next(NOT_FOUND);
    }

    NProgress.done();
  });
}
