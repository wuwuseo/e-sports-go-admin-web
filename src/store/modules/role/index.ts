import { defineStore } from 'pinia';
import { createCrudActions } from '@/store/mixins/crud';
import {
  getRoles,
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
  enableRole,
  disableRole,
  getRoleDetail,
  saveRolePermissions,
} from '@/api/role';
import type {
  RoleResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
  RoleQuery,
  SaveRolePermissionsRequest,
} from '@/types/api';

export interface RoleState {
  items: RoleResponse[];
  total: number;
  currentItem?: RoleResponse;
  loading: boolean;
}

const useRoleStore = defineStore('role', {
  state: (): RoleState => ({
    items: [],
    total: 0,
    currentItem: undefined,
    loading: false,
  }),

  getters: {
    roles: (state) => state.items,
    currentRole: (state) => state.currentItem,
  },

  actions: {
    // ==========================================
    // 标准 CRUD 操作：从 Mixin 注入（消除约 40 行重复代码）
    // ==========================================
    ...createCrudActions<
      RoleResponse,
      CreateRoleRequest,
      UpdateRoleRequest,
      RoleQuery
    >({
      getList: getRoles,
      create: createRole,
      getDetail: getRoleDetail,
      update: updateRole,
      delete: deleteRole,
    }),

    // ==========================================
    // 别名：保持向后兼容
    // ==========================================
    fetchRoles(query?: RoleQuery) {
      return this.fetchList(query);
    },

    createRole(data: CreateRoleRequest) {
      return this.create(data);
    },

    updateRole(id: number, data: UpdateRoleRequest) {
      return this.update(id, data);
    },

    deleteRole(id: number) {
      return this.delete(id);
    },

    fetchRoleDetail(id: number) {
      return this.fetchDetail(id);
    },

    setCurrentRole(role?: RoleResponse) {
      return this.setCurrentItem(role);
    },

    // ==========================================
    // 业务特定方法
    // ==========================================
    async toggleRoleStatus(id: number, enabled: boolean) {
      if (enabled) {
        await enableRole(id);
      } else {
        await disableRole(id);
      }
    },

    async fetchAllRoles(query?: { keyword?: string; status?: string }) {
      const res = await getAllRoles(query);
      return res.data.data;
    },

    async saveRolePermissions(id: number, data: SaveRolePermissionsRequest) {
      const res = await saveRolePermissions(id, data);
      return res.data;
    },
  },
});

export default useRoleStore;
