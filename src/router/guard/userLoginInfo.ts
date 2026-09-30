import type { Router, LocationQueryRaw } from 'vue-router';
import NProgress from 'nprogress';

import { useAppStore, useUserStore } from '@/store';
import { isLogin, isAdminLogin } from '@/utils/auth';
import { syncSourceAppRoutes } from '@/router/source-apps';

export default function setupUserLoginInfoGuard(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    NProgress.start();
    const userStore = useUserStore();
    const appStore = useAppStore();
    const finishNavigation = () => {
      const { menus, changed } = syncSourceAppRoutes(
        router,
        userStore.permissionTree
      );
      appStore.setSourceAppMenus(menus);
      // 首次直达功能集路径时，重新匹配刚注册的页面路由。
      if (changed && router.resolve(to.fullPath).name !== to.name) {
        next({ path: to.fullPath, replace: true });
        return;
      }
      next();
    };

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

    if (to.meta?.requiresAuth === false && to.name !== 'login') {
      next();
      return;
    }

    if (isLogin()) {
      if (to.name === 'login') {
        const { redirect } = to.query;
        const redirectValue = Array.isArray(redirect) ? redirect[0] : redirect;
        next(
          redirectValue &&
            redirectValue !== 'undefined' &&
            redirectValue.startsWith('/')
            ? redirectValue
            : '/dashboard/workplace'
        );
        return;
      }

      if (userStore.role) {
        const needsReload =
          userStore.permissionCodes.length === 0 &&
          !userStore.permissionsLoading;
        if (needsReload) {
          await userStore.loadPermissions();
        }
        finishNavigation();
        return;
      }

      try {
        if (isAdminLogin()) {
          await userStore.loadAdminInfo();
        } else {
          await userStore.info();
        }
        await userStore.loadPermissions();

        if (!userStore.role) {
          redirectToLogin();
          return;
        }

        finishNavigation();
      } catch {
        redirectToLogin();
      }
      return;
    }

    if (to.name === 'login') {
      next();
      return;
    }

    redirectToLogin();
  });
}
