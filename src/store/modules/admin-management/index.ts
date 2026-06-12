import { defineStore } from 'pinia';
import {
  getAdmins,
  createAdmin,
  getAdminDetail,
  activateAdmin,
  deactivateAdmin,
  getAdminRoles,
  assignAdminRoles,
  updateAdmin,
} from '@/api/user';
import type {
  AdminResponse,
  AdminDetailResponse,
  CreateAdminRequest,
  UpdateAdminRequest,
  AdminQuery,
  AssignUserRolesRequest,
  RoleResponse,
} from '@/types/api';

export interface AdminManagementState {
  items: AdminResponse[];
  total: number;
  currentItem?: AdminDetailResponse;
  loading: boolean;
}

const useAdminManagementStore = defineStore('adminManagement', {
  state: (): AdminManagementState => ({
    items: [],
    total: 0,
    currentItem: undefined,
    loading: false,
  }),

  getters: {
    admins: (state) => state.items,
    currentAdmin: (state) => state.currentItem,
  },

  actions: {
    // 获取管理员列表
    async fetchList(query?: AdminQuery) {
      this.loading = true;
      try {
        const res = await getAdmins(query);
        const { data } = res.data;
        this.items = data.data;
        this.total = data.total;
      } finally {
        this.loading = false;
      }
    },

    // 获取管理员详情
    async fetchDetail(id: number) {
      const res = await getAdminDetail(id);
      this.currentItem = res.data.data;
      return res.data.data;
    },

    // 设置当前管理员
    setCurrentItem(item?: AdminDetailResponse) {
      this.currentItem = item;
    },

    // 创建管理员
    async create(data: CreateAdminRequest) {
      const res = await createAdmin(data);
      return res.data.data;
    },

    // 对外暴露的方法别名
    fetchAdmins(query?: AdminQuery) {
      return this.fetchList(query);
    },

    createAdmin(data: CreateAdminRequest) {
      return this.create(data);
    },

    fetchAdminDetail(id: number) {
      return this.fetchDetail(id);
    },

    setCurrentAdmin(admin?: AdminDetailResponse) {
      return this.setCurrentItem(admin);
    },

    async activateAdmin(id: number) {
      await activateAdmin(id);
    },

    async deactivateAdmin(id: number) {
      await deactivateAdmin(id);
    },

    async fetchAdminRoles(id: number): Promise<RoleResponse[]> {
      const res = await getAdminRoles(id);
      // 后端返回结构为 { roles: RoleResponse[], primary_role_id, primary_role }，
      // 这里只对外暴露角色列表，避免上层调用 .filter/.map 时出错
      const data = res.data.data as unknown as
        | RoleResponse[]
        | { roles?: RoleResponse[] };
      if (Array.isArray(data)) {
        return data;
      }
      return data?.roles ?? [];
    },

    async assignAdminRoles(id: number, data: AssignUserRolesRequest) {
      await assignAdminRoles(id, data);
    },

    async updateAdmin(id: number, data: UpdateAdminRequest) {
      const res = await updateAdmin(id, data);
      return res.data.data;
    },
  },
});

export default useAdminManagementStore;
