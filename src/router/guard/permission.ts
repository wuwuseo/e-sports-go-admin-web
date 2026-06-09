import type { Router, LocationQueryRaw } from 'vue-router';
import NProgress from 'nprogress';

import { useUserStore } from '@/store';
import usePermission from '@/hooks/permission';
import { isLogin, isAdminLogin } from '@/utils/auth';
import { WHITE_LIST, NOT_FOUND } from '../constants';

export default function setupPermissionGuard(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    const userStore = useUserStore();
    const permission = usePermission();

    if (WHITE_LIST.find((el) => el.name === to.name)) {
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

    let permissionsAllow = true;

    if (to.meta?.roles && to.meta.roles.length > 0) {
      if (to.meta.roles.includes('*')) {
        permissionsAllow = true;
      } else if (!to.meta.roles.includes(userStore.role)) {
        permissionsAllow = false;
      }
    }

    if (permissionsAllow && to.meta?.requiresAuth) {
      if (to.meta?.permissionCode) {
        const permissionCode = to.meta.permissionCode as string | string[];
        if (Array.isArray(permissionCode)) {
          permissionsAllow = permission.hasAnyPermission(permissionCode);
        } else {
          permissionsAllow = permission.hasMenuPermission(permissionCode);
        }
      } else if (!(to.meta?.roles && to.meta.roles.includes('*')) && to.name) {
        permissionsAllow = permission.hasMenuPermission(to.name.toString());
      }
    }

    if (permissionsAllow) {
      next();
    } else {
      next(NOT_FOUND);
    }

    NProgress.done();
  });
}
