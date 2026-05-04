import { defineStore } from 'pinia';
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  enableRole,
  disableRole,
  getRoleDetail,
} from '@/api/role';
import type {
  RoleResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
  RoleQuery,
} from '@/types/api';

export interface RoleState {
  roles: RoleResponse[];
  total: number;
  currentRole?: RoleResponse;
  loading: boolean;
}

const useRoleStore = defineStore('role', {
  state: (): RoleState => ({
    roles: [],
    total: 0,
    currentRole: undefined,
    loading: false,
  }),

  actions: {
    async fetchRoles(query?: RoleQuery) {
      this.loading = true;
      try {
        const res = await getRoles(query);
        const { data } = res.data;
        this.roles = data.data;
        this.total = data.total;
      } finally {
        this.loading = false;
      }
    },

    async createRole(data: CreateRoleRequest) {
      const res = await createRole(data);
      return res.data.data;
    },

    async updateRole(id: number, data: UpdateRoleRequest) {
      const res = await updateRole(id, data);
      return res.data.data;
    },

    async deleteRole(id: number) {
      await deleteRole(id);
    },

    async toggleRoleStatus(id: number, enabled: boolean) {
      if (enabled) {
        await enableRole(id);
      } else {
        await disableRole(id);
      }
    },

    async fetchRoleDetail(id: number) {
      const res = await getRoleDetail(id);
      this.currentRole = res.data.data;
      return res.data.data;
    },

    setCurrentRole(role?: RoleResponse) {
      this.currentRole = role;
    },
  },
});

export default useRoleStore;
