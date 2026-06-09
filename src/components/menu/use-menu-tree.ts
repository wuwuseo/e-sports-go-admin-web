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

        if (element.meta?.hideChildrenInMenu || !element.children) {
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
