import { DEFAULT_LAYOUT } from '../base';
import { AppRouteRecordRaw } from '../types';

// 消息中心路由
const MESSAGE: AppRouteRecordRaw = {
  path: '/message',
  name: 'Message',
  component: DEFAULT_LAYOUT,
  meta: {
    locale: 'menu.message',
    icon: 'icon-message',
    requiresAuth: true,
    order: 3,
    roles: ['*'],
    permissionCode: ['/message', 'message'],
  },
  children: [
    {
      path: 'center',
      name: 'MessageCenter',
      component: () => import('@/views/message/index.vue'),
      meta: {
        locale: 'menu.message.center',
        requiresAuth: true,
        permissionCode: ['/message/center', 'messagecenter'],
      },
    },
    {
      path: 'manage',
      name: 'MessageManage',
      component: () => import('@/views/message/manage.vue'),
      meta: {
        locale: 'menu.message.manage',
        requiresAuth: true,
        permissionCode: ['/message/manage', 'messagemanage'],
      },
    },
    {
      path: 'broadcast',
      name: 'MessageBroadcast',
      component: () => import('@/views/message/broadcast.vue'),
      meta: {
        locale: 'menu.message.broadcast',
        requiresAuth: true,
        permissionCode: ['/message/broadcast', 'messagebroadcast'],
      },
    },
    {
      path: 'preference',
      name: 'MessagePreference',
      component: () => import('@/views/message/preference.vue'),
      meta: {
        locale: 'menu.message.preference',
        requiresAuth: true,
        permissionCode: ['/message/preference', 'messagepreference'],
        // 不在侧边菜单显示，仅通过消息中心右上角按钮跳转
        hideInMenu: true,
      },
    },
  ],
};

export default MESSAGE;
