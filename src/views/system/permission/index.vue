<template>
  <div class="container page-container">
    <a-card class="general-card" :title="$t('menu.system.permission')">
      <a-row :gutter="12" style="margin-bottom: 20px">
        <a-col :span="6">
          <div
            class="stat-card"
            :class="{ active: filterType === 'api' }"
            role="button"
            tabindex="0"
            @click="handleStatCardClick('api')"
            @keyup.enter="handleStatCardClick('api')"
          >
            <div class="stat-card-icon api-icon">API</div>
            <div>
              <div class="stat-card-value">
                {{ apiCount }}
              </div>
              <div class="stat-card-label">{{
                $t('system.permission.apiCount')
              }}</div>
            </div>
          </div>
        </a-col>
        <a-col :span="6">
          <div
            class="stat-card"
            :class="{ active: filterType === 'menu' }"
            role="button"
            tabindex="0"
            @click="handleStatCardClick('menu')"
            @keyup.enter="handleStatCardClick('menu')"
          >
            <div class="stat-card-icon menu-icon">
              <icon-menu />
            </div>
            <div>
              <div class="stat-card-value">
                {{ menuCount }}
              </div>
              <div class="stat-card-label">{{
                $t('system.permission.menuCount')
              }}</div>
            </div>
          </div>
        </a-col>
        <a-col :span="6">
          <div
            class="stat-card"
            :class="{ active: filterType === 'button' }"
            role="button"
            tabindex="0"
            @click="handleStatCardClick('button')"
            @keyup.enter="handleStatCardClick('button')"
          >
            <div class="stat-card-icon button-icon">
              <icon-thumb-up />
            </div>
            <div>
              <div class="stat-card-value">
                {{ buttonCount }}
              </div>
              <div class="stat-card-label">{{
                $t('system.permission.buttonCount')
              }}</div>
            </div>
          </div>
        </a-col>
        <a-col :span="6">
          <div
            class="stat-card"
            :class="{ active: filterType === '' }"
            role="button"
            tabindex="0"
            @click="handleStatCardClick('')"
            @keyup.enter="handleStatCardClick('')"
          >
            <div class="stat-card-icon total-icon">
              <icon-safe />
            </div>
            <div>
              <div class="stat-card-value">{{ totalCount }}</div>
              <div class="stat-card-label">{{
                $t('system.permission.totalCount')
              }}</div>
            </div>
          </div>
        </a-col>
      </a-row>

      <div class="page-toolbar">
        <div class="page-toolbar-left">
          <a-radio-group v-model="viewMode" type="button">
            <a-radio value="table">
              <icon-list />
              {{ $t('system.permission.tableView') }}
            </a-radio>
            <a-radio value="tree">
              <icon-folder />
              {{ $t('system.permission.treeView') }}
            </a-radio>
          </a-radio-group>
          <a-divider direction="vertical" />
          <a-select
            v-model="filterType"
            :placeholder="$t('system.permission.filterType')"
            style="width: 140px"
            allow-clear
            @change="handleSearch"
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
                {{ $t('system.permission.filterMenu') }}
              </span>
            </a-option>
            <a-option value="button">
              <span class="type-option">
                <span class="type-dot button"></span>
                {{ $t('system.permission.filterButton') }}
              </span>
            </a-option>
          </a-select>
          <a-input-search
            v-model="searchKeyword"
            :placeholder="$t('system.permission.searchPlaceholder')"
            style="width: 220px"
            allow-clear
            @search="handleSearch"
          />
        </div>
        <div v-if="viewMode === 'tree'" class="page-toolbar-right">
          <a-space>
            <a-button type="outline" size="small" @click="toggleExpanded">
              <template #icon>
                <icon-expand v-if="!expandedKeys?.length" /><icon-menu-fold
                  v-else
                /> </template
              >{{
                expandedKeys?.length
                  ? $t('system.permission.fold')
                  : $t('system.permission.unfold')
              }}</a-button
            >
          </a-space>
          <a-divider direction="vertical" />
        </div>
        <div class="page-toolbar-right">
          <a-button type="outline" @click="handleRefresh">
            <template #icon><icon-refresh /></template>
            {{ $t('common.refresh') }}
          </a-button>
          <a-button
            v-permission="'permission:add'"
            type="primary"
            @click="handleCreate"
          >
            <template #icon><icon-plus /></template>
            {{ $t('system.permission.create') }}
          </a-button>
        </div>
      </div>

      <a-table
        v-if="viewMode === 'table'"
        :data="sysPermissionStore.permissions"
        :loading="sysPermissionStore.loading"
        :pagination="false"
        row-key="id"
      >
        <template #columns>
          <a-table-column title="ID" data-index="id" :width="70" />
          <a-table-column
            :title="$t('system.permission.name')"
            data-index="name"
            :width="150"
          />
          <a-table-column
            :title="$t('system.permission.code')"
            data-index="code"
            :width="180"
          >
            <template #cell="{ record }">
              <span class="code-cell">{{ record.code }}</span>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.permission.type')"
            data-index="type"
            :width="90"
            align="center"
          >
            <template #cell="{ record }">
              <a-tag :color="typeTagColor(record.type)" size="small">
                {{ record.type.toUpperCase() }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.permission.method')"
            data-index="method"
            :width="90"
            align="center"
          >
            <template #cell="{ record }">
              <span
                v-if="record.method"
                class="method-badge"
                :class="record.method.toLowerCase()"
              >
                {{ record.method }}
              </span>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.permission.path')"
            data-index="path"
            :ellipsis="true"
            :tooltip="true"
          >
            <template #cell="{ record }">
              <span v-if="record.path" class="path-text">{{
                record.path
              }}</span>
              <span v-else-if="record.menu_path" class="menu-path-text">{{
                record.menu_path
              }}</span>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.permission.description')"
            data-index="description"
            :ellipsis="true"
          />
          <a-table-column
            :title="$t('system.permission.status')"
            data-index="status"
            :width="90"
            align="center"
          >
            <template #cell="{ record }">
              <a-switch
                v-permission="{
                  permission: 'permission:edit',
                  strategy: 'disable',
                }"
                :model-value="record.status === 1"
                :loading="togglingMap[record.id]"
                size="small"
                @change="(value) => handleToggleStatus(record, Boolean(value))"
              />
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.permission.operations')"
            :width="160"
            fixed="right"
          >
            <template #cell="{ record }">
              <a-space>
                <a-button
                  v-permission="'permission:edit'"
                  type="text"
                  size="small"
                  @click="handleEdit(record)"
                >
                  <template #icon><icon-edit /></template>
                  {{ $t('common.edit') }}
                </a-button>
                <a-popconfirm
                  :content="$t('system.permission.deleteConfirm')"
                  @ok="handleDelete(record)"
                >
                  <a-button
                    v-permission="'permission:delete'"
                    type="text"
                    status="danger"
                    size="small"
                  >
                    <template #icon><icon-delete /></template>
                    {{ $t('common.delete') }}
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>

      <div v-else class="tree-view-container">
        <a-spin
          v-if="sysPermissionStore.loading"
          :loading="true"
          style="display: flex; justify-content: center; padding: 40px"
        />
        <a-empty
          v-else-if="filteredPermissionTree.length === 0"
          :description="$t('system.permission.empty')"
        />
        <a-tree
          v-else
          v-model:expanded-keys="expandedKeys"
          :data="filteredPermissionTree"
          :default-expand-all="true"
          :show-line="true"
          :block-node="true"
          class="permission-tree"
        >
          <template #title="nodeData">
            <div v-if="nodeData" class="tree-node-title">
              <span class="type-dot" :class="nodeData.type || ''"></span>
              <span class="name-text">{{
                nodeData.name ? highlightText(nodeData.name) : ''
              }}</span>
              <span
                v-if="nodeData.method"
                class="method-badge"
                :class="nodeData.method.toLowerCase()"
              >
                {{ nodeData.method }}
              </span>
              <span v-if="nodeData.code" class="code-text">{{
                highlightText(nodeData.code)
              }}</span>
              <span v-if="nodeData.path" class="path-text">{{
                highlightText(nodeData.path)
              }}</span>
              <span v-if="nodeData.description" class="desc-text">
                {{ nodeData.description }}
              </span>
              <div class="node-actions">
                <a-tooltip
                  :content="
                    nodeData.status === 1
                      ? $t('system.permission.disable')
                      : $t('system.permission.enable')
                  "
                >
                  <a-switch
                    v-permission="{
                      permission: 'permission:edit',
                      strategy: 'disable',
                    }"
                    :model-value="nodeData.status === 1"
                    :loading="togglingMap[nodeData.id]"
                    size="small"
                    class="node-status-switch"
                    @click.stop
                    @change="
                      (value) => handleToggleStatus(nodeData, Boolean(value))
                    "
                  />
                </a-tooltip>
                <div class="node-hover-actions">
                  <a-tooltip :content="$t('common.edit')">
                    <a-button
                      v-permission="'permission:edit'"
                      type="text"
                      size="mini"
                      @click.stop="handleEdit(nodeData)"
                    >
                      <icon-edit />
                    </a-button>
                  </a-tooltip>
                  <a-tooltip :content="$t('common.delete')">
                    <a-popconfirm
                      :content="$t('system.permission.deleteConfirm')"
                      @ok="handleDelete(nodeData)"
                    >
                      <a-button
                        v-permission="'permission:delete'"
                        type="text"
                        status="danger"
                        size="mini"
                      >
                        <icon-delete />
                      </a-button>
                    </a-popconfirm>
                  </a-tooltip>
                </div>
              </div>
            </div>
          </template>
        </a-tree>
      </div>
    </a-card>
    <PermissionForm
      v-model:visible="formVisible"
      :permission="currentPermission"
      @success="handleFormSuccess"
    />
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive, computed, onMounted, watch } from 'vue';
  import { Message, Modal } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import {
    deleteSysPermission,
    updateSysPermission,
  } from '@/api/sys-permission';
  import useSysPermissionStore from '@/store/modules/sys-permission';
  import type {
    SysPermissionResponse,
    SysPermissionType,
    SysPermissionTreeNode,
  } from '@/types/api';
  import PermissionForm from './components/PermissionForm.vue';

  const { t } = useI18n();
  const sysPermissionStore = useSysPermissionStore();

  const searchKeyword = ref('');
  const filterType = ref<SysPermissionType | ''>('');
  const viewMode = ref<'table' | 'tree'>('table');
  const formVisible = ref(false);
  const currentPermission = ref<SysPermissionResponse | undefined>(undefined);
  const currentPage = ref(1);
  const pageSize = ref(0);
  const expandedKeys = ref<string[]>([]);
  // 记录每个权限项的状态切换 loading，避免重复点击
  const togglingMap = ref<Record<number, boolean>>({});

  const pagination = reactive({
    current: currentPage.value,
    pageSize: pageSize.value,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });

  const flattenPermissionTree = (
    nodes: SysPermissionTreeNode[] = []
  ): SysPermissionTreeNode[] => {
    return nodes.reduce<SysPermissionTreeNode[]>((result, node) => {
      result.push(node);
      if (node.children?.length) {
        result.push(...flattenPermissionTree(node.children));
      }
      return result;
    }, []);
  };

  const allPermissions = computed(() =>
    flattenPermissionTree(sysPermissionStore.permissionTree)
  );
  const apiCount = computed(
    () => allPermissions.value.filter((p) => p.type === 'api').length
  );
  const menuCount = computed(
    () => allPermissions.value.filter((p) => p.type === 'menu').length
  );
  const buttonCount = computed(
    () => allPermissions.value.filter((p) => p.type === 'button').length
  );
  const totalCount = computed(() => allPermissions.value.length);

  const typeTagColor = (type: string) => {
    const map: Record<string, string> = {
      api: 'blue',
      menu: 'green',
      button: 'orange',
    };
    return map[type] || 'gray';
  };

  const transformTreeNodes = (nodes: SysPermissionTreeNode[]): any[] => {
    if (!nodes || nodes.length === 0) return [];
    return nodes.map(({ icon, ...rest }) => ({
      ...rest,
      key: rest.id,
      title: rest.name,
      children: rest.children ? transformTreeNodes(rest.children) : undefined,
    }));
  };

  // 高亮搜索文本
  const highlightText = (text: string) => {
    if (!searchKeyword.value.trim()) {
      return text;
    }
    const keyword = searchKeyword.value.trim().toLowerCase();
    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
  };

  const filteredPermissionTree = computed(() => {
    const type = filterType.value;
    const search = searchKeyword.value.trim().toLowerCase();
    const tree = sysPermissionStore.permissionTree || [];

    if (!type && !search) {
      return transformTreeNodes(tree);
    }

    const filterTree = (
      nodes: SysPermissionTreeNode[]
    ): SysPermissionTreeNode[] => {
      if (!nodes || nodes.length === 0) {
        return [];
      }

      return nodes.reduce<SysPermissionTreeNode[]>((result, node) => {
        const matchType = !type || node.type === type;
        const matchSearch =
          !search ||
          (node.name && node.name.toLowerCase().includes(search)) ||
          (node.path && node.path.toLowerCase().includes(search)) ||
          (node.code && node.code.toLowerCase().includes(search));
        const nodeMatch = matchType && matchSearch;

        const children = node.children || [];
        const filteredChildren = filterTree(children);
        const hasMatchChildren = filteredChildren.length > 0;

        if (nodeMatch || hasMatchChildren) {
          result.push({
            ...node,
            children: hasMatchChildren ? filteredChildren : undefined,
          });
        }

        return result;
      }, []);
    };

    return transformTreeNodes(filterTree(tree));
  });

  const fetchData = async () => {
    await sysPermissionStore.fetchSysPermissions({
      page: currentPage.value,
      page_size: pageSize.value,
      type: filterType.value || undefined,
    });
    pagination.total = sysPermissionStore.total;
    pagination.current = currentPage.value;
  };

  const fetchTreeData = async () => {
    await sysPermissionStore.fetchSysPermissionTree();
  };

  const handleSearch = () => {
    currentPage.value = 1;
    if (viewMode.value === 'table') {
      fetchData();
    }
  };

  // 点击统计卡片进行筛选；再次点击同一卡片或点击"权限总数"卡片则清空筛选
  const handleStatCardClick = (type: SysPermissionType | '') => {
    if (type === '' || filterType.value === type) {
      filterType.value = '';
    } else {
      filterType.value = type;
    }
    handleSearch();
  };

  const toggleExpanded = () => {
    if (expandedKeys.value.length) {
      expandedKeys.value = [];
    } else {
      const allKeys: string[] = [];
      const collectKeys = (nodes: any[]) => {
        nodes.forEach((node) => {
          if (node.key) {
            allKeys.push(node.key as string);
          }
          if (node.children && node.children.length > 0) {
            collectKeys(node.children);
          }
        });
      };
      collectKeys(filteredPermissionTree.value);
      expandedKeys.value = allKeys;
    }
  };

  const handleRefresh = () => {
    searchKeyword.value = '';
    filterType.value = '';
    currentPage.value = 1;
    if (viewMode.value === 'table') {
      fetchData();
    }
    fetchTreeData();
    Message.success(t('system.permission.refreshSuccess'));
  };

  const handleCreate = () => {
    currentPermission.value = undefined;
    formVisible.value = true;
  };

  const handleEdit = (record: SysPermissionResponse) => {
    currentPermission.value = record;
    formVisible.value = true;
  };

  const handleDelete = async (record: SysPermissionResponse) => {
    try {
      await deleteSysPermission(record.id);
      Message.success(t('system.permission.deleteSuccess'));
      if (viewMode.value === 'table') {
        fetchData();
      }
      fetchTreeData();
    } catch (err) {
      // error handled by interceptor
    }
  };

  // 切换权限启用/禁用状态（复用 update 接口传 status 字段）
  // 由于父权限禁用会级联禁用所有子权限，先弹出二次确认避免误操作
  const handleToggleStatus = async (
    record: SysPermissionResponse,
    nextStatus: boolean
  ) => {
    const newStatus = nextStatus ? 1 : 0;
    const actionText = nextStatus
      ? t('system.permission.enable')
      : t('system.permission.disable');

    Modal.confirm({
      title: t('system.permission.toggleStatus.title', { action: actionText }),
      content: t('system.permission.toggleStatus.cascadeTip', {
        action: actionText,
      }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        togglingMap.value[record.id] = true;
        try {
          await updateSysPermission(record.id, { status: newStatus });
          Message.success(
            nextStatus
              ? t('system.permission.enableSuccess')
              : t('system.permission.disableSuccess')
          );
          // 刷新两个视图的数据源，保证表格与树视图状态同步
          const tasks: Promise<unknown>[] = [fetchTreeData()];
          if (viewMode.value === 'table') {
            tasks.push(fetchData());
          }
          await Promise.all(tasks);
        } catch (err) {
          // error handled by interceptor
        } finally {
          togglingMap.value[record.id] = false;
        }
      },
    });
  };

  const handleFormSuccess = () => {
    if (viewMode.value === 'table') {
      fetchData();
    }
    fetchTreeData();
  };

  watch(
    viewMode,
    async (newMode) => {
      searchKeyword.value = '';
      filterType.value = '';
      if (newMode === 'table') {
        await fetchData();
      } else {
        await fetchTreeData();
      }
    },
    { immediate: false }
  );

  onMounted(() => {
    fetchData();
    fetchTreeData();
  });
