import type { RouteRecordNormalized } from 'vue-router';
import type { PermissionResponse } from '@/types/api';
import { DEFAULT_LAYOUT } from '@/router/routes/base';

// 权限对象到路由路径的映射
const OBJECT_TO_PATH_MAP: Record<
  string,
  { path: string; name: string; component?: any }
> = {
  'system': {
    path: '/system',
    name: 'System',
  },
  'system:user': {
    path: '/system/user',
    name: 'SystemUser',
    component: () => import('@/views/system/user/index.vue'),
  },
  'system:role': {
    path: '/system/role',
    name: 'SystemRole',
    component: () => import('@/views/system/role/index.vue'),
  },
  'system:permission': {
    path: '/system/permission',
    name: 'SystemPermission',
    component: () => import('@/views/system/permission/index.vue'),
  },
  'system:attachment': {
    path: '/system/attachment',
    name: 'SystemAttachment',
    component: () => import('@/views/system/attachment/index.vue'),
  },
  'system:cron-job': {
    path: '/system/cron-job',
    name: 'SystemCronJob',
    component: () => import('@/views/system/cron-job/index.vue'),
  },
  'system:operation-log': {
    path: '/system/operation-log',
    name: 'SystemOperationLog',
    component: () => import('@/views/system/operation-log/index.vue'),
  },
  'system:dict-data': {
    path: '/system/dict-data',
    name: 'SystemDictData',
    component: () => import('@/views/system/dict-data/index.vue'),
  },
  'system:config': {
    path: '/system/config',
    name: 'SystemConfig',
    component: () => import('@/views/system/config/index.vue'),
  },
  'dashboard': {
    path: '/dashboard',
    name: 'Dashboard',
  },
  'dashboard:workplace': {
    path: '/dashboard/workplace',
    name: 'Workplace',
    component: () => import('@/views/dashboard/workplace/index.vue'),
  },
};

// 父级路由映射
const PARENT_ROUTE_MAP: Record<
  string,
  { path: string; name: string; locale: string; icon: string }
> = {
  system: {
    path: '/system',
    name: 'System',
    locale: 'menu.system',
    icon: 'icon-settings',
  },
  dashboard: {
    path: '/dashboard',
    name: 'Dashboard',
    locale: 'menu.dashboard',
    icon: 'icon-dashboard',
  },
};

/**
 * 检查路径是否在用户权限中
 * @param path 路由路径
 * @param userMenuPermissions 用户菜单权限列表
 * @returns 是否有权限
 */
function hasPathInPermissions(
  path: string,
  userMenuPermissions: PermissionResponse[]
): boolean {
  return userMenuPermissions.some((perm) => {
    // 1. 精确匹配：权限对象就是路由路径
    if (perm.object === path) {
      return true;
    }

    // 2. 从权限映射中查找对应的路径
    const pathConfig = OBJECT_TO_PATH_MAP[perm.object];
    if (pathConfig && pathConfig.path === path) {
      return true;
    }

    // 3. 前缀匹配：父级路径
    if (perm.object && path.startsWith(perm.object.replace(/:/g, '/'))) {
      return true;
    }

    return false;
  });
}

/**
 * 将权限数据转换为路由记录数组
 * 只有在用户权限中的路径才会被加载
 * @param permissions 权限响应数组
 * @param userMenuPermissions 用户的菜单权限列表（用于过滤）
 * @returns 格式化后的路由记录数组
 */
export function transformPermissionsToRoutes(
  permissions: PermissionResponse[],
  userMenuPermissions?: PermissionResponse[]
): RouteRecordNormalized[] {
  // 按模块分组权限
  const moduleMap = new Map<string, PermissionResponse[]>();

  permissions.forEach((perm) => {
    // 只处理菜单类型的权限
    if (perm.type !== 'menu') {
      return;
    }

    // 提取模块名（例如：system:user -> system）
    const moduleKey = perm.object.split(':')[0];
    const modulePermissions = moduleMap.get(moduleKey);
    if (modulePermissions) {
      modulePermissions.push(perm);
    } else {
      moduleMap.set(moduleKey, [perm]);
    }
  });

  const routes: RouteRecordNormalized[] = [];

  moduleMap.forEach((modulePermissions, moduleKey) => {
    const parentConfig = PARENT_ROUTE_MAP[moduleKey];
    if (!parentConfig) {
      return;
    }

    // 如果提供了用户权限列表，则检查父级路径是否有权限
    if (
      userMenuPermissions &&
      userMenuPermissions.length > 0 &&
      !hasPathInPermissions(parentConfig.path, userMenuPermissions)
    ) {
      return;
    }

    // 构建子路由：只处理有component且有权限的配置
    const children: RouteRecordNormalized[] = modulePermissions
      .filter((perm) => {
        const pathConfig = OBJECT_TO_PATH_MAP[perm.object];
        if (!pathConfig || !pathConfig.component) {
          return false;
        }

        // 如果提供了用户权限列表，则检查子路径是否有权限
        if (
          userMenuPermissions &&
          userMenuPermissions.length > 0 &&
          !hasPathInPermissions(pathConfig.path, userMenuPermissions)
        ) {
          return false;
        }

        return true;
      })
      .map((perm) => {
        const pathConfig = OBJECT_TO_PATH_MAP[perm.object];
        const childPath = pathConfig.path.replace(`${parentConfig.path}/`, '');

        return {
          path: childPath,
          name: pathConfig.name,
          component: pathConfig.component,
          meta: {
            locale: `menu.${perm.object.replace(/:/g, '.')}`,
            requiresAuth: true,
            roles: [perm.role_name],
            permissionCode: perm.object,
          },
        } as unknown as RouteRecordNormalized;
      });

    if (children.length > 0) {
      // 构建父路由
      const parentRoute = {
        path: parentConfig.path,
        name: parentConfig.name,
        component: DEFAULT_LAYOUT,
        meta: {
          locale: parentConfig.locale,
          icon: parentConfig.icon,
          requiresAuth: true,
          order: moduleKey === 'dashboard' ? 0 : 1,
          roles: ['*'],
        },
        children,
      } as unknown as RouteRecordNormalized;

      routes.push(parentRoute);
    }
  });

  return routes;
}

/**
 * 将权限列表转换为菜单结构（简化版本）
 * @param permissions 权限响应数组
 * @param userMenuPermissions 用户的菜单权限列表（用于过滤）
 * @returns 格式化后的路由记录数组
 */
export function transformToMenuRoutes(
  permissions: PermissionResponse[],
  userMenuPermissions?: PermissionResponse[]
): RouteRecordNormalized[] {
  return transformPermissionsToRoutes(permissions, userMenuPermissions);
}

/**
 * 权限路径匹配工具函数
 * @param path 要检查的路径
 * @param userMenuPermissions 用户菜单权限列表
 * @returns 是否匹配
 */
export function isPathPermitted(
  path: string,
  userMenuPermissions: PermissionResponse[]
): boolean {
  return hasPathInPermissions(path, userMenuPermissions);
}
