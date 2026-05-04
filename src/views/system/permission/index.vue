<template>
  <div class="container">
    <a-card class="general-card" :title="$t('menu.system.permission')">
      <!-- 工具栏 -->
      <div class="page-toolbar">
        <div class="page-toolbar-left">
          <a-select
            v-model="filterType"
            :placeholder="$t('system.permission.filterType')"
            style="width: 140px"
            allow-clear
            @change="handleSearch"
          >
            <a-option value="api">API</a-option>
            <a-option value="menu">Menu</a-option>
            <a-option value="button">Button</a-option>
          </a-select>
          <a-select
            v-model="filterDomain"
            placeholder="选择域"
            style="width: 140px"
            allow-clear
            @change="handleSearch"
          >
            <a-option value="admin">admin</a-option>
            <a-option value="system">system</a-option>
            <a-option value="public">public</a-option>
          </a-select>
          <a-input-search
            v-model="searchKeyword"
            :placeholder="$t('system.permission.searchPlaceholder')"
            style="width: 220px"
            @search="handleSearch"
          />
        </div>
        <div class="page-toolbar-right">
          <a-button type="primary" @click="handleCreate">
            <template #icon><icon-plus /></template>
            {{ $t('system.permission.create') }}
          </a-button>
        </div>
      </div>

      <!-- 权限类型统计 -->
      <a-row :gutter="12" style="margin-bottom: 20px">
        <a-col :span="8">
          <div class="stat-card" style="padding: 10px 16px">
            <div
              class="stat-card-icon"
              style="
                width: 32px;
                height: 32px;
                font-size: 14px;
                background: linear-gradient(135deg, #dbeafe, #eff6ff);
                color: #2563eb;
              "
            >
              API
            </div>
            <div>
              <div class="stat-card-value" style="font-size: 16px">{{
                typeCount.api
              }}</div>
              <div class="stat-card-label">API 权限</div>
            </div>
          </div>
        </a-col>
        <a-col :span="8">
          <div class="stat-card" style="padding: 10px 16px">
            <div
              class="stat-card-icon"
              style="
                width: 32px;
                height: 32px;
                font-size: 14px;
                background: linear-gradient(135deg, #d1fae5, #ecfdf5);
                color: #10b981;
              "
            >
              <icon-menu />
            </div>
            <div>
              <div class="stat-card-value" style="font-size: 16px">{{
                typeCount.menu
              }}</div>
              <div class="stat-card-label">菜单权限</div>
            </div>
          </div>
        </a-col>
        <a-col :span="8">
          <div class="stat-card" style="padding: 10px 16px">
            <div
              class="stat-card-icon"
              style="
                width: 32px;
                height: 32px;
                font-size: 14px;
                background: linear-gradient(135deg, #fef3c7, #fffbeb);
                color: #f59e0b;
              "
            >
              <icon-thumb-up />
            </div>
            <div>
              <div class="stat-card-value" style="font-size: 16px">{{
                typeCount.button
              }}</div>
              <div class="stat-card-label">按钮权限</div>
            </div>
          </div>
        </a-col>
      </a-row>

      <!-- 表格 -->
      <a-table
        :data="permissionList"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column title="ID" data-index="id" :width="70" />
          <a-table-column
            :title="$t('system.permission.roleName')"
            data-index="role_name"
            :width="130"
          />
          <a-table-column
            :title="$t('system.permission.domain')"
            data-index="domain"
            :width="100"
          >
            <template #cell="{ record }">
              <a-tag :color="domainColorMap[record.domain] || 'gray'">{{
                record.domain
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.permission.object')"
            data-index="object"
            :ellipsis="true"
            :tooltip="true"
          />
          <a-table-column
            :title="$t('system.permission.action')"
            data-index="action"
            :width="110"
          />
          <a-table-column
            :title="$t('system.permission.type')"
            data-index="type"
            :width="90"
            align="center"
          >
            <template #cell="{ record }">
              <span
                class="gradient-badge"
                :class="typeBadgeClass(record.type)"
                >{{ record.type }}</span
              >
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.permission.description')"
            data-index="description"
            :ellipsis="true"
          />
          <a-table-column
            :title="$t('system.permission.operations')"
            :width="160"
            fixed="right"
          >
            <template #cell="{ record }">
              <a-space>
                <a-button type="text" size="small" @click="handleEdit(record)">
                  <template #icon><icon-edit /></template>
                  {{ $t('common.edit') }}
                </a-button>
                <a-popconfirm
                  :content="$t('system.permission.deleteConfirm')"
                  @ok="handleDelete(record)"
                >
                  <a-button type="text" status="danger" size="small">
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
    <PermissionForm
      v-model:visible="formVisible"
      :permission="currentPermission"
      @success="handleFormSuccess"
    />
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive, computed, onMounted } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { getPermissions, deletePermission } from '@/api/permission';
  import type { PermissionResponse, PermissionType } from '@/types/api';
  import PermissionForm from './components/PermissionForm.vue';

  const { t } = useI18n();

  const searchKeyword = ref('');
  const filterType = ref<PermissionType | ''>('');
  const filterDomain = ref('');
  const loading = ref(false);
  const formVisible = ref(false);
  const currentPermission = ref<PermissionResponse | undefined>(undefined);
  const permissionList = ref<PermissionResponse[]>([]);
  const totalPermissions = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(10);

  const pagination = reactive({
    current: currentPage.value,
    pageSize: pageSize.value,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });

  const domainColorMap: Record<string, string> = {
    admin: 'purple',
    system: 'blue',
    public: 'green',
  };

  const typeCount = computed(() => {
    const list = permissionList.value;
    return {
      api: list.filter((p) => p.type === 'api').length,
      menu: list.filter((p) => p.type === 'menu').length,
      button: list.filter((p) => p.type === 'button').length,
    };
  });

  const typeBadgeClass = (type: string) => {
    const map: Record<string, string> = {
      api: 'primary',
      menu: 'success',
      button: 'warning',
    };
    return map[type] || '';
  };

  const fetchData = async () => {
    loading.value = true;
    try {
      const res = await getPermissions({
        page: currentPage.value,
        page_size: pageSize.value,
        keyword: searchKeyword.value || undefined,
        type: (filterType.value as PermissionType) || undefined,
        domain: filterDomain.value || undefined,
      });
      permissionList.value = res.data.data.data;
      totalPermissions.value = res.data.data.total;
      pagination.total = res.data.data.total;
      pagination.current = currentPage.value;
    } finally {
      loading.value = false;
    }
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
    currentPermission.value = undefined;
    formVisible.value = true;
  };

  const handleEdit = (record: PermissionResponse) => {
    currentPermission.value = record;
    formVisible.value = true;
  };

  const handleDelete = async (record: PermissionResponse) => {
    try {
      await deletePermission({ id: record.id });
      Message.success(t('system.permission.deleteSuccess'));
      fetchData();
    } catch (err) {
      // error handled by interceptor
    }
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
    name: 'SystemPermission',
  };
</script>
