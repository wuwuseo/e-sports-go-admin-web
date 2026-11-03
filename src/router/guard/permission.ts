import type { Router, LocationQueryRaw } from 'vue-router';
import NProgress from 'nprogress';

import { useUserStore } from '@/store';
import usePermission from '@/hooks/permission';
import { isLogin, isAdminLogin } from '@/utils/auth';
import { DEFAULT_ROUTE, WHITE_LIST, NOT_FOUND } from '../constants';
import { canAccessRoute, findLoginFallback } from '../route-access';

export default function setupPermissionGuard(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    const userStore = useUserStore();
    const permission = usePermission();

    if (
      WHITE_LIST.find((el) => el.name === to.name) ||
      to.meta?.requiresAuth === false
    ) {
      next();
      return;
    }

    const redirectToLogin = () => {
      userStore.logoutCallBack();
      next({
        name: 'login',
        query: {
          redirect: to.fullPath,
          ...to.query,
        } as LocationQueryRaw,
      });
    };

    if (!isLogin()) {
      redirectToLogin();
      return;
    }

    if (userStore.permissionsLoading) {
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
      if (userStore.permissionsLoading) {
        await userStore.loadPermissions();
      }
    }

    if (!userStore.role) {
      try {
        if (isAdminLogin()) {
          await userStore.loadAdminInfo();
        } else {
          await userStore.info();
        }
        await userStore.loadPermissions();
      } catch {
        redirectToLogin();
        return;
      }
    }

    if (userStore.role === 'admin') {
      next();
      return;
    }

    const access = { role: userStore.role, ...permission };
    const permissionsAllow = canAccessRoute(to, access);

    if (permissionsAllow) {
      next();
    } else if (to.path === DEFAULT_ROUTE.fullPath) {
      const path = findLoginFallback(router, access);
      next(path ? { path, replace: true } : NOT_FOUND);
    } else {
      next(NOT_FOUND);
    }

    NProgress.done();
  });
}
