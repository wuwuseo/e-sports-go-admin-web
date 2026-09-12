<template>
  <div class="container page-container">
    <a-card class="general-card" :title="$t('menu.system.role')">
      <!-- 统计卡片行 -->
      <a-row :gutter="16" style="margin-bottom: 24px">
        <a-col :span="6">
          <div class="stat-card">
            <div
              class="stat-card-icon"
              style="
                color: #2563eb;
                background: linear-gradient(135deg, #dbeafe, #eff6ff);
              "
            >
              <icon-user-group />
            </div>
            <div>
              <div class="stat-card-value">{{ roleStat.total }}</div>
              <div class="stat-card-label">{{
                $t('system.role.totalCount')
              }}</div>
            </div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card">
            <div
              class="stat-card-icon"
              style="
                color: #10b981;
                background: linear-gradient(135deg, #d1fae5, #ecfdf5);
              "
            >
              <icon-check-circle />
            </div>
            <div>
              <div class="stat-card-value">{{ roleStat.active }}</div>
              <div class="stat-card-label">{{
                $t('system.role.enabledCount')
              }}</div>
            </div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card">
            <div
              class="stat-card-icon"
              style="
                color: #f59e0b;
                background: linear-gradient(135deg, #fef3c7, #fffbeb);
              "
            >
              <icon-stop />
            </div>
            <div>
              <div class="stat-card-value">{{ roleStat.inactive }}</div>
              <div class="stat-card-label">{{
                $t('system.role.disabledCount')
              }}</div>
            </div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card">
            <div
              class="stat-card-icon"
              style="
                color: #6366f1;
                background: linear-gradient(135deg, #e0e7ff, #eef2ff);
              "
            >
              <icon-lock />
            </div>
            <div>
              <div class="stat-card-value">{{ roleStat.system }}</div>
              <div class="stat-card-label">{{
                $t('system.role.systemCount')
              }}</div>
            </div>
          </div>
        </a-col>
      </a-row>

      <!-- 工具栏 -->
      <div class="page-toolbar">
        <div class="page-toolbar-left">
          <a-input-search
            v-model="searchName"
            :placeholder="$t('system.role.searchPlaceholder')"
            style="width: 260px"
            @search="handleSearch"
          />
        </div>
        <div class="page-toolbar-right">
          <a-button type="primary" @click="handleCreate">
            <template #icon><icon-plus /></template>
            {{ $t('system.role.create') }}
          </a-button>
        </div>
      </div>

      <!-- 表格 -->
      <a-table
        :data="roleStore.roles"
        :loading="roleStore.loading"
        :pagination="pagination"
        row-key="id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column title="ID" data-index="id" :width="70" />
          <a-table-column
            :title="$t('system.role.name')"
            data-index="name"
            :width="120"
          >
            <template #cell="{ record }">
              <div style="display: flex; gap: 8px; align-items: center">
                <span
                  class="status-dot"
                  :class="
                    record.is_system
                      ? 'system'
                      : record.status === 'active'
                      ? 'active'
                      : 'inactive'
                  "
                />
                <strong>{{ record.name }}</strong>
              </div>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.role.displayName')"
            data-index="display_name"
            :width="140"
          />
          <a-table-column
            :title="$t('system.role.description')"
            data-index="description"
          />
          <a-table-column
            :title="$t('system.role.isSystem')"
            data-index="is_system"
            :width="100"
            align="center"
          >
            <template #cell="{ record }">
              <span v-if="record.is_system" class="gradient-badge info"
                >System</span
              >
              <span
                v-else
                class="gradient-badge"
                style="color: #64748b; background: #f1f5f9"
                >Custom</span
              >
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.role.status')"
            data-index="status"
            :width="90"
            align="center"
          >
            <template #cell="{ record }">
              <a-switch
                :model-value="record.status === 'active'"
                :disabled="record.is_system"
                size="small"
                @change="(val: string | number | boolean) => handleToggleStatus(record, val as boolean)"
              />
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.role.column.dataScope')"
            data-index="data_scope"
            :width="140"
            align="center"
          >
            <template #cell="{ record }">
              <a-tag :color="dataScopeColor(record.data_scope)">
                {{
                  $t(
                    `system.role.form.dataScope.${dataScopeKey(
                      record.data_scope
                    )}`
                  )
                }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.role.createdAt')"
            data-index="created_at"
            :width="170"
          >
            <template #cell="{ record }">
              {{ formatDateTime(record.created_at) }}
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.role.operations')"
            :width="240"
            fixed="right"
          >
            <template #cell="{ record }">
              <a-space>
                <a-button type="text" size="small" @click="handleEdit(record)">
                  <template #icon><icon-edit /></template>
                  {{ $t('common.edit') }}
                </a-button>
                <a-tooltip
                  v-if="record.name === 'admin'"
                  :content="
                    $t('system.role.assignPermission.superAdminDisabled')
                  "
                >
                  <a-button type="text" size="small" disabled>
                    <template #icon><icon-safe /></template>
                    {{ $t('system.role.assignPermission') }}
                  </a-button>
                </a-tooltip>
                <a-button
                  v-else
                  type="text"
                  size="small"
                  @click="handleAssignPermission(record)"
                >
                  <template #icon><icon-safe /></template>
                  {{ $t('system.role.assignPermission') }}
                </a-button>
                <a-popconfirm
                  :content="$t('system.role.deleteConfirm')"
                  @ok="handleDelete(record)"
                >
                  <a-button
                    type="text"
                    status="danger"
                    size="small"
                    :disabled="record.is_system"
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
    </a-card>
    <RoleForm
      v-model:visible="formVisible"
      :role="currentRole"
      @success="handleFormSuccess"
    />
    <PermissionAssign v-model:visible="permissionVisible" :role="currentRole" />
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive, computed, onMounted } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { formatDateTime } from '@/utils';
  import useRoleStore from '@/store/modules/role';
  import type { DataScope, RoleResponse } from '@/types/api';
  import RoleForm from './components/RoleForm.vue';
  import PermissionAssign from './components/PermissionAssign.vue';

  const { t } = useI18n();
  const roleStore = useRoleStore();

  const searchName = ref('');
  const formVisible = ref(false);
  const permissionVisible = ref(false);
  const currentRole = ref<RoleResponse | undefined>(undefined);
  const currentPage = ref(1);
  const pageSize = ref(10);

  const pagination = reactive({
    current: currentPage.value,
    pageSize: pageSize.value,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });

  const roleStat = computed(() => {
    const { roles, total } = roleStore;
    return {
      total,
      active: roles.filter((r) => r.status === 'active').length,
      inactive: roles.filter((r) => r.status === 'disabled').length,
      system: roles.filter((r) => r.is_system).length,
    };
  });

  // 数据权限范围 -> i18n key 映射（处理 department_and_child -> deptAndChild）
  const dataScopeKey = (scope?: DataScope): string => {
    if (!scope) return 'self';
    if (scope === 'department_and_child') return 'deptAndChild';
    return scope;
  };

  // 数据权限范围对应的标签颜色
  const dataScopeColor = (scope?: DataScope): string => {
    const map: Record<string, string> = {
      all: 'red',
      self: 'gray',
      department: 'blue',
      department_and_child: 'cyan',
      custom: 'purple',
    };
    return scope ? map[scope] || 'gray' : 'gray';
  };

  const fetchData = async () => {
    await roleStore.fetchRoles({
      page: currentPage.value,
      page_size: pageSize.value,
      keyword: searchName.value || undefined,
    });
    pagination.total = roleStore.total;
    pagination.current = currentPage.value;
  };

  const handleSearch = () => {
    currentPage.value = 1;
    fetchData();
  };

  const handlePageChange = (page: number) => {
    currentPage.value = page;
    fetchData();
  };

  const handlePageSizeChange = (size: number) => {
    pageSize.value = size;
    currentPage.value = 1;
    fetchData();
  };

  const handleCreate = () => {
    currentRole.value = undefined;
    formVisible.value = true;
  };

  const handleEdit = (record: RoleResponse) => {
    currentRole.value = record;
    formVisible.value = true;
  };

  const handleDelete = async (record: RoleResponse) => {
    try {
      await roleStore.deleteRole(record.id);
      Message.success(t('system.role.deleteSuccess'));
      fetchData();
    } catch (err) {
      // error handled by interceptor
    }
  };

  const handleToggleStatus = async (record: RoleResponse, val: boolean) => {
    try {
      await roleStore.toggleRoleStatus(record.id, val);
      fetchData();
    } catch (err) {
      // error handled by interceptor
    }
  };

  const handleAssignPermission = (record: RoleResponse) => {
    currentRole.value = record;
    permissionVisible.value = true;
  };

  const handleFormSuccess = () => {
    fetchData();
  };

  onMounted(() => {
    fetchData();
  });
</script>

<script lang="ts">
  export default {
    name: 'SystemRole',
  };
</script>
