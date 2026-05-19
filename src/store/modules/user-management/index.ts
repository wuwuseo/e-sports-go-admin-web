import { defineStore } from 'pinia';
import { createCrudActions } from '@/store/mixins/crud';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserDetail,
  activateUser,
  deactivateUser,
  addUserToBlacklist,
  removeUserFromBlacklist,
  getBlacklist,
  getUserRoles,
  assignUserRoles,
  getThirdPartyUsers,
  unbindThirdPartyUser,
  exportUsers,
} from '@/api/user';
import type {
  UserResponse,
  UserDetailResponse,
  CreateUserRequest,
  UpdateUserRequest,
  UserQuery,
  BlacklistResponse,
  BlacklistUserRequest,
  AssignUserRolesRequest,
  RoleResponse,
  ThirdPartyUserResponse,
  ThirdPartyUserQuery,
} from '@/types/api';

export interface UserManagementState {
  items: UserResponse[];
  total: number;
  currentItem?: UserDetailResponse;
  loading: boolean;
  blacklist: BlacklistResponse[];
  blacklistTotal: number;
  thirdPartyUsers: ThirdPartyUserResponse[];
  thirdPartyTotal: number;
  userRoles: RoleResponse[];
}

const useUserManagementStore = defineStore('userManagement', {
  state: (): UserManagementState => ({
    items: [],
    total: 0,
    currentItem: undefined,
    loading: false,
    blacklist: [],
    blacklistTotal: 0,
    thirdPartyUsers: [],
    thirdPartyTotal: 0,
    userRoles: [],
  }),

  getters: {
    users: (state) => state.items,
    currentUser: (state) => state.currentItem,
    blacklistItems: (state) => state.blacklist,
    thirdPartyUserItems: (state) => state.thirdPartyUsers,
  },

  actions: {
    ...createCrudActions<
      UserResponse,
      CreateUserRequest,
      UpdateUserRequest,
      UserQuery
    >({
      getList: getUsers,
      create: createUser,
      getDetail: getUserDetail,
      update: updateUser,
      delete: deleteUser,
    }),

    fetchUsers(query?: UserQuery) {
      return this.fetchList(query);
    },

    createUser(data: CreateUserRequest) {
      return this.create(data);
    },

    updateUser(id: number, data: UpdateUserRequest) {
      return this.update(id, data);
    },

    deleteUser(id: number) {
      return this.delete(id);
    },

    fetchUserDetail(id: number) {
      return this.fetchDetail(id);
    },

    setCurrentUser(user?: UserDetailResponse) {
      return this.setCurrentItem(user);
    },

    async activateUser(id: number) {
      await activateUser(id);
    },

    async deactivateUser(id: number) {
      await deactivateUser(id);
    },

    async addToBlacklist(id: number, data?: BlacklistUserRequest) {
      await addUserToBlacklist(id, data);
    },

    async removeFromBlacklist(id: number) {
      await removeUserFromBlacklist(id);
    },

    async fetchBlacklist(query?: UserQuery) {
      this.loading = true;
      try {
        const res = await getBlacklist(query);
        this.blacklist = res.data.data.data;
        this.blacklistTotal = res.data.data.total;
      } finally {
        this.loading = false;
      }
    },

    async fetchUserRoles(id: number) {
      const res = await getUserRoles(id);
      this.userRoles = res.data.data;
      return res.data.data;
    },

    async assignUserRoles(id: number, data: AssignUserRolesRequest) {
      await assignUserRoles(id, data);
    },

    async fetchThirdPartyUsers(query?: ThirdPartyUserQuery) {
      this.loading = true;
      try {
        const res = await getThirdPartyUsers(query);
        this.thirdPartyUsers = res.data.data.data;
        this.thirdPartyTotal = res.data.data.total;
      } finally {
        this.loading = false;
      }
    },

    async unbindThirdPartyUser(id: number) {
      await unbindThirdPartyUser(id);
    },

    async exportUsers(query?: UserQuery) {
      const res = await exportUsers(query);
      return res.data;
    },
  },
});

export default useUserManagementStore;