</script>

<script lang="ts">
  export default {
    name: 'SystemPermission',
  };
</script>

<style lang="less" scoped>
  .stat-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: var(--color-bg-2);
    border-radius: 8px;
    border: 1px solid var(--color-border-2);
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;

    &:hover {
      border-color: rgb(var(--primary-6));
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    &.active {
      border-color: rgb(var(--primary-6));
      background: var(--color-primary-light-1);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    }
  }

  .stat-card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    font-size: 14px;

    &.api-icon {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    }

    &.menu-icon {
      background: linear-gradient(135deg, #10b981, #059669);
    }

    &.button-icon {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }

    &.total-icon {
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    }
  }

  .stat-card-value {
    font-size: 24px;
    font-weight: 600;
    color: var(--color-text-1);
  }

  .stat-card-label {
    font-size: 13px;
    color: var(--color-text-2);
  }

  .tree-view-container {
    padding: 12px;
    background: var(--color-bg-1);
    border-radius: 8px;
    border: 1px solid var(--color-border-2);
  }

  .permission-tree {
    :deep(.arco-tree-node-title) {
      width: 100%;
    }
  }

  .tree-node-title {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 0;
    flex-wrap: wrap;
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

  .name-text {
    font-weight: 500;
    font-size: 13px;
  }

  .method-badge {
    display: inline-block;
    padding: 1px 6px;
    font-size: 10px;
    font-weight: 600;
    border-radius: 4px;
    color: white;
    text-transform: uppercase;

    &.get {
      background: #10b981;
    }

    &.post {
      background: #3b82f6;
    }

    &.put {
      background: #f59e0b;
    }

    &.delete {
      background: #ef4444;
    }

    &.patch {
      background: #8b5cf6;
    }
  }

  .path-text {
    font-size: 12px;
    color: var(--color-text-3);
    font-family: monospace;
    background: var(--color-bg-3);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .code-text,
  .code-cell {
    font-size: 12px;
    color: var(--color-text-3);
    font-family: monospace;
    background: var(--color-bg-3);
    padding: 2px 8px;
    border-radius: 4px;
  }

  .desc-text {
    font-size: 12px;
    color: var(--color-text-3);
    margin-left: auto;
  }

  .node-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }

  // 状态开关常驻显示
  .node-status-switch {
    opacity: 1;
  }

  // 编辑/删除按钮仅在 hover 时显示
  .node-hover-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;

    .tree-node-title:hover & {
      opacity: 1;
    }
  }

  .highlight {
    color: #f59e0b;
    font-weight: 600;
    background: rgba(245, 158, 11, 0.1);
    padding: 0 2px;
    border-radius: 2px;
  }

  .type-option {
    display: flex;
    align-items: center;
    gap: 6px;
  }
</style>
