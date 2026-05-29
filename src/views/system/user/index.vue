<template>
  <div class="container">
    <a-card class="general-card" :title="$t('menu.system.user')">
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
              <icon-user />
            </div>
            <div>
              <div class="stat-card-value">{{ userStat.total }}</div>
              <div class="stat-card-label">{{
                $t('system.user.stat.total')
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
              <div class="stat-card-value">{{ userStat.active }}</div>
              <div class="stat-card-label">{{
                $t('system.user.stat.active')
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
              <div class="stat-card-value">{{ userStat.inactive }}</div>
              <div class="stat-card-label">{{
                $t('system.user.stat.inactive')
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
              <icon-ban />
            </div>
            <div>
              <div class="stat-card-value">{{ userStat.blacklisted }}</div>
              <div class="stat-card-label">{{
                $t('system.user.stat.blacklisted')
              }}</div>
            </div>
          </div>
        </a-col>
      </a-row>

      <div class="page-toolbar">
        <div class="page-toolbar-left">
          <a-input-search
            v-model="searchKeyword"
            :placeholder="$t('system.user.searchPlaceholder')"
            style="width: 260px"
            @search="handleSearch"
          />
          <a-select
            v-model="statusFilter"
            style="width: 120px; margin-left: 12px"
            :placeholder="$t('system.user.form.status')"
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
            {{ $t('system.user.create') }}
          </a-button>
        </div>
      </div>

      <a-table
        :data="userManagementStore.items"
        :loading="userManagementStore.loading"
        :pagination="pagination"
        row-key="id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column title="ID" data-index="id" :width="70" />
          <a-table-column
            :title="$t('system.user.username')"
            data-index="username"
            :width="120"
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
            :title="$t('system.user.email')"
            data-index="email"
            :width="180"
          />
          <a-table-column
            :title="$t('system.user.phone')"
            data-index="phone"
            :width="130"
          >
            <template #cell="{ record }">
              {{ record.phone || '-' }}
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.user.status')"
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
            :title="$t('system.user.isBlacklisted')"
            data-index="is_blacklisted"
            :width="100"
            align="center"
          >
            <template #cell="{ record }">
              <a-tag v-if="record.is_blacklisted" color="red">
                {{ $t('common.yes') }}
              </a-tag>
              <span v-else>-</span>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.user.lastLoginAt')"
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
            :title="$t('system.user.createdAt')"
            data-index="created_at"
            :width="170"
          >
            <template #cell="{ record }">
              {{ formatDateTime(record.created_at) }}
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.user.operations')"
            :width="280"
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
                  @select="(val: any) => handleActionSelect(val as string, record)"
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
                      {{ $t('system.user.activate') }}
                    </a-doption>
                    <a-doption
                      v-if="record.status === 'active'"
                      value="deactivate"
                    >
                      <template #icon><icon-pause-circle /></template>
                      {{ $t('system.user.deactivate') }}
                    </a-doption>
                    <a-doption
                      v-if="!record.is_blacklisted"
                      value="blacklist"
                      style="color: #f5222d"
                    >
                      <template #icon><icon-ban /></template>
                      {{ $t('system.user.addToBlacklist') }}
                    </a-doption>
                    <a-doption v-if="record.is_blacklisted" value="unblacklist">
                      <template #icon><icon-check-circle /></template>
                      {{ $t('system.user.removeFromBlacklist') }}
                    </a-doption>
                    <a-doption value="assignRole">
                      <template #icon><icon-safe /></template>
                      {{ $t('system.user.assignRole') }}
                    </a-doption>
                    <a-doption value="delete" style="color: #f5222d">
                      <template #icon><icon-delete /></template>
                      {{ $t('common.delete') }}
                    </a-doption>
                  </template>
                </a-dropdown>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>
    <UserForm
      v-model:visible="formVisible"
      :user="currentUser"
      :mode="formMode"
      @success="handleFormSuccess"
    />
    <RoleAssign
      v-model:visible="roleAssignVisible"
      :user="currentUser"
      @success="handleFormSuccess"
    />
    <BlacklistForm
      v-model:visible="blacklistVisible"
      :user="currentUser"
      @success="handleFormSuccess"
    />
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive, computed, onMounted } from 'vue';
  import { Message, Modal } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { formatDateTime } from '@/utils';
  import useUserManagementStore from '@/store/modules/user-management';
  import type { UserResponse, UserDetailResponse } from '@/types/api';
  import UserForm from './components/UserForm.vue';
  import RoleAssign from './components/RoleAssign.vue';
  import BlacklistForm from './components/BlacklistForm.vue';

  const { t } = useI18n();
  const userManagementStore = useUserManagementStore();

  const searchKeyword = ref('');
  const statusFilter = ref('');
  const formVisible = ref(false);
  const roleAssignVisible = ref(false);
  const blacklistVisible = ref(false);
  const currentUser = ref<UserResponse | UserDetailResponse | undefined>(
    undefined
  );
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

  const userStat = computed(() => {
    const { items } = userManagementStore;
    return {
      total: userManagementStore.total,
      active: items.filter((u) => u.status === 'active').length,
      inactive: items.filter((u) => u.status === 'inactive').length,
      blacklisted: items.filter((u) => u.is_blacklisted).length,
    };
  });

  const fetchData = async () => {
    await userManagementStore.fetchUsers({
      page: currentPage.value,
      page_size: pageSize.value,
      keyword: searchKeyword.value || undefined,
      status: (statusFilter.value as 'active' | 'inactive') || undefined,
    });
    pagination.total = userManagementStore.total;
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
    currentUser.value = undefined;
    formMode.value = 'create';
    formVisible.value = true;
  };

  const handleEdit = (record: UserResponse) => {
    currentUser.value = record;
    formMode.value = 'edit';
    formVisible.value = true;
  };

  const handleView = (record: UserResponse) => {
    currentUser.value = record;
    formMode.value = 'view';
    formVisible.value = true;
  };

  const handleDelete = async (record: UserResponse) => {
    try {
      await userManagementStore.deleteUser(record.id);
      Message.success(t('system.user.deleteSuccess'));
      fetchData();
    } catch (err) {
      // 错误已在API层处理
    }
  };

  const handleActivate = async (record: UserResponse) => {
    try {
      await userManagementStore.activateUser(record.id);
      Message.success(t('system.user.activateSuccess'));
      fetchData();
    } catch (err) {
      // 错误已在API层处理
    }
  };

  const handleDeactivate = async (record: UserResponse) => {
    try {
      await userManagementStore.deactivateUser(record.id);
      Message.success(t('system.user.deactivateSuccess'));
      fetchData();
    } catch (err) {
      // 错误已在API层处理
    }
  };

  const handleAddToBlacklist = (record: UserResponse) => {
    currentUser.value = record;
    blacklistVisible.value = true;
  };

  const handleRemoveFromBlacklist = async (record: UserResponse) => {
    Modal.confirm({
      title: t('system.user.removeBlacklistConfirm'),
      content: '',
      onOk: async () => {
        try {
          await userManagementStore.removeFromBlacklist(record.id);
          Message.success(t('system.user.removeFromBlacklistSuccess'));
          fetchData();
        } catch (err) {
          // 错误已在API层处理
        }
      },
    });
  };

  const handleAssignRole = (record: UserResponse) => {
    currentUser.value = record;
    roleAssignVisible.value = true;
  };

  const handleActionSelect = (action: string, record: UserResponse) => {
    switch (action) {
      case 'activate':
        Modal.confirm({
          title: t('system.user.activateConfirm'),
          content: '',
          onOk: () => handleActivate(record),
        });
        break;
      case 'deactivate':
        Modal.confirm({
          title: t('system.user.deactivateConfirm'),
          content: '',
          onOk: () => handleDeactivate(record),
        });
        break;
      case 'blacklist':
        handleAddToBlacklist(record);
        break;
      case 'unblacklist':
        handleRemoveFromBlacklist(record);
        break;
      case 'assignRole':
        handleAssignRole(record);
        break;
      case 'delete':
        Modal.confirm({
          title: t('system.user.deleteConfirm'),
          content: '',
          onOk: () => handleDelete(record),
        });
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
    name: 'SystemUser',
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
    font-size: 20px;
  }

  .stat-card-value {
    font-size: 20px;
    font-weight: 600;
    color: #1d2129;
  }

  .stat-card-label {
    font-size: 13px;
    color: #86909c;
  }
</style>
