import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

const SYSTEM: AppRouteRecordRaw = {
  path: '/system',
  name: 'System',
  component: DEFAULT_LAYOUT,
  meta: {
    locale: 'menu.system',
    icon: 'icon-settings',
    requiresAuth: true,
    order: 2,
    roles: ['*'],
    permissionCode: ['/system', 'unknown'],
  },
  children: [
    {
      path: 'user',
      name: 'SystemUser',
      component: () => import('@/views/system/user/index.vue'),
      meta: {
        locale: 'menu.system.user',
        requiresAuth: true,
        permissionCode: ['/system/user', 'user'],
      },
    },
    {
      path: 'third-party-user',
      name: 'SystemThirdPartyUser',
      component: () => import('@/views/system/third-party-user/index.vue'),
      meta: {
        locale: 'menu.system.thirdPartyUser',
        requiresAuth: true,
        permissionCode: ['/system/third-party-user', 'thirdpartyuser'],
      },
    },
    {
      path: 'role',
      name: 'SystemRole',
      component: () => import('@/views/system/role/index.vue'),
      meta: {
        locale: 'menu.system.role',
        requiresAuth: true,
        permissionCode: ['/system/role', 'role'],
      },
    },
    {
      path: 'permission',
      name: 'SystemPermission',
      component: () => import('@/views/system/permission/index.vue'),
      meta: {
        locale: 'menu.system.permission',
        requiresAuth: true,
        permissionCode: ['/system/permission', 'permission'],
      },
    },
    {
      path: 'department',
      name: 'SystemDepartment',
      component: () => import('@/views/system/department/index.vue'),
      meta: {
        locale: 'menu.system.department',
        requiresAuth: true,
        permissionCode: ['/system/department', 'department'],
      },
    },
    {
      path: 'attachment',
      name: 'SystemAttachment',
      component: () => import('@/views/system/attachment/index.vue'),
      meta: {
        locale: 'menu.system.attachment',
        requiresAuth: true,
        permissionCode: ['/system/attachment', 'attachment'],
      },
    },
    {
      path: 'cron-job',
      name: 'SystemCronJob',
      component: () => import('@/views/system/cron-job/index.vue'),
      meta: {
        locale: 'menu.system.cronJob',
        requiresAuth: true,
        permissionCode: ['/system/cron-job', 'cronjob'],
      },
    },
    {
      path: 'operation-log',
      name: 'SystemOperationLog',
      component: () => import('@/views/system/operation-log/index.vue'),
      meta: {
        locale: 'menu.system.operationLog',
        requiresAuth: true,
        permissionCode: ['/system/operation-log', 'operationlog'],
      },
    },
    {
      path: 'dict-data',
      name: 'SystemDictData',
      component: () => import('@/views/system/dict-data/index.vue'),
      meta: {
        locale: 'menu.system.dict',
        requiresAuth: true,
        permissionCode: ['/system/dict-data', 'dictdata'],
      },
    },
    {
      path: 'admin',
      name: 'SystemAdmin',
      component: () => import('@/views/system/admin/index.vue'),
      meta: {
        locale: 'menu.system.admin',
        requiresAuth: true,
        permissionCode: ['/system/admin', 'admin'],
      },
    },
    {
      path: 'config',
      name: 'SystemConfig',
      component: () => import('@/views/system/config/index.vue'),
      meta: {
        locale: 'menu.system.config',
        requiresAuth: true,
        permissionCode: ['/system/config', 'config'],
      },
    },
    {
      path: 'plugin',
      name: 'SystemPlugin',
      component: () => import('@/views/system/plugin/index.vue'),
      meta: {
        locale: 'menu.system.plugin',
        requiresAuth: true,
        permissionCode: ['/system/plugin', 'plugin'],
      },
    },
  ],
};

export default SYSTEM;
