<template>
  <div class="container page-container">
    <a-card class="general-card" :title="$t('menu.system.department')">
      <a-form :model="searchForm" layout="inline" class="search-form">
        <a-form-item field="keyword" :label="$t('system.department.keyword')">
          <a-input
            v-model="searchForm.keyword"
            :placeholder="$t('system.department.keyword.placeholder')"
            allow-clear
            style="width: 240px"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item field="status" :label="$t('system.department.status')">
          <a-select
            v-model="searchForm.status"
            style="width: 140px"
            :placeholder="$t('system.department.status.all')"
          >
            <a-option value="">{{
              $t('system.department.status.all')
            }}</a-option>
            <a-option value="active">{{
              $t('system.department.status.active')
            }}</a-option>
            <a-option value="inactive">{{
              $t('system.department.status.inactive')
            }}</a-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><icon-search /></template>
              {{ $t('system.department.search') }}
            </a-button>
            <a-button @click="handleReset">
              <template #icon><icon-refresh /></template>
              {{ $t('system.department.reset') }}
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <div class="page-toolbar">
        <div class="page-toolbar-left">
          <a-space>
            <a-button type="outline" @click="expandAll">
              <template #icon><icon-expand /></template>
              {{ $t('system.department.expandAll') }}
            </a-button>
            <a-button type="outline" @click="collapseAll">
              <template #icon><icon-menu-fold /></template>
              {{ $t('system.department.collapseAll') }}
            </a-button>
            <a-button type="outline" @click="handleRefresh">
              <template #icon><icon-refresh /></template>
              {{ $t('system.department.refresh') }}
            </a-button>
          </a-space>
        </div>
        <div class="page-toolbar-right">
          <a-button
            v-if="permissionsReady"
            v-permission="'department:add'"
            type="primary"
            @click="handleCreate"
          >
            <template #icon><icon-plus /></template>
            {{ $t('system.department.create') }}
          </a-button>
        </div>
      </div>

      <a-table
        v-model:expanded-keys="expandedKeys"
        :data="departmentTree"
        :loading="loading"
        :pagination="false"
        :scroll="{ x: 1280 }"
        row-key="id"
      >
        <template #empty>
          <a-empty :description="$t('system.department.empty')" />
        </template>
        <template #columns>
          <a-table-column
            :title="$t('system.department.name')"
            data-index="name"
            :width="220"
          >
            <template #cell="{ record }">
              <span class="department-name">{{ record.name }}</span>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.department.leader')"
            data-index="leader"
            :width="120"
          >
            <template #cell="{ record }">
              {{ record.leader || '-' }}
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.department.phone')"
            data-index="phone"
            :width="140"
          >
            <template #cell="{ record }">
              {{ record.phone || '-' }}
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.department.email')"
            data-index="email"
            :width="180"
            :ellipsis="true"
            :tooltip="true"
          >
            <template #cell="{ record }">
              {{ record.email || '-' }}
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.department.sort')"
            data-index="sort"
            :width="90"
            align="center"
          />
          <a-table-column
            :title="$t('system.department.status')"
            data-index="status"
            :width="100"
            align="center"
          >
            <template #cell="{ record }">
              <a-tag :color="record.status === 'active' ? 'green' : 'red'">
                {{
                  record.status === 'active'
                    ? $t('system.department.status.active')
                    : $t('system.department.status.inactive')
                }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.department.createdAt')"
            data-index="created_at"
            :width="170"
          >
            <template #cell="{ record }">
              {{ formatDateTime(record.created_at) }}
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.department.operations')"
            :width="240"
            fixed="right"
          >
            <template #cell="{ record }">
              <a-space>
                <a-button
                  v-if="permissionsReady"
                  v-permission="'department:add'"
                  type="text"
                  size="small"
                  @click="handleAddChild(record)"
                >
                  <template #icon><icon-plus /></template>
                  {{ $t('system.department.addChild') }}
                </a-button>
                <a-button
                  v-if="permissionsReady"
                  v-permission="'department:edit'"
                  type="text"
                  size="small"
                  @click="handleEdit(record)"
                >
                  <template #icon><icon-edit /></template>
                  {{ $t('system.department.edit') }}
                </a-button>
                <a-button
                  v-if="permissionsReady"
                  v-permission="'department:delete'"
                  type="text"
                  status="danger"
                  size="small"
                  @click="handleDelete(record)"
                >
                  <template #icon><icon-delete /></template>
                  {{ $t('system.department.delete') }}
                </a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <DepartmentForm
      v-model:visible="formVisible"
      :mode="formMode"
      :department="currentDepartment"
      :departments="departmentTree"
      :parent-id="parentId"
      @success="handleFormSuccess"
    />
  </div>
</template>

<script lang="ts" setup>
  import { onMounted, reactive, ref } from 'vue';
  import { Message, Modal } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import {
    deleteDepartment,
    getDepartmentDetail,
    getDepartmentTree,
  } from '@/api/department';
  import { formatDateTime } from '@/utils';
  import type {
    Department,
    DepartmentStatus,
    DepartmentTreeNode,
  } from '@/types/api';
  import { useUserStore } from '@/store';
  import DepartmentForm from './components/DepartmentForm.vue';

  const { t } = useI18n();
  const userStore = useUserStore();

  const loading = ref(false);
  const permissionsReady = ref(false);
  const departmentTree = ref<DepartmentTreeNode[]>([]);
  const expandedKeys = ref<(string | number)[]>([]);
  const formVisible = ref(false);
  const formMode = ref<'create' | 'addChild' | 'edit'>('create');
  const currentDepartment = ref<Department | undefined>(undefined);
  const parentId = ref(0);

  const searchForm = reactive<{
    keyword: string;
    status: DepartmentStatus | '';
  }>({
    keyword: '',
    status: '',
  });

  const collectDepartmentKeys = (nodes: DepartmentTreeNode[]) => {
    return nodes.reduce<number[]>((keys, node) => {
      keys.push(node.id);
      if (node.children?.length) {
        keys.push(...collectDepartmentKeys(node.children));
      }
      return keys;
    }, []);
  };

  const fetchDepartmentTree = async (options: { silent?: boolean } = {}) => {
    loading.value = true;
    try {
      const response = await getDepartmentTree({
        keyword: searchForm.keyword.trim() || undefined,
        status: searchForm.status || undefined,
      });
      departmentTree.value = response.data.data || [];
      expandedKeys.value = collectDepartmentKeys(departmentTree.value);
    } catch (err) {
      if (!options.silent) {
        Message.error(t('system.department.loadError'));
      }
    } finally {
      loading.value = false;
    }
  };

  const handleSearch = () => {
    fetchDepartmentTree();
  };

  const handleReset = () => {
    searchForm.keyword = '';
    searchForm.status = '';
    fetchDepartmentTree();
  };

  const handleRefresh = async () => {
    await fetchDepartmentTree({ silent: true });
    Message.success(t('system.department.refreshSuccess'));
  };

  const expandAll = () => {
    expandedKeys.value = collectDepartmentKeys(departmentTree.value);
  };

  const collapseAll = () => {
    expandedKeys.value = [];
  };

  const handleCreate = () => {
    formMode.value = 'create';
    currentDepartment.value = undefined;
    parentId.value = 0;
    formVisible.value = true;
  };

  const handleAddChild = (record: DepartmentTreeNode) => {
    formMode.value = 'addChild';
    currentDepartment.value = undefined;
    parentId.value = record.id;
    formVisible.value = true;
  };

  const handleEdit = async (record: DepartmentTreeNode) => {
    formMode.value = 'edit';
    parentId.value = record.parent_id || 0;
    try {
      const response = await getDepartmentDetail(record.id);
      currentDepartment.value = response.data.data;
    } catch (err) {
      currentDepartment.value = record;
      Message.error(t('system.department.loadError'));
    }
    formVisible.value = true;
  };

  const handleDelete = (record: DepartmentTreeNode) => {
    Modal.confirm({
      title: t('system.department.deleteConfirmTitle'),
      content: t('system.department.deleteConfirmContent'),
      okButtonProps: {
        status: 'danger',
      },
      onOk: async () => {
        await deleteDepartment(record.id);
        Message.success(t('system.department.deleteSuccess'));
        await fetchDepartmentTree({ silent: true });
      },
    });
  };

  const handleFormSuccess = () => {
    fetchDepartmentTree({ silent: true });
  };

  const initializePage = async () => {
    await userStore.refreshPermissions();
    permissionsReady.value = true;
    await fetchDepartmentTree();
  };

  onMounted(() => {
    initializePage();
  });
</script>

<script lang="ts">
  export default {
    name: 'SystemDepartment',
  };
</script>

<style lang="less" scoped>
  .search-form {
    margin-bottom: 16px;
    padding: 16px 16px 4px;
    background: var(--color-fill-1);
    border-radius: 6px;
  }

  .page-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .page-toolbar-left,
  .page-toolbar-right {
    display: flex;
    align-items: center;
  }

  .department-name {
    font-weight: 500;
    color: var(--color-text-1);
  }
</style>
