import type { Router } from 'vue-router';
import NProgress from 'nprogress';

import { useUserStore } from '@/store';
import { WHITE_LIST, NOT_FOUND } from '../constants';

export default function setupPermissionGuard(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    const userStore = useUserStore();

    // 白名单路由直接放行
    if (WHITE_LIST.find((el) => el.name === to.name)) {
      next();
      return;
    }

    // 检查路由权限
    let permissionsAllow = true;

    // 1. 首先检查基于角色的权限
    if (to.meta?.roles && to.meta.roles.length > 0) {
      // 如果是 ['*'] 表示所有角色都可以访问，直接放行
      if (to.meta.roles.includes('*')) {
        permissionsAllow = true;
      }
      // 如果用户是 admin 则直接放行
      else if (
        userStore.role !== 'admin' &&
        !to.meta.roles.includes(userStore.role)
      ) {
        permissionsAllow = false;
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
