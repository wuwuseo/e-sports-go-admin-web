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
  },
  children: [
    {
      path: 'center',
      name: 'MessageCenter',
      component: () => import('@/views/message/index.vue'),
      meta: {
        locale: 'menu.message.center',
        requiresAuth: true,
      },
    },
    {
      path: 'broadcast',
      name: 'MessageBroadcast',
      component: () => import('@/views/message/broadcast.vue'),
      meta: {
        locale: 'menu.message.broadcast',
        requiresAuth: true,
      },
    },
    {
      path: 'preference',
      name: 'MessagePreference',
      component: () => import('@/views/message/preference.vue'),
      meta: {
        locale: 'menu.message.preference',
        requiresAuth: true,
        // 不在侧边菜单显示，仅通过消息中心右上角按钮跳转
        hideInMenu: true,
      },
    },
  ],
};

export default MESSAGE;
