import { Notification } from '@arco-design/web-vue';
import type { NotificationReturn } from '@arco-design/web-vue/es/notification/interface';
import type { RouteRecordNormalized } from 'vue-router';
import { getUserPermissions } from '@/api/permission';
import PermissionTransformer from '@/utils/permission-transformer';
import { transformToMenuRoutes } from '@/utils/permission-to-route';

/**
 * 拉取用户菜单权限并构建服务端菜单路由
 *
 * 路由构建依赖布局组件（DEFAULT_LAYOUT → default-layout.vue），
 * 必须留在 router 层：放进 store 会形成 store ↔ layout 的循环依赖。
 * 失败时返回 null，由调用方决定是否更新菜单。
 */
export default async function fetchServerMenuRoutes(): Promise<
  RouteRecordNormalized[] | null
> {
  let notifyInstance: NotificationReturn | null = null;
  try {
    notifyInstance = Notification.info({
      id: 'menuNotice', // Keep the instance id the same
      content: 'loading',
      closable: true,
    });
    const { data } = await getUserPermissions();
    const permissions = PermissionTransformer.normalizePermissions(data.data);
    const menuPermissions = permissions.filter(
      (permission) => permission.type === 'menu'
    );
    // 将用户菜单权限数据传入，实现权限过滤：只有在权限中的路径才会被加载
    const menuRoutes = transformToMenuRoutes(menuPermissions, menuPermissions);
    notifyInstance = Notification.success({
      id: 'menuNotice',
      content: 'success',
      closable: true,
    });
    return menuRoutes;
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    notifyInstance = Notification.error({
      id: 'menuNotice',
      content: 'error',
      closable: true,
    });
    return null;
  }
}
