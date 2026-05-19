import { defineStore } from 'pinia';
import {
  getPermissions,
  getAllPermissions,
  createPermission,
  updatePermission,
  deletePermission,
  getUserPermissions,
  getUserMenuPermissions,
  getUserButtonPermissions,
  getUserApiPermissions,
} from '@/api/permission';
import type {
  PermissionResponse,
  CreatePermissionRequest,
  UpdatePermissionRequest,
  PermissionQuery,
  PermissionsAllQuery,
  PermissionTreeNode,
  PermissionCacheItem,
  PermissionType,
} from '@/types/api';

const CACHE_TTL = 5 * 60 * 1000;

export interface PermissionState {
  permissions: PermissionResponse[];
  allPermissions: PermissionResponse[];
  userPermissions: {
    menu: PermissionResponse[];
    button: PermissionResponse[];
    api: PermissionResponse[];
    all: PermissionResponse[];
  };
  total: number;
  loading: boolean;
  cache: Map<string, PermissionCacheItem>;
  permissionTree: PermissionTreeNode[];
}

const usePermissionStore = defineStore('permission', {
  state: (): PermissionState => ({
    permissions: [],
    allPermissions: [],
    userPermissions: {
      menu: [],
      button: [],
      api: [],
      all: [],
    },
    total: 0,
    loading: false,
    cache: new Map(),
    permissionTree: [],
  }),

  getters: {
    getPermissionByKey: (state) => (key: string) => {
      return state.allPermissions.find(
        (p) => `${p.object}|${p.action}|${p.type}` === key
      );
    },

    getPermissionsByObject: (state) => (object: string) => {
      return state.allPermissions.filter((p) => p.object === object);
    },

    getPermissionsByType: (state) => (type: PermissionType) => {
      return state.allPermissions.filter((p) => p.type === type);
    },

    hasPermission: (state) => (object: string, action: string) => {
      const userAllPermissions = [
        ...state.userPermissions.menu,
        ...state.userPermissions.button,
        ...state.userPermissions.api,
      ];
      return userAllPermissions.some(
        (p) => p.object === object && p.action === action
      );
    },

    permissionStatistics: (state) => {
      const api = state.allPermissions.filter((p) => p.type === 'api').length;
      const menu = state.allPermissions.filter((p) => p.type === 'menu').length;
      const button = state.allPermissions.filter(
        (p) => p.type === 'button'
      ).length;
      return { api, menu, button, total: state.allPermissions.length };
    },
  },

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

    async fetchAllPermissions(
      query?: PermissionsAllQuery,
      forceRefresh = false
    ) {
      const cacheKey = `all:${JSON.stringify(query || {})}`;
      const cached = this.cache.get(cacheKey);

      if (
        !forceRefresh &&
        cached &&
        Date.now() - cached.timestamp < CACHE_TTL
      ) {
        this.allPermissions = cached.permissions;
        return this.allPermissions;
      }

      this.loading = true;
      try {
        const { data: resData } = await getAllPermissions(query);
        this.allPermissions = resData.data || [];
        this.cache.set(cacheKey, {
          roleName: 'system',
          permissions: this.allPermissions,
          timestamp: Date.now(),
        });
        return this.allPermissions;
      } finally {
        this.loading = false;
      }
    },

    async fetchUserPermissions(domain = 'default') {
      try {
        const { data: resData } = await getUserPermissions({ domain });
        this.userPermissions.all = resData.data || [];
        return this.userPermissions.all;
      } catch (error) {
        return null;
      }
    },

    async fetchUserMenuPermissions(domain = 'default') {
      try {
        const { data: resData } = await getUserMenuPermissions({ domain });
        this.userPermissions.menu = resData.data || [];
        return this.userPermissions.menu;
      } catch (error) {
        return [];
      }
    },

    async fetchUserButtonPermissions(domain = 'default') {
      try {
        const { data: resData } = await getUserButtonPermissions({ domain });
        this.userPermissions.button = resData.data || [];
        return this.userPermissions.button;
      } catch (error) {
        return [];
      }
    },

    async fetchUserApiPermissions(domain = 'default') {
      try {
        const { data: resData } = await getUserApiPermissions({ domain });
        this.userPermissions.api = resData.data || [];
        return this.userPermissions.api;
      } catch (error) {
        return [];
      }
    },

    async createPermission(data: CreatePermissionRequest) {
      const res = await createPermission(data);
      this.clearCache();
      return res.data.data;
    },

    async updatePermission(data: UpdatePermissionRequest) {
      const res = await updatePermission(data);
      this.clearCache();
      return res.data.data;
    },

    async deletePermission(params: {
      role_name: string;
      domain: string;
      object: string;
      action: string;
    }) {
      await deletePermission(params);
      this.clearCache();
    },

    buildPermissionTree(
      permissions: PermissionResponse[],
      selectedKeys: Set<string> = new Set()
    ): PermissionTreeNode[] {
      const groupByObject = new Map<string, PermissionResponse[]>();

      permissions.forEach((p) => {
        const existing = groupByObject.get(p.object);
        if (existing) {
          existing.push(p);
        } else {
          groupByObject.set(p.object, [p]);
        }
      });

      const tree: PermissionTreeNode[] = [];

      groupByObject.forEach((perms, object) => {
        const childNodes: PermissionTreeNode[] = perms.map((p) => {
          const key = `${p.object}|${p.action}|${p.type}`;
          return {
            key,
            title: `${p.action} (${p.type})`,
            type: p.type,
            object: p.object,
            action: p.action,
            description: p.description,
            isLeaf: true,
            checked: selectedKeys.has(key),
          };
        });

        const checkedCount = childNodes.filter((n) => n.checked).length;
        const allChecked = checkedCount === childNodes.length;
        const indeterminate =
          checkedCount > 0 && checkedCount < childNodes.length;

        tree.push({
          key: object,
          title: object,
          type: childNodes[0]?.type || 'api',
          object,
          action: '*',
          children: childNodes,
          checked: allChecked,
          indeterminate,
        });
      });

      return tree.sort((a, b) => a.object.localeCompare(b.object));
    },

    getFlatKeysFromTree(tree: PermissionTreeNode[]): string[] {
      const keys: string[] = [];
      const traverse = (nodes: PermissionTreeNode[]) => {
        nodes.forEach((node) => {
          if (node.isLeaf && node.checked) {
            keys.push(node.key);
          }
          if (node.children) {
            traverse(node.children);
          }
        });
      };
      traverse(tree);
      return keys;
    },

    updateTreeCheckState(
      tree: PermissionTreeNode[],
      checkedKeys: Set<string>
    ): PermissionTreeNode[] {
      return tree.map((node) => {
        if (node.isLeaf) {
          return { ...node, checked: checkedKeys.has(node.key) };
        }

        if (node.children) {
          const updatedChildren = this.updateTreeCheckState(
            node.children,
            checkedKeys
          );
          const checkedCount = updatedChildren.filter((c) => c.checked).length;
          const allChecked = checkedCount === updatedChildren.length;
          const indeterminate =
            checkedCount > 0 && checkedCount < updatedChildren.length;

          return {
            ...node,
            children: updatedChildren,
            checked: allChecked,
            indeterminate,
          };
        }

        return node;
      });
    },

    clearCache() {
      this.cache.clear();
      this.permissionTree = [];
    },

    clearUserPermissions() {
      this.userPermissions = {
        menu: [],
        button: [],
        api: [],
        all: [],
      };
    },
  },
});

export default usePermissionStore;
