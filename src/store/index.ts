import { createPinia } from 'pinia';
import useAppStore from './modules/app';
import useUserStore from './modules/user';
import useTabBarStore from './modules/tab-bar';
import useRoleStore from './modules/role';
import usePermissionStore from './modules/permission';

const pinia = createPinia();

export {
  useAppStore,
  useUserStore,
  useTabBarStore,
  useRoleStore,
  usePermissionStore,
};
export default pinia;
