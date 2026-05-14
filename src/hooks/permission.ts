import { RouteLocationNormalized, RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/store';

export default function usePermission() {
  const userStore = useUserStore();

  return {
    // 检查是否可以访问路由（基于角色）
    accessRouter(route: RouteLocationNormalized | RouteRecordRaw) {
      return (
        !route.meta?.requiresAuth ||
        !route.meta?.roles ||
        route.meta?.roles?.includes('*') ||
        route.meta?.roles?.includes(userStore.role)
      );
    },

    // 查找第一个有权限访问的路由
    findFirstPermissionRoute(_routers: any, role = 'admin') {
      const cloneRouters = [..._routers];
      while (cloneRouters.length) {
        const firstElement = cloneRouters.shift();
        if (
          firstElement?.meta?.roles?.find((el: string[]) => {
            return el.includes('*') || el.includes(role);
          })
        )
          return { name: firstElement.name };
        if (firstElement?.children) {
          cloneRouters.push(...firstElement.children);
        }
      }
      return null;
    },

    // 检查是否有指定的菜单权限
    hasMenuPermission(permissionCode: string): boolean {
      return userStore.hasMenuPermission(permissionCode);
    },

    // 检查是否有指定的按钮权限
    hasButtonPermission(permissionCode: string): boolean {
      return userStore.hasButtonPermission(permissionCode);
    },

    // 检查是否有任意一个权限
    hasAnyPermission(permissions: string[]): boolean {
      return userStore.hasAnyPermission(permissions);
    },

    // 检查是否拥有所有指定的权限
    hasAllPermissions(permissions: string[]): boolean {
      return userStore.hasAllPermissions(permissions);
    },

    // 刷新用户权限
    async refreshPermissions() {
      await userStore.refreshPermissions();
    },
  };
}
