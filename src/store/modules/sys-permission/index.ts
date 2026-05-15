import { defineStore } from 'pinia';
import { createCrudActions } from '@/store/mixins/crud';
import {
  getSysPermissions,
  getSysPermissionTree,
  createSysPermission,
  updateSysPermission,
  deleteSysPermission,
} from '@/api/sys-permission';
import type {
  SysPermissionResponse,
  SysPermissionTreeNode,
  CreateSysPermissionRequest,
  UpdateSysPermissionRequest,
  SysPermissionQuery,
} from '@/types/api';

export interface SysPermissionState {
  items: SysPermissionResponse[];
  permissionTree: SysPermissionTreeNode[];
  total: number;
  loading: boolean;
}

const useSysPermissionStore = defineStore('sys-permission', {
  state: (): SysPermissionState => ({
    items: [],
    permissionTree: [],
    total: 0,
    loading: false,
  }),

  getters: {
    permissions: (state) => state.items,
  },

  actions: {
    // ==========================================
    // 标准 CRUD 操作：从 Mixin 注入
    // ==========================================
    ...createCrudActions<
      SysPermissionResponse,
      CreateSysPermissionRequest,
      UpdateSysPermissionRequest,
      SysPermissionQuery
    >({
      getList: getSysPermissions,
      create: createSysPermission,
      getDetail: async () => ({ data: { data: null as any } }), // 无详情API，占位
      update: updateSysPermission,
      delete: deleteSysPermission,
    }),

    // ==========================================
    // 别名：保持向后兼容
    // ==========================================
    async fetchSysPermissions(query?: SysPermissionQuery) {
      await this.fetchList(query);
      return this.items;
    },

    async createSysPermission(data: CreateSysPermissionRequest) {
      return this.create(data);
    },

    async updateSysPermission(id: number, data: UpdateSysPermissionRequest) {
      return this.update(id, data);
    },

    async deleteSysPermission(id: number) {
      await this.delete(id);
    },

    // ==========================================
    // 业务特定方法
    // ==========================================
    async fetchSysPermissionTree(params?: { domain?: string }) {
      this.loading = true;
      try {
        const { data: resData } = await getSysPermissionTree(params);
        this.permissionTree = resData.data;
        return this.permissionTree;
      } finally {
        this.loading = false;
      }
    },

    getPermissionNodeKey(node: SysPermissionTreeNode): string | null {
      if (node.type === 'api' && node.path && node.method) {
        return `${node.method}:${node.path}`;
      }
      if (node.type === 'menu' && node.code) {
        return `MENU:${node.code}`;
      }
      if (node.type === 'button' && node.code) {
        return `BUTTON:${node.code}`;
      }
      return null;
    },

    setTreeCheckedState(
      tree: SysPermissionTreeNode[],
      selectedPermissions: Array<{ object: string; action: string }>
    ): SysPermissionTreeNode[] {
      const selectedSet = new Set(
        selectedPermissions.map((p) => `${p.action}:${p.object}`)
      );

      const traverse = (
        nodes: SysPermissionTreeNode[]
      ): SysPermissionTreeNode[] => {
        return nodes.map((node) => {
          const newNode = { ...node };
          const nodeKey = this.getPermissionNodeKey(node);
          const nodeIsSelected = nodeKey ? selectedSet.has(nodeKey) : false;

          if (nodeKey) {
            newNode.checked = nodeIsSelected;
            newNode.indeterminate = false;
          }

          if (node.children && node.children.length > 0) {
            const children = traverse(node.children);
            const checkedCount = children.filter((c) => c.checked).length;
            const indeterminateCount = children.filter(
              (c) => c.indeterminate
            ).length;

            newNode.children = children;
            const allChildrenChecked =
              checkedCount === children.length && children.length > 0;
            const hasPartialChildrenChecked =
              (checkedCount > 0 && checkedCount < children.length) ||
              indeterminateCount > 0;

            if (nodeIsSelected) {
              newNode.checked = true;
              newNode.indeterminate = hasPartialChildrenChecked;
            } else {
              newNode.checked = allChildrenChecked;
              newNode.indeterminate = hasPartialChildrenChecked;
            }
          }

          return newNode;
        });
      };

      return traverse(tree);
    },

    getSelectedPermissionsFromTree(
      tree: SysPermissionTreeNode[]
    ): Array<{ object: string; action: string }> {
      const result: Array<{ object: string; action: string }> = [];

      const traverse = (nodes: SysPermissionTreeNode[]) => {
        nodes.forEach((node) => {
          if (node.checked) {
            if (node.type === 'api' && node.path && node.method) {
              result.push({
                object: node.path,
                action: node.method,
              });
            } else if (node.type === 'menu' && node.code) {
              result.push({
                object: node.code,
                action: 'MENU',
              });
            } else if (node.type === 'button' && node.code) {
              result.push({
                object: node.code,
                action: 'BUTTON',
              });
            }
          }

          if (node.children) {
            traverse(node.children);
          }
        });
      };

      traverse(tree);
      return result;
    },
  },
});

export default useSysPermissionStore;
