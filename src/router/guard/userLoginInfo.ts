import type { Router, LocationQueryRaw } from 'vue-router';
import NProgress from 'nprogress'; // progress bar

import { useUserStore } from '@/store';
import { isLogin, isAdminLogin } from '@/utils/auth';

export default function setupUserLoginInfoGuard(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    NProgress.start();
    const userStore = useUserStore();

    if (isLogin()) {
      // 已登录，如果是登录页，直接跳转到首页
      if (to.name === 'login') {
        next('/dashboard/workplace');
        return;
      }

      // 检查是否有用户角色信息
      if (userStore.role) {
        // 有角色信息，检查是否已加载权限（同时检查菜单和按钮权限）
        const needsReload =
          userStore.menuPermissions.length === 0 &&
          userStore.buttonPermissions.length === 0 &&
          !userStore.permissionsLoading;
        if (needsReload) {
          try {
            // 权限未加载，尝试加载权限
            await userStore.loadPermissions();
          } catch {
            // 静默处理加载失败
          }
        }
        // 正常放行
        next();
      } else {
        try {
          // 根据登录类型获取对应的用户/管理员信息
          if (isAdminLogin()) {
            await userStore.loadAdminInfo();
          } else {
            await userStore.info();
          }
          // 同时加载用户权限
          await userStore.loadPermissions();

          // 防御性检查：确保角色不为空（与登录表单逻辑保持一致）
          if (!userStore.role) {
            userStore.setInfo({ role: 'admin' });
          }

          next();
        } catch {
          // 获取用户信息失败，使用默认角色继续（避免无限重定向）
          userStore.setInfo({ role: 'admin' });
          next();
        }
      }
    } else {
      // 未登录
      if (to.name === 'login') {
        next();
        return;
      }
      // 跳转到登录页，使用 fullPath 作为 redirect（确保能正确跳转回来）
      next({
        name: 'login',
        query: {
          redirect: to.fullPath,
          ...to.query,
        } as LocationQueryRaw,
      });
    }
  });
}
