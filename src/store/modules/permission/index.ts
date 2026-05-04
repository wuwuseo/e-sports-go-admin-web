import { defineStore } from 'pinia';
import {
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission,
} from '@/api/permission';
import type {
  PermissionResponse,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  PermissionQuery,
} from '@/types/api';

export interface PermissionState {
  permissions: PermissionResponse[];
  total: number;
  loading: boolean;
}

const usePermissionStore = defineStore('permission', {
  state: (): PermissionState => ({
    permissions: [],
    total: 0,
    loading: false,
  }),

  actions: {
    async fetchPermissions(query?: PermissionQuery) {
      this.loading = true;
      try {
        const { data: resData } = await getPermissions(query);
        const { data: items, total } = resData.data;
        this.permissions = items || [];
        this.total = total || 0;
      } finally {
        this.loading = false;
      }
    },

    async createPermission(data: CreatePermissionRequest) {
      const res = await createPermission(data);
      return res.data.data;
    },

    async updatePermission(data: UpdatePermissionRequest) {
      const res = await updatePermission(data);
      return res.data.data;
    },

    async deletePermission(id: number) {
      await deletePermission({ id });
    },
  },
});

export default usePermissionStore;
