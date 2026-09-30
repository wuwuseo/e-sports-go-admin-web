import type { Component } from 'vue';
import type { RouteRecordRaw, Router } from 'vue-router';
import type { SysPermissionTreeNode } from '@/types/api';
import { DEFAULT_LAYOUT } from './routes/base';

type PageLoader = () => Promise<{ default: Component }>;

// 组件标识只解析为构建时已收录的本地页面，不执行服务端提供的代码。
const appPages = import.meta.glob('../apps/*/views/**/*.vue') as Record<
  string,
  PageLoader
>;
const reservedCodes = new Set([
  'admin',
  'public',
  'user',
  'plugin',
  'attachments',
  'auth',
]);

interface MenuEntry {
  node: SysPermissionTreeNode;
  appCode: string;
  page?: PageLoader;
  menu: RouteRecordRaw;
}

export interface SourceAppRouteSet {
  routes: RouteRecordRaw[];
  menus: RouteRecordRaw[];
}

function flattenPermissions(
  nodes: SysPermissionTreeNode[]
): SysPermissionTreeNode[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenPermissions(node.children || []),
  ]);
}

function getAppCode(node: SysPermissionTreeNode): string | null {
  const code = node.code.split(':')[0];
  if (!/^[a-z][a-z0-9]*$/.test(code) || reservedCodes.has(code)) {
    return null;
  }
  if (!node.code.startsWith(`${code}:`)) {
    return null;
  }
  if (
    !new RegExp(`^/${code}(?:/[a-z0-9][a-z0-9-]*)*$`).test(node.menu_path || '')
  ) {
    return null;
  }
  return code;
}

function resolvePage(
  component: string,
  appCode: string,
  pages: Record<string, PageLoader>
): PageLoader | undefined {
  const segments = component.split('/');
  if (
    segments[0] !== appCode ||
    segments.length < 2 ||
    !segments.slice(1).every((segment) => /^[a-z0-9][a-z0-9-]*$/.test(segment))
  ) {
    return undefined;
  }
  return pages[`../apps/${appCode}/views/${segments.slice(1).join('/')}.vue`];
}

function sortMenus(menus: RouteRecordRaw[]): RouteRecordRaw[] {
  menus.sort((a, b) => (a.meta?.order || 0) - (b.meta?.order || 0));
  menus.forEach((menu) => {
    if (menu.children) sortMenus(menu.children);
  });
  return menus;
}

export function buildSourceAppRoutes(
  tree: SysPermissionTreeNode[],
  pages: Record<string, PageLoader> = appPages
): SourceAppRouteSet {
  const entries = new Map<number, MenuEntry>();
  const paths = new Set<string>();

  flattenPermissions(tree).forEach((node) => {
    if (node.type !== 'menu' || node.status !== 1) return;
    const appCode = getAppCode(node);
    if (!appCode || paths.has(node.menu_path || '')) return;

    const page = node.component
      ? resolvePage(node.component, appCode, pages)
      : undefined;
    if (node.component && !page) return;

    paths.add(node.menu_path || '');
    const menu: RouteRecordRaw = {
      path: node.menu_path as string,
      name: page ? `SourceApp:${node.code}` : `SourceAppMenu:${node.code}`,
      component: page,
      meta: {
        locale: `menu.app.${node.code.replace(/:/g, '.')}`,
        icon: /^icon-[a-z0-9-]+$/.test(node.icon || '') ? node.icon : undefined,
        order: node.sort_order,
        requiresAuth: true,
        permissionCode: node.menu_path,
      },
      children: [],
    };
    entries.set(node.id, { node, appCode, page, menu });
  });

  const roots: RouteRecordRaw[] = [];
  const grouped = new Map<string, RouteRecordRaw[]>();
  entries.forEach((entry) => {
    const { node, appCode, page, menu } = entry;
    const parent = entries.get(node.parent_id || 0);
    if (parent?.appCode === appCode) {
      parent.menu.children?.push(menu);
    } else {
      roots.push(menu);
    }

    if (page) {
      const childPath = (node.menu_path || '').slice(appCode.length + 1);
      const routes = grouped.get(appCode) || [];
      routes.push({
        path: childPath.replace(/^\//, ''),
        name: `SourceApp:${node.code}`,
        component: page,
        meta: {
          locale: `menu.app.${node.code.replace(/:/g, '.')}`,
          requiresAuth: true,
          permissionCode: node.menu_path,
        },
      });
      grouped.set(appCode, routes);
    }
  });

  const keepMenu = (menu: RouteRecordRaw): boolean => {
    menu.children = (menu.children || []).filter(keepMenu);
    return Boolean(menu.component || menu.children.length);
  };

  const routes: RouteRecordRaw[] = Array.from(grouped, ([code, children]) => ({
    path: `/${code}`,
    name: `SourceAppLayout:${code}`,
    component: DEFAULT_LAYOUT,
    meta: { requiresAuth: true },
    children,
  }));

  return { routes, menus: sortMenus(roots.filter(keepMenu)) };
}

let routeRemovers: Array<() => void> = [];
let activeSignature = '';
let activeMenus: RouteRecordRaw[] = [];
let activeRouter: Router | null = null;

export function clearSourceAppRoutes() {
  routeRemovers.forEach((remove) => remove());
  routeRemovers = [];
  activeSignature = '';
  activeMenus = [];
}

export function syncSourceAppRoutes(
  router: Router,
  tree: SysPermissionTreeNode[]
): { menus: RouteRecordRaw[]; changed: boolean } {
  activeRouter = router;
  const signature = JSON.stringify(tree);
  if (signature === activeSignature) {
    return { menus: activeMenus, changed: false };
  }

  clearSourceAppRoutes();
  const { routes, menus } = buildSourceAppRoutes(tree);
  const existingPaths = new Set(router.getRoutes().map((route) => route.path));
  const availableRoutes = routes.filter((route) => {
    const paths = [
      route.path,
      ...(route.children || []).map((child) =>
        `${route.path}/${child.path}`.replace(/\/+$/, '')
      ),
    ];
    return !paths.some((path) => existingPaths.has(path));
  });
  availableRoutes.forEach((route) => {
    routeRemovers.push(router.addRoute(route));
  });
  const availableCodes = new Set(
    availableRoutes.map((route) => route.path.slice(1))
  );
  const availableMenus = menus.filter((menu) =>
    availableCodes.has(menu.path.split('/')[1])
  );
  activeSignature = signature;
  activeMenus = availableMenus;
  return { menus: availableMenus, changed: true };
}

export function refreshSourceAppRoutes(tree: SysPermissionTreeNode[]) {
  return activeRouter ? syncSourceAppRoutes(activeRouter, tree) : null;
}
