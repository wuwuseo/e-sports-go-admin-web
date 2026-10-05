import { computed } from 'vue';
import { RouteRecordRaw } from 'vue-router';
import usePermission from '@/hooks/permission';
import { useAppStore, useUserStore } from '@/store';
import appClientMenus from '@/router/app-menus';
import { cloneDeep } from 'lodash';

export default function useMenuTree() {
  const permission = usePermission();
  const appStore = useAppStore();
  const userStore = useUserStore();
  const appRoute = computed(() => {
    const baseMenus = appStore.menuFromServer
      ? appStore.appAsyncMenus
      : appClientMenus;
    return [...baseMenus, ...appStore.sourceAppMenus];
  });

  const menuTree = computed(() => {
    const copyRouter = cloneDeep(appRoute.value) as RouteRecordRaw[];
    copyRouter.sort((a: RouteRecordRaw, b: RouteRecordRaw) => {
      return (a.meta?.order || 0) - (b.meta?.order || 0);
    });

    function canAccessMenu(route: RouteRecordRaw): boolean {
      if (userStore.role === 'admin') {
        return true;
      }

      if (!permission.accessRouter(route)) {
        return false;
      }

      if (route.meta?.permissionCode) {
        const permissionCode = route.meta.permissionCode as string | string[];
        if (Array.isArray(permissionCode)) {
          return permission.hasAnyPermission(permissionCode);
        }
        return permission.hasMenuPermission(permissionCode);
      }

      if (route.meta?.roles?.includes('*')) {
        return true;
      }

      if (route.meta?.requiresAuth && route.name) {
        return permission.hasMenuPermission(route.name.toString());
      }

      return true;
    }

    function travel(_routes: RouteRecordRaw[], layer: number) {
      if (!_routes) return null;

      const collector: any = _routes.map((element) => {
        const selfAccessible = canAccessMenu(element);

        // 源码功能集的菜单节点可能携带空 children 数组（单页应用或末级菜单），
        // 需与没有 children 的叶子节点同样处理，否则会被下面的层级判断丢弃。
        if (element.meta?.hideChildrenInMenu || !element.children?.length) {
          if (!selfAccessible) {
            return null;
          }
          element.children = [];
          return element;
        }

        element.children = element.children.filter(
          (x) => x.meta?.hideInMenu !== true
        );

        const subItem = travel(element.children, layer + 1);

        if (subItem && subItem.length) {
          element.children = subItem;
          return element;
        }

        if (selfAccessible && layer > 1) {
          element.children = subItem || [];
          return element;
        }

        if (selfAccessible && element.meta?.hideInMenu === false) {
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
