import { defineStore } from 'pinia';
import {
  login as userLogin,
  logout as userLogout,
  getCurrentUser,
  getUserMenuPermissions,
  getUserButtonPermissions,
} from '@/api/user';
import type { LoginRequest } from '@/types/api';
import {
  setToken,
  clearToken,
  setRefreshToken,
  clearRefreshToken,
} from '@/utils/auth';
import { removeRouteListener } from '@/utils/route-listener';
import { UserState } from './types';
import useAppStore from '../app';

const useUserStore = defineStore('user', {
  state: (): UserState => ({
    name: undefined,
    avatar: undefined,
    job: undefined,
    organization: undefined,
    location: undefined,
    email: undefined,
    introduction: undefined,
    personalWebsite: undefined,
    jobName: undefined,
    organizationName: undefined,
    locationName: undefined,
    phone: undefined,
    registrationDate: undefined,
    accountId: undefined,
    certification: undefined,
    role: '',
    menuPermissions: [],
    buttonPermissions: [],
    permissionsLoading: false,
  }),

  getters: {
    userInfo(state: UserState): UserState {
      return { ...state };
    },

    // 检查是否有指定的菜单权限
    hasMenuPermission:
      (state: UserState) =>
      (permissionCode: string): boolean => {
        // admin 角色拥有所有权限
        if (state.role === 'admin') {
          return true;
        }
        return state.menuPermissions.includes(permissionCode);
      },

    // 检查是否有指定的按钮权限
    hasButtonPermission:
      (state: UserState) =>
      (permissionCode: string): boolean => {
        // admin 角色拥有所有权限
        if (state.role === 'admin') {
          return true;
        }
        return state.buttonPermissions.includes(permissionCode);
      },

    // 检查是否有任意一个权限
    hasAnyPermission:
      (state: UserState) =>
      (permissions: string[]): boolean => {
        // admin 角色拥有所有权限
        if (state.role === 'admin') {
          return true;
        }
        const allPermissions = [
          ...state.menuPermissions,
          ...state.buttonPermissions,
        ];
        return permissions.some((p) => allPermissions.includes(p));
      },

    // 检查是否拥有所有指定的权限
    hasAllPermissions:
      (state: UserState) =>
      (permissions: string[]): boolean => {
        // admin 角色拥有所有权限
        if (state.role === 'admin') {
          return true;
        }
        const allPermissions = [
          ...state.menuPermissions,
          ...state.buttonPermissions,
        ];
        return permissions.every((p) => allPermissions.includes(p));
      },
  },

  actions: {
    switchRoles() {
      return new Promise((resolve) => {
        this.role = this.role === 'user' ? 'admin' : 'user';
        resolve(this.role);
      });
    },
    // Set user's information
    setInfo(partial: Partial<UserState>) {
      this.$patch(partial);
    },

    // Reset user's information
    resetInfo() {
      this.$reset();
    },

    // Get user's information
    async info() {
      const res = await getCurrentUser();
      const userData = res.data.data;

      // 处理角色：如果 roles 数组中包含 admin，则设置为 admin
      // 否则取第一个角色（如果有），否则默认为空（由调用方兜底）
      if (userData.roles && Array.isArray(userData.roles)) {
        // 大小写不敏感匹配 admin 角色
        const isAdmin = userData.roles.some(
          (r: string) => r.toLowerCase() === 'admin'
        );
        if (isAdmin) {
          userData.role = 'admin';
        } else if (userData.roles.length > 0) {
          // eslint-disable-next-line prefer-destructuring
          userData.role = userData.roles[0];
        } else {
          userData.role = '';
        }
      } else {
        userData.role = '';
      }

      this.setInfo(userData);
    },

    // 加载用户权限（菜单权限 + 按钮权限）
    async loadPermissions() {
      this.permissionsLoading = true;
      try {
        const [menuRes, buttonRes] = await Promise.all([
          getUserMenuPermissions({ domain: 'default' }),
          getUserButtonPermissions({ domain: 'default' }),
        ]);

        // 提取权限码
        this.menuPermissions = menuRes.data.data?.map((p) => p.object) || [];
        this.buttonPermissions =
          buttonRes.data.data?.map((p) => p.object) || [];
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('加载用户权限失败:', error);
        // 加载失败时重置权限列表，但不抛出异常（不影响登录）
        this.menuPermissions = [];
        this.buttonPermissions = [];
      } finally {
        this.permissionsLoading = false;
      }
    },

    // 刷新用户权限
    async refreshPermissions() {
      await this.loadPermissions();
    },

    // 清除用户权限
    clearPermissions() {
      this.menuPermissions = [];
      this.buttonPermissions = [];
      this.permissionsLoading = false;
    },

    // Login
    async login(loginForm: LoginRequest) {
      try {
        const res = await userLogin(loginForm);
        const tokenData = res.data.data; // TokenResponse
        setToken(tokenData.access_token);
        setRefreshToken(tokenData.refresh_token);

        // 登录成功后加载用户信息和权限
        // 使用 try-catch 确保即使加载失败也能正常登录
        try {
          await this.info();
        } catch (infoErr) {
          // eslint-disable-next-line no-console
          console.error('加载用户信息失败，使用默认角色:', infoErr);
          // 设置默认角色，确保能正常使用系统
          this.setInfo({ role: 'admin' });
        }

        // 加载权限（不抛出异常，不影响登录流程）
        await this.loadPermissions();
      } catch (err) {
        clearToken();
        clearRefreshToken();
        throw err;
      }
    },

    logoutCallBack() {
      const appStore = useAppStore();
      this.resetInfo();
      this.clearPermissions();
      clearToken();
      clearRefreshToken();
      removeRouteListener();
      appStore.clearServerMenu();
    },

    // Logout
    async logout() {
      try {
        await userLogout();
      } finally {
        this.logoutCallBack();
      }
    },
  },
});

export default useUserStore;
