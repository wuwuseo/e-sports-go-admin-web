import { computed } from 'vue';
import { RouteRecordRaw, RouteRecordNormalized } from 'vue-router';
import usePermission from '@/hooks/permission';
import { useAppStore } from '@/store';
import appClientMenus from '@/router/app-menus';
import { cloneDeep } from 'lodash';

export default function useMenuTree() {
  const permission = usePermission();
  const appStore = useAppStore();
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
      // 1. 首先检查基于角色的权限
      if (!permission.accessRouter(route)) {
        return false;
      }

      // 2. 检查基于权限码的权限
      if (route.meta?.permissionCode) {
        const permissionCode = route.meta.permissionCode as string | string[];
        if (Array.isArray(permissionCode)) {
          return permission.hasAnyPermission(permissionCode);
        }
        return permission.hasMenuPermission(permissionCode);
      }

      // 3. 默认允许访问
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
