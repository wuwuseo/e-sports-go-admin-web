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
  },
  children: [
    {
      path: 'user',
      name: 'SystemUser',
      component: () => import('@/views/system/user/index.vue'),
      meta: {
        locale: 'menu.system.user',
        requiresAuth: true,
      },
    },
    {
      path: 'third-party-user',
      name: 'SystemThirdPartyUser',
      component: () => import('@/views/system/third-party-user/index.vue'),
      meta: {
        locale: 'menu.system.thirdPartyUser',
        requiresAuth: true,
      },
    },
    {
      path: 'role',
      name: 'SystemRole',
      component: () => import('@/views/system/role/index.vue'),
      meta: {
        locale: 'menu.system.role',
        requiresAuth: true,
      },
    },
    {
      path: 'permission',
      name: 'SystemPermission',
      component: () => import('@/views/system/permission/index.vue'),
      meta: {
        locale: 'menu.system.permission',
        requiresAuth: true,
      },
    },
    {
      path: 'attachment',
      name: 'SystemAttachment',
      component: () => import('@/views/system/attachment/index.vue'),
      meta: {
        locale: 'menu.system.attachment',
        requiresAuth: true,
      },
    },
    {
      path: 'cron-job',
      name: 'SystemCronJob',
      component: () => import('@/views/system/cron-job/index.vue'),
      meta: {
        locale: 'menu.system.cronJob',
        requiresAuth: true,
      },
    },
    {
      path: 'operation-log',
      name: 'SystemOperationLog',
      component: () => import('@/views/system/operation-log/index.vue'),
      meta: {
        locale: 'menu.system.operationLog',
        requiresAuth: true,
      },
    },
    {
      path: 'dict-data',
      name: 'SystemDictData',
      component: () => import('@/views/system/dict-data/index.vue'),
      meta: {
        locale: 'menu.system.dict',
        requiresAuth: true,
      },
    },
    {
      path: 'admin',
      name: 'SystemAdmin',
      component: () => import('@/views/system/admin/index.vue'),
      meta: {
        locale: 'menu.system.admin',
        requiresAuth: true,
      },
    },
    {
      path: 'config',
      name: 'SystemConfig',
      component: () => import('@/views/system/config/index.vue'),
      meta: {
        locale: 'menu.system.config',
        requiresAuth: true,
      },
    },
  ],
};

export default SYSTEM;
