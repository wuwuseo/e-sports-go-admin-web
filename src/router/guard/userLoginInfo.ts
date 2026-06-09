import type { Router, LocationQueryRaw } from 'vue-router';
import NProgress from 'nprogress';

import { useUserStore } from '@/store';
import { isLogin, isAdminLogin } from '@/utils/auth';

export default function setupUserLoginInfoGuard(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    NProgress.start();
    const userStore = useUserStore();

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
        next();
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

        next();
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
