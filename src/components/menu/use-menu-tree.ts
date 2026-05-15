import { computed } from 'vue';
import { RouteRecordRaw, RouteRecordNormalized } from 'vue-router';
import usePermission from '@/hooks/permission';
import { useAppStore, useUserStore } from '@/store';
import appClientMenus from '@/router/app-menus';
import { cloneDeep } from 'lodash';

export default function useMenuTree() {
  const permission = usePermission();
  const appStore = useAppStore();
  const userStore = useUserStore();
  const appRoute = computed(() => {
    if (appStore.menuFromServer) {
      return appStore.appAsyncMenus;
    }
    return appClientMenus;
  });

  const menuTree = computed(() => {
    const copyRouter = cloneDeep(appRoute.value) as RouteRecordNormalized[];
    copyRouter.sort((a: RouteRecordNormalized, b: RouteRecordNormalized) => {
      return (a.meta.order || 0) - (b.meta.order || 0);
    });

    // 检查菜单项是否有权限访问
    function canAccessMenu(route: RouteRecordRaw): boolean {
      // 1. admin 用户拥有所有权限，直接通过
      if (userStore.role === 'admin') {
        return true;
      }

      // 2. 检查基于角色的权限
      if (!permission.accessRouter(route)) {
        return false;
      }

      // 3. 检查基于权限码的权限
      // 注意：如果 roles: ['*']，表示对所有用户开放，不需要额外检查权限码
      if (route.meta?.roles?.includes('*')) {
        return true;
      }

      // 4. 检查基于权限码的权限
      if (route.meta?.permissionCode) {
        const permissionCode = route.meta.permissionCode as string | string[];
        if (Array.isArray(permissionCode)) {
          return permission.hasAnyPermission(permissionCode);
        }
        return permission.hasMenuPermission(permissionCode);
      }

      // 5. 对于需要登录但没有配置 permissionCode 的菜单
      // 检查是否有该菜单路径对应的权限（使用路由 name 作为权限标识）
      if (route.meta?.requiresAuth && route.name) {
        return permission.hasMenuPermission(route.name.toString());
      }

      // 6. 其他情况默认允许访问
      return true;
    }

    function travel(_routes: RouteRecordRaw[], layer: number) {
      if (!_routes) return null;

      const collector: any = _routes.map((element) => {
        // 检查是否有权限访问
        if (!canAccessMenu(element)) {
          return null;
        }

        // leaf node
        if (element.meta?.hideChildrenInMenu || !element.children) {
          element.children = [];
          return element;
        }

        // route filter hideInMenu true
        element.children = element.children.filter(
          (x) => x.meta?.hideInMenu !== true
        );

        // 过滤子菜单权限
        const filteredChildren = element.children.filter((child) =>
          canAccessMenu(child)
        );

        // Associated child node
        const subItem = travel(filteredChildren, layer + 1);

        if (subItem && subItem.length) {
          element.children = subItem;
          return element;
        }
        // the else logic
        if (layer > 1) {
          element.children = subItem || [];
          return element;
        }

        if (element.meta?.hideInMenu === false) {
          return element;
        }

        return null;
      });
      return collector.filter(Boolean);
    }

    return travel(copyRouter, 0);
  });

  return {
    menuTree,
  };
}
