<template>
  <div class="container page-container">
    <a-card class="general-card" :title="$t('menu.system.admin')">
      <a-row :gutter="16" style="margin-bottom: 24px">
        <a-col :span="6">
          <div class="stat-card">
            <div
              class="stat-card-icon"
              style="
                background: linear-gradient(135deg, #dbeafe, #eff6ff);
                color: #2563eb;
              "
            >
              <icon-user-group />
            </div>
            <div>
              <div class="stat-card-value">{{ adminStat.total }}</div>
              <div class="stat-card-label">{{
                $t('system.admin.stat.total')
              }}</div>
            </div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card">
            <div
              class="stat-card-icon"
              style="
                background: linear-gradient(135deg, #d1fae5, #ecfdf5);
                color: #10b981;
              "
            >
              <icon-check-circle />
            </div>
            <div>
              <div class="stat-card-value">{{ adminStat.active }}</div>
              <div class="stat-card-label">{{
                $t('system.admin.stat.active')
              }}</div>
            </div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card">
            <div
              class="stat-card-icon"
              style="
                background: linear-gradient(135deg, #fee2e2, #fef2f2);
                color: #ef4444;
              "
            >
              <icon-stop />
            </div>
            <div>
              <div class="stat-card-value">{{ adminStat.inactive }}</div>
              <div class="stat-card-label">{{
                $t('system.admin.stat.inactive')
              }}</div>
            </div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card">
            <div
              class="stat-card-icon"
              style="
                background: linear-gradient(135deg, #fef3c7, #fffbeb);
                color: #f59e0b;
              "
            >
              <icon-star />
            </div>
            <div>
              <div class="stat-card-value">{{ adminStat.superAdmin }}</div>
              <div class="stat-card-label">{{
                $t('system.admin.stat.superAdmin')
              }}</div>
            </div>
          </div>
        </a-col>
      </a-row>

      <div class="page-toolbar">
        <div class="page-toolbar-left">
          <a-input-search
            v-model="searchKeyword"
            :placeholder="$t('system.admin.searchPlaceholder')"
            style="width: 260px"
            @search="handleSearch"
          />
          <a-select
            v-model="statusFilter"
            style="width: 120px; margin-left: 12px"
            :placeholder="$t('system.admin.status')"
            @change="handleSearch"
          >
            <a-option value="">{{ $t('common.all') }}</a-option>
            <a-option value="active">{{ $t('common.status.active') }}</a-option>
            <a-option value="inactive">{{
              $t('common.status.inactive')
            }}</a-option>
          </a-select>
        </div>
        <div class="page-toolbar-right">
          <a-button
            type="primary"
            style="margin-left: 12px"
            @click="handleCreate"
          >
            <template #icon><icon-plus /></template>
            {{ $t('system.admin.create') }}
          </a-button>
        </div>
      </div>

      <a-table
        :data="adminStore.items"
        :loading="adminStore.loading"
        :pagination="pagination"
        row-key="id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column title="ID" data-index="id" :width="70" />
          <a-table-column
            :title="$t('system.admin.username')"
            data-index="username"
            :width="130"
          >
            <template #cell="{ record }">
              <div style="display: flex; align-items: center; gap: 8px">
                <a-avatar :size="28">{{
                  record.username.charAt(0).toUpperCase()
                }}</a-avatar>
                <strong>{{ record.username }}</strong>
              </div>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.admin.email')"
            data-index="email"
            :width="180"
          />
          <a-table-column
            :title="$t('system.admin.phone')"
            data-index="phone"
            :width="130"
          >
            <template #cell="{ record }">
              {{ record.phone || '-' }}
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.admin.isSuperAdmin')"
            data-index="is_super_admin"
            :width="110"
            align="center"
          >
            <template #cell="{ record }">
              <a-tag v-if="record.is_super_admin" color="orangered">
                {{ $t('common.yes') }}
              </a-tag>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.admin.status')"
            data-index="status"
            :width="100"
            align="center"
          >
            <template #cell="{ record }">
              <a-tag :color="record.status === 'active' ? 'green' : 'red'">
                {{
                  record.status === 'active'
                    ? $t('common.status.active')
                    : $t('common.status.inactive')
                }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.admin.lastLoginAt')"
            data-index="last_login_at"
            :width="170"
          >
            <template #cell="{ record }">
              {{
                record.last_login_at
                  ? formatDateTime(record.last_login_at)
                  : '-'
              }}
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.admin.createdAt')"
            data-index="created_at"
            :width="170"
          >
            <template #cell="{ record }">
              {{ formatDateTime(record.created_at) }}
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.admin.operations')"
            :width="200"
            fixed="right"
          >
            <template #cell="{ record }">
              <a-space>
                <a-button type="text" size="small" @click="handleView(record)">
                  <template #icon><icon-eye /></template>
                  {{ $t('common.view') }}
                </a-button>
                <a-button type="text" size="small" @click="handleEdit(record)">
                  <template #icon><icon-edit /></template>
                  {{ $t('common.edit') }}
                </a-button>
                <a-dropdown
                  @select="
                    (val: any) => handleActionSelect(val as string, record)
                  "
                >
                  <a-button type="text" size="small">
                    <template #icon><icon-more /></template>
                    更多
                  </a-button>
                  <template #content>
                    <a-doption
                      v-if="record.status === 'inactive'"
                      value="activate"
                    >
                      <template #icon><icon-play-circle /></template>
                      {{ $t('system.admin.activate') }}
                    </a-doption>
                    <a-doption
                      v-if="record.status === 'active'"
                      value="deactivate"
                    >
                      <template #icon><icon-pause-circle /></template>
                      {{ $t('system.admin.deactivate') }}
                    </a-doption>
                    <a-doption value="assignRole">
                      <template #icon><icon-safe /></template>
                      {{ $t('system.admin.assignRole') }}
                    </a-doption>
                  </template>
                </a-dropdown>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>
    <AdminForm
      v-model:visible="formVisible"
      :admin="currentAdmin"
      :mode="formMode"
      @success="handleFormSuccess"
    />
    <RoleAssign
      v-model:visible="roleAssignVisible"
      :admin="currentAdmin"
      @success="handleFormSuccess"
    />
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive, computed, onMounted } from 'vue';
  import { Message, Modal } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { formatDateTime } from '@/utils';
  import useAdminManagementStore from '@/store/modules/admin-management';
  import type { AdminResponse, AdminDetailResponse } from '@/types/api';
  import AdminForm from './components/AdminForm.vue';
  import RoleAssign from './components/RoleAssign.vue';

  const { t } = useI18n();
  const adminStore = useAdminManagementStore();

  const searchKeyword = ref('');
  const statusFilter = ref('');
  const formVisible = ref(false);
  const roleAssignVisible = ref(false);
  const currentAdmin = ref<AdminDetailResponse | undefined>(undefined);
  const formMode = ref<'create' | 'edit' | 'view'>('create');
  const currentPage = ref(1);
  const pageSize = ref(10);

  const pagination = reactive({
    current: currentPage.value,
    pageSize: pageSize.value,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });

  const adminStat = computed(() => {
    const { items } = adminStore;
    return {
      total: adminStore.total,
      active: items.filter((u) => u.status === 'active').length,
      inactive: items.filter((u) => u.status === 'inactive').length,
      superAdmin: items.filter((u) => u.is_super_admin).length,
    };
  });

  const fetchData = async () => {
    await adminStore.fetchList({
      page: currentPage.value,
      page_size: pageSize.value,
      keyword: searchKeyword.value || undefined,
      status: (statusFilter.value as 'active' | 'inactive') || undefined,
    });
    pagination.total = adminStore.total;
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
    currentAdmin.value = undefined;
    formMode.value = 'create';
    formVisible.value = true;
  };

  const handleEdit = (record: AdminResponse) => {
    currentAdmin.value = record as AdminDetailResponse;
    formMode.value = 'edit';
    formVisible.value = true;
  };

  const handleView = (record: AdminResponse) => {
    currentAdmin.value = record as AdminDetailResponse;
    formMode.value = 'view';
    formVisible.value = true;
  };

  const handleActivate = async (record: AdminResponse) => {
    try {
      await adminStore.activateAdmin(record.id);
      Message.success(t('system.admin.activateSuccess'));
      fetchData();
    } catch (err) {
      // 错误已在API层处理
    }
  };

  const handleDeactivate = async (record: AdminResponse) => {
    try {
      await adminStore.deactivateAdmin(record.id);
      Message.success(t('system.admin.deactivateSuccess'));
      fetchData();
    } catch (err) {
      // 错误已在API层处理
    }
  };

  const handleAssignRole = (record: AdminResponse) => {
    currentAdmin.value = record as AdminDetailResponse;
    roleAssignVisible.value = true;
  };

  const handleActionSelect = (action: string, record: AdminResponse) => {
    switch (action) {
      case 'activate':
        Modal.confirm({
          title: t('system.admin.activateConfirm'),
          content: '',
          onOk: () => handleActivate(record),
        });
        break;
      case 'deactivate':
        Modal.confirm({
          title: t('system.admin.deactivateConfirm'),
          content: '',
          onOk: () => handleDeactivate(record),
        });
        break;
      case 'assignRole':
        handleAssignRole(record);
        break;
      default:
        break;
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
    name: 'SystemAdmin',
  };
</script>

<style scoped>
  .stat-card {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .stat-card-icon {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-card-value {
    font-size: 24px;
    font-weight: 700;
    color: #1e293b;
  }

  .stat-card-label {
    font-size: 13px;
    color: #64748b;
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
</style>
