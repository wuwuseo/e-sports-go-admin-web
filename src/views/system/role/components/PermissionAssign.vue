<template>
  <a-modal
    :visible="visible"
    :title="$t('system.role.permission.title')"
    :width="900"
    :ok-loading="saving"
    :ok-text="$t('system.role.permission.save')"
    :cancel-text="$t('common.cancel')"
    unmount-on-close
    @cancel="handleCancel"
    @ok="handleSave"
  >
    <a-spin :loading="loading" style="width: 100%">
      <div class="permission-assign-container">
        <div v-if="role" class="role-header-card">
          <div class="role-icon-wrapper">
            <icon-safe />
          </div>
          <div class="role-info">
            <div class="role-name-row">
              <span class="role-name-text">{{ role.name }}</span>
              <a-tag :color="role.is_system ? 'arcoblue' : 'gray'" size="small">
                {{ role.is_system ? 'System' : 'Custom' }}
              </a-tag>
            </div>
            <div class="role-stats">
              <span class="stat-item">
                <icon-check />
                已分配 {{ assignedSnapshot.length }} 项权限
              </span>
              <span class="stat-item">
                <icon-check />
                当前选中 {{ checkedKeys.size }} 项
              </span>
            </div>
          </div>
        </div>

        <div class="toolbar-section">
          <div class="search-filter-row">
            <a-input-search
              v-model="searchKeyword"
              :placeholder="$t('system.role.permission.searchPlaceholder')"
              allow-clear
              style="width: 260px"
            />
            <a-select
              v-model="typeFilter"
              :placeholder="$t('system.role.permission.type')"
              allow-clear
              style="width: 140px"
            >
              <a-option value="api">
                <span class="type-option">
                  <span class="type-dot api"></span>
                  API
                </span>
              </a-option>
              <a-option value="menu">
                <span class="type-option">
                  <span class="type-dot menu"></span>
                  菜单
                </span>
              </a-option>
              <a-option value="button">
                <span class="type-option">
                  <span class="type-dot button"></span>
                  按钮
                </span>
              </a-option>
            </a-select>
          </div>

          <div class="batch-actions-row">
            <a-space>
              <a-button type="outline" size="small" @click="handleCheckAll">
                <template #icon><icon-select-all /></template>
                全选当前筛选
              </a-button>
              <a-button type="outline" size="small" @click="handleUncheckAll">
                <template #icon><icon-close /></template>
                清空当前筛选
              </a-button>
              <a-button
                type="outline"
                size="small"
                @click="handleResetToAssigned"
              >
                <template #icon><icon-refresh /></template>
                重置为已分配
              </a-button>
            </a-space>
            <a-divider direction="vertical" />
            <span class="checked-count-badge">
              已选择
              <a-tag color="green">{{ checkedKeys.size }}</a-tag>
              项权限
            </span>
          </div>
        </div>

        <div class="permission-tree-wrapper">
          <a-empty
            v-if="filteredPermissionTree.length === 0"
            :description="$t('system.role.permission.empty')"
            style="padding: 40px 0"
          />
          <a-tree
            v-else
            v-model:checked-keys="treeCheckedKeys"
            checkable
            :data="filteredPermissionTree as any"
            :default-expand-all="true"
            :show-line="true"
            check-strictly
            style="max-height: 380px; overflow-y: auto"
            @check="handleTreeCheck"
          >
            <template #title="nodeData">
              <div class="tree-node-title">
                <span
                  v-if="
                    !nodeData.children ||
                    nodeData.children.length === 0 ||
                    nodeData.type === 'api'
                  "
                  class="leaf-node"
                >
                  <span class="type-dot" :class="nodeData.type"></span>
                  <span v-if="nodeData.method" class="method-badge">{{
                    nodeData.method
                  }}</span>
                  <span class="name-text">{{ nodeData.name }}</span>
                  <span v-if="nodeData.path" class="path-text">
                    {{ nodeData.path }}
                  </span>
                  <span v-else-if="nodeData.code" class="code-text">
                    {{ nodeData.code }}
                  </span>
                  <a-tooltip
                    v-if="nodeData.description"
                    :content="nodeData.description"
                  >
                    <icon-info-circle class="desc-icon" />
                  </a-tooltip>
                </span>
                <span v-else class="folder-node">
                  <icon-folder class="folder-icon" />
                  <span class="name-text">{{ nodeData.name }}</span>
                  <span class="folder-count">
                    ({{ nodeData.children?.length || 0 }})
                  </span>
                </span>
              </div>
            </template>
          </a-tree>
        </div>

        <div class="summary-section">
          <a-divider style="margin: 12px 0" />
          <div class="type-summary">
            <div class="summary-item">
              <span class="type-dot api"></span>
              <span class="summary-label">API 权限:</span>
              <span class="summary-value">
                {{ typeStats.api.selected }} / {{ typeStats.api.total }}
              </span>
            </div>
            <div class="summary-item">
              <span class="type-dot menu"></span>
              <span class="summary-label">菜单权限:</span>
              <span class="summary-value">
                {{ typeStats.menu.selected }} / {{ typeStats.menu.total }}
              </span>
            </div>
            <div class="summary-item">
              <span class="type-dot button"></span>
              <span class="summary-label">按钮权限:</span>
              <span class="summary-value">
                {{ typeStats.button.selected }} / {{ typeStats.button.total }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </a-spin>
  </a-modal>
</template>

<script lang="ts" setup>
  import { ref, computed, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { getRolePermissionsById, saveRolePermissions } from '@/api/role';
  import useSysPermissionStore from '@/store/modules/sys-permission';
  import type {
    RoleResponse,
    SysPermissionTreeNode,
    SysPermissionType,
  } from '@/types/api';

  const { t } = useI18n();
  const sysPermissionStore = useSysPermissionStore();

  const props = defineProps<{
    visible: boolean;
    role?: RoleResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
    (e: 'success'): void;
  }>();

  const loading = ref(false);
  const saving = ref(false);
  const searchKeyword = ref('');
  const typeFilter = ref<SysPermissionType | undefined>(undefined);
  const assignedSnapshot = ref<Array<{ object: string; action: string }>>([]);
  const checkedKeys = ref<Set<number>>(new Set());
  const treeCheckedKeys = ref<number[]>([]);
  const permissionTree = ref<any[]>([]);

  const removeIconFromTree = (nodes: SysPermissionTreeNode[]): any[] => {
    return nodes.map((node) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { icon, ...rest } = node;
      return {
        ...rest,
        children: node.children ? removeIconFromTree(node.children) : undefined,
      };
    });
  };

  const typeStats = computed(() => {
    const typeTotals: Record<SysPermissionType, number> = {
      api: 0,
      menu: 0,
      button: 0,
    };
    const typeSelected: Record<SysPermissionType, number> = {
      api: 0,
      menu: 0,
      button: 0,
    };

    const countTree = (nodes: SysPermissionTreeNode[]) => {
      nodes.forEach((node) => {
        typeTotals[node.type] += 1;
        if (checkedKeys.value.has(node.id)) {
          typeSelected[node.type] += 1;
        }
        if (node.children) {
          countTree(node.children);
        }
      });
    };

    countTree(permissionTree.value);

    return {
      api: { total: typeTotals.api, selected: typeSelected.api },
      menu: { total: typeTotals.menu, selected: typeSelected.menu },
      button: { total: typeTotals.button, selected: typeSelected.button },
    };
  });

  const filteredPermissionTree = computed(() => {
    const search = searchKeyword.value.trim().toLowerCase();
    const type = typeFilter.value;

    if (!search && !type) {
      return permissionTree.value;
    }

    const filterTree = (
      nodes: SysPermissionTreeNode[]
    ): SysPermissionTreeNode[] => {
      return nodes
        .map((node) => {
          const nodeMatchSearch =
            !search ||
            node.name.toLowerCase().includes(search) ||
            (node.path?.toLowerCase().includes(search) ?? false) ||
            (node.code?.toLowerCase().includes(search) ?? false) ||
            (node.description?.toLowerCase().includes(search) ?? false);
          const nodeMatchType = !type || node.type === type;
          const nodeMatch = nodeMatchSearch && nodeMatchType;

          const children = node.children || [];
          const filteredChildren = filterTree(children);
          const hasMatchChildren = filteredChildren.length > 0;

          if (!nodeMatch && !hasMatchChildren) {
            return null;
          }

          if (hasMatchChildren) {
            const checkedCount = filteredChildren.filter(
              (c) => c.checked
            ).length;
            const allChecked = checkedCount === filteredChildren.length;
            const indeterminate =
              checkedCount > 0 && checkedCount < filteredChildren.length;

            return {
              ...node,
              children: filteredChildren,
              checked: allChecked,
              indeterminate,
            };
          }

          return node;
        })
        .filter((n): n is SysPermissionTreeNode => n !== null);
    };

    return filterTree(permissionTree.value);
  });

  const collectCheckedKeys = (nodes: SysPermissionTreeNode[]) => {
    nodes.forEach((node) => {
      if (node.checked) {
        checkedKeys.value.add(node.id);
      }
      if (node.children) {
        collectCheckedKeys(node.children);
      }
    });
  };

  const updateTreeCheckState = (nodes: SysPermissionTreeNode[]) => {
    nodes.forEach((node) => {
      node.checked = checkedKeys.value.has(node.id);
      if (node.children) {
        updateTreeCheckState(node.children);
      }
    });
  };

  const fetchData = async () => {
    if (!props.role) return;

    loading.value = true;
    try {
      await sysPermissionStore.fetchSysPermissionTree();
      const rolePermRes = await getRolePermissionsById(props.role.id, {
        domain: 'default',
      });

      assignedSnapshot.value = rolePermRes.data.data || [];

      const treeWithChecked = sysPermissionStore.setTreeCheckedState(
        sysPermissionStore.permissionTree,
        assignedSnapshot.value
      );

      permissionTree.value = removeIconFromTree(treeWithChecked);

      collectCheckedKeys(permissionTree.value);
      treeCheckedKeys.value = Array.from(checkedKeys.value);
    } finally {
      loading.value = false;
    }
  };

  const handleTreeCheck = (keys: (string | number)[]) => {
    checkedKeys.value = new Set(keys as number[]);
    updateTreeCheckState(permissionTree.value);
  };

  const handleCheckAll = () => {
    const collectIds = (nodes: SysPermissionTreeNode[]) => {
      nodes.forEach((node) => {
        checkedKeys.value.add(node.id);
        if (node.children) {
          collectIds(node.children);
        }
      });
    };

    collectIds(filteredPermissionTree.value);

    updateTreeCheckState(permissionTree.value);
    treeCheckedKeys.value = Array.from(checkedKeys.value);

    Message.success(t('system.role.permission.checkAllSuccess'));
  };

  const handleUncheckAll = () => {
    const collectIds = (nodes: SysPermissionTreeNode[]) => {
      nodes.forEach((node) => {
        checkedKeys.value.delete(node.id);
        if (node.children) {
          collectIds(node.children);
        }
      });
    };

    collectIds(filteredPermissionTree.value);

    updateTreeCheckState(permissionTree.value);
    treeCheckedKeys.value = Array.from(checkedKeys.value);

    Message.success(t('system.role.permission.uncheckAllSuccess'));
  };

  const handleResetToAssigned = () => {
    checkedKeys.value = new Set();
    const treeWithChecked = sysPermissionStore.setTreeCheckedState(
      sysPermissionStore.permissionTree,
      assignedSnapshot.value
    );
    permissionTree.value = removeIconFromTree(treeWithChecked);
    collectCheckedKeys(permissionTree.value);
    treeCheckedKeys.value = Array.from(checkedKeys.value);

    Message.success(t('system.role.permission.resetSuccess'));
  };

  const calculatePermissionDiff = (
    currentPermissions: Array<{ object: string; action: string }>,
    savedPermissions: Array<{ object: string; action: string }>
  ) => {
    const currentSet = new Set(
      currentPermissions.map((p) => `${p.action}:${p.object}`)
    );
    const savedSet = new Set(
      savedPermissions.map((p) => `${p.action}:${p.object}`)
    );

    let addCount = 0;
    let removeCount = 0;

    currentSet.forEach((key) => {
      if (!savedSet.has(key)) {
        addCount += 1;
      }
    });

    savedSet.forEach((key) => {
      if (!currentSet.has(key)) {
        removeCount += 1;
      }
    });

    return { addCount, removeCount };
  };

  const handleSave = async () => {
    if (!props.role) return;

    saving.value = true;
    try {
      const selectedPermissions =
        sysPermissionStore.getSelectedPermissionsFromTree(permissionTree.value);

      const { addCount, removeCount } = calculatePermissionDiff(
        selectedPermissions,
        assignedSnapshot.value
      );

      await saveRolePermissions(props.role.id, {
        domain: 'default',
        permissions: selectedPermissions,
      });

      Message.success(
        t('system.role.permission.saveSuccess', {
          add: addCount,
          remove: removeCount,
        })
      );

      emit('success');
      emit('update:visible', false);
    } finally {
      saving.value = false;
    }
  };

  const handleCancel = () => {
    emit('update:visible', false);
  };

  watch(
    () => props.visible,
    (val) => {
      if (val) {
        searchKeyword.value = '';
        typeFilter.value = undefined;
        fetchData();
      } else {
        assignedSnapshot.value = [];
        checkedKeys.value = new Set();
        treeCheckedKeys.value = [];
        permissionTree.value = [];
      }
    }
  );
</script>

<style lang="less" scoped>
  .permission-assign-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .role-header-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    border-radius: 8px;
    border: 1px solid var(--color-border-2);
  }

  .role-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 8px;
    background: linear-gradient(135deg, #dbeafe, #bfdbfe);
    color: #2563eb;
    font-size: 24px;
  }

  .role-info {
    flex: 1;
  }

  .role-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .role-name-text {
    font-weight: 600;
    font-size: 16px;
    color: var(--color-text-1);
  }

  .role-stats {
    display: flex;
    gap: 20px;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: var(--color-text-2);
  }

  .toolbar-section {
    background: var(--color-bg-2);
    border-radius: 8px;
    padding: 12px 16px;
    border: 1px solid var(--color-border-2);
  }

  .search-filter-row {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
  }

  .type-option {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .batch-actions-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .checked-count-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--color-text-2);
  }

  .permission-tree-wrapper {
    border: 1px solid var(--color-border-2);
    border-radius: 8px;
    padding: 12px;
    background: var(--color-bg-1);
  }

  .tree-node-title {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    flex-wrap: wrap;
  }

  .leaf-node {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .method-badge {
    display: inline-block;
    padding: 1px 6px;
    font-size: 11px;
    font-weight: 600;
    border-radius: 4px;
    background: #3b82f6;
    color: white;
    text-transform: uppercase;
  }

  .name-text {
    font-weight: 500;
    font-size: 13px;
  }

  .path-text,
  .code-text {
    font-size: 12px;
    color: var(--color-text-3);
    font-family: monospace;
    background: var(--color-bg-3);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .desc-icon {
    color: var(--color-text-4);
    font-size: 12px;
    cursor: help;
  }

  .folder-node {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .folder-icon {
    color: #3b82f6;
    font-size: 14px;
  }

  .folder-count {
    font-size: 12px;
    color: var(--color-text-3);
    margin-left: 4px;
  }

  .type-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;

    &.api {
      background: #3b82f6;
    }

    &.menu {
      background: #10b981;
    }

    &.button {
      background: #f59e0b;
    }
  }

  .summary-section {
    background: var(--color-bg-2);
    border-radius: 8px;
    padding: 0 16px;
    border: 1px solid var(--color-border-2);
  }

  .type-summary {
    display: flex;
    gap: 24px;
    padding-bottom: 8px;
  }

  .summary-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .summary-label {
    font-size: 13px;
    color: var(--color-text-2);
  }

  .summary-value {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-1);
  }
</style>
