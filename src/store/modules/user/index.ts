import { defineStore } from 'pinia';
import {
  login as userLogin,
  logout as userLogout,
  getCurrentUser,
  getUserMenuPermissions,
  getUserButtonPermissions,
  adminLogin,
  adminLogout as adminLogoutApi,
  getCurrentAdmin,
} from '@/api/user';
import type { LoginRequest, AdminLoginRequest } from '@/types/api';
import {
  setToken,
  clearToken,
  setRefreshToken,
  clearRefreshToken,
  setAdminLogin,
} from '@/utils/auth';
import { removeRouteListener } from '@/utils/route-listener';
import PermissionTransformer from '@/utils/permission-transformer';
import type { RoleType } from './types';
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
    isAdmin: false,
    isSuperAdmin: false,
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
      const apiData = res.data.data;

      // 构建要设置的用户信息，映射 API 字段到 store 字段
      const userInfo: Partial<UserState> = {
        name: apiData.username,
        email: apiData.email,
        phone: apiData.phone,
        avatar: apiData.avatar,
        accountId: String(apiData.id),
      };

      // 处理角色：如果 roles 数组中包含 admin，则设置为 admin
      // 否则取第一个角色（如果有），否则默认为空（由调用方兜底）
      if (
        apiData.roles &&
        Array.isArray(apiData.roles) &&
        apiData.roles.length > 0
      ) {
        const isAdminRole = apiData.roles.some(
          (r: string) => r.toLowerCase() === 'admin'
        );
        userInfo.role = (isAdminRole ? 'admin' : apiData.roles[0]) as RoleType;
      } else {
        userInfo.role = '';
      }

      this.setInfo(userInfo);
    },

    // 加载用户权限（菜单权限 + 按钮权限）
    async loadPermissions() {
      this.permissionsLoading = true;
      try {
        const [menuRes, buttonRes] = await Promise.all([
          getUserMenuPermissions({ domain: 'default' }),
          getUserButtonPermissions({ domain: 'default' }),
        ]);

        this.menuPermissions = PermissionTransformer.extractPermissionCodes(
          menuRes.data.data
        );
        this.buttonPermissions = PermissionTransformer.extractPermissionCodes(
          buttonRes.data.data
        );
      } catch {
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
        setAdminLogin(false);

        // 登录成功后加载用户信息和权限
        // 使用 try-catch 确保即使加载失败也能正常登录
        try {
          await this.info();
        } catch {
          // 设置默认角色，确保能正常使用系统
          this.setInfo({ role: 'admin' });
        }

        // 加载权限（不抛出异常，不影响登录流程）
        await this.loadPermissions();
      } catch (err) {
        clearToken();
        clearRefreshToken();
        setAdminLogin(false);
        throw err;
      }
    },

    logoutCallBack() {
      const appStore = useAppStore();
      this.resetInfo();
      this.clearPermissions();
      clearToken();
      clearRefreshToken();
      setAdminLogin(false);
      removeRouteListener();
      appStore.clearServerMenu();
      // 登出时断开 SSE 长连接，避免无效鉴权请求
      // 使用动态 import 避免循环依赖
      import('@/services/sse.service').then((mod) => {
        mod.default.disconnect();
      });
      import('@/store/modules/message').then((mod) => {
        try {
          mod.default().reset();
        } catch {
          // pinia 未初始化时忽略
        }
      });
    },

    // Logout
    async logout() {
      try {
        await userLogout();
      } finally {
        this.logoutCallBack();
      }
    },

    // 管理员登录
    async adminLogin(loginForm: AdminLoginRequest) {
      try {
        const res = await adminLogin(loginForm);
        const tokenData = res.data.data;
        setToken(tokenData.access_token);
        setRefreshToken(tokenData.refresh_token);
        setAdminLogin(true);

        // 登录成功后加载管理员信息和权限
        try {
          await this.loadAdminInfo();
        } catch {
          // 设置默认角色，确保能正常使用系统
          this.setInfo({ role: 'admin', isAdmin: true });
        }

        // 加载权限（不抛出异常，不影响登录流程）
        await this.loadPermissions();
      } catch (err) {
        clearToken();
        clearRefreshToken();
        setAdminLogin(false);
        throw err;
      }
    },

    // 加载管理员信息
    async loadAdminInfo() {
      const res = await getCurrentAdmin();
      const apiData = res.data.data;

      // 构建要设置的管理员信息
      const adminInfo: Partial<UserState> = {
        name: apiData.username,
        email: apiData.email,
        phone: apiData.phone,
        avatar: apiData.avatar,
        accountId: String(apiData.id),
        isAdmin: true,
        isSuperAdmin: apiData.is_super_admin,
      };

      // 处理角色
      if (
        apiData.roles &&
        Array.isArray(apiData.roles) &&
        apiData.roles.length > 0
      ) {
        const isAdminRole = apiData.roles.some(
          (r: string) => r.toLowerCase() === 'admin'
        );
        adminInfo.role = (isAdminRole ? 'admin' : apiData.roles[0]) as RoleType;
      } else {
        adminInfo.role = 'admin';
      }

      this.setInfo(adminInfo);
    },

    // 管理员登出
    async adminLogout() {
      try {
        await adminLogoutApi();
      } finally {
        this.logoutCallBack();
      }
    },
  },
});

export default useUserStore;
