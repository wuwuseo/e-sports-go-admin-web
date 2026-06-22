import { createPinia } from 'pinia';
import useAppStore from './modules/app';
import useUserStore from './modules/user';
import useTabBarStore from './modules/tab-bar';
import useRoleStore from './modules/role';
import usePermissionStore from './modules/permission';
import useUserManagementStore from './modules/user-management';
import useAdminManagementStore from './modules/admin-management';
import useMessageStore from './modules/message';
import useOAuthStore from './modules/oauth';

const pinia = createPinia();

export {
  useAppStore,
  useUserStore,
  useTabBarStore,
  useRoleStore,
  usePermissionStore,
  useUserManagementStore,
  useAdminManagementStore,
  useMessageStore,
  useOAuthStore,
};
export default pinia;
