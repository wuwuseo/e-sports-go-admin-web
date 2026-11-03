import type { RouteMeta, RouteRecordName, Router } from 'vue-router';
import { DEFAULT_ROUTE } from './constants';

interface RouteAccess {
  role: string;
  hasMenuPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
}

export function canAccessRoute(
  route: { name?: RouteRecordName | null; meta: RouteMeta },
  access: RouteAccess
): boolean {
  if (access.role === 'admin') return true;
  const { meta } = route;
  if (
    meta.roles?.length &&
    !meta.roles.includes('*') &&
    !meta.roles.includes(access.role)
  ) {
    return false;
  }
  if (!meta.requiresAuth) return true;
  if (Array.isArray(meta.permissionCode)) {
    return access.hasAnyPermission(meta.permissionCode);
  }
  if (meta.permissionCode) {
    return access.hasMenuPermission(meta.permissionCode);
  }
  return (
    Boolean(meta.roles?.includes('*')) ||
    !route.name ||
    access.hasMenuPermission(String(route.name))
  );
}

// 默认仪表盘不可访问时，从已经注册、通过相同权限判断的页面中选择落点。
export function findLoginFallback(router: Router, access: RouteAccess) {
  const preferred = [DEFAULT_ROUTE.fullPath, '/esports/cs'];
  const rank = (path: string) => {
    const index = preferred.indexOf(path);
    return index < 0 ? preferred.length : index;
  };
  const candidates = router
    .getRoutes()
    .filter(
      (route) =>
        route.meta.requiresAuth &&
        !route.meta.hideInMenu &&
        !route.redirect &&
        route.children.length === 0 &&
        !route.path.includes(':')
    )
    .sort(
      (a, b) =>
        rank(a.path) - rank(b.path) ||
        (a.meta.order || 0) - (b.meta.order || 0) ||
        a.path.localeCompare(b.path)
    );
  return candidates.find((route) =>
    canAccessRoute(router.resolve(route.path), access)
  )?.path;
}
