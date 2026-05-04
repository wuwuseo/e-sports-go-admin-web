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
  },
  children: [
    {
      path: 'role',
      name: 'SystemRole',
      component: () => import('@/views/system/role/index.vue'),
      meta: {
        locale: 'menu.system.role',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'permission',
      name: 'SystemPermission',
      component: () => import('@/views/system/permission/index.vue'),
      meta: {
        locale: 'menu.system.permission',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'attachment',
      name: 'SystemAttachment',
      component: () => import('@/views/system/attachment/index.vue'),
      meta: {
        locale: 'menu.system.attachment',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'cron-job',
      name: 'SystemCronJob',
      component: () => import('@/views/system/cron-job/index.vue'),
      meta: {
        locale: 'menu.system.cronJob',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'operation-log',
      name: 'SystemOperationLog',
      component: () => import('@/views/system/operation-log/index.vue'),
      meta: {
        locale: 'menu.system.operationLog',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'dict-data',
      name: 'SystemDictData',
      component: () => import('@/views/system/dict-data/index.vue'),
      meta: {
        locale: 'menu.system.dict',
        requiresAuth: true,
        roles: ['*'],
      },
    },
    {
      path: 'config',
      name: 'SystemConfig',
      component: () => import('@/views/system/config/index.vue'),
      meta: {
        locale: 'menu.system.config',
        requiresAuth: true,
        roles: ['*'],
      },
    },
  ],
};

export default SYSTEM;
