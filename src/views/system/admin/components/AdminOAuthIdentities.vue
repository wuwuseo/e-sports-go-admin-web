<template>
  <div class="admin-oauth-identities">
    <div class="page-toolbar">
      <a-space>
        <a-input-search
          v-model="keyword"
          placeholder="搜索管理员、平台用户名或 OpenID"
          style="width: 280px"
          @search="handleSearch"
        />
        <a-select
          v-model="provider"
          placeholder="Provider"
          allow-clear
          style="width: 160px"
          @change="handleSearch"
        >
          <a-option value="github">GitHub</a-option>
        </a-select>
      </a-space>
    </div>

    <a-table
      :data="items"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      @page-change="handlePageChange"
      @page-size-change="handlePageSizeChange"
    >
      <template #columns>
        <a-table-column title="管理员" :width="220">
          <template #cell="{ record }">
            <a-space>
              <a-avatar :size="32">
                {{ (record.admin_name || record.admin_email || '-').charAt(0) }}
              </a-avatar>
              <div>
                <div>{{ record.admin_name || record.admin_uid }}</div>
                <a-typography-text type="secondary">
                  {{ record.admin_email || record.admin_uid }}
                </a-typography-text>
              </div>
            </a-space>
          </template>
        </a-table-column>
        <a-table-column title="平台" data-index="provider" :width="120">
          <template #cell="{ record }">
            <a-tag color="arcoblue">
              {{
                record.display_name || getOAuthProviderLabel(record.provider)
              }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="平台用户" data-index="nickname" :width="190">
          <template #cell="{ record }">
            <a-space>
              <a-avatar
                v-if="record.avatar_url"
                :size="28"
                :image-url="record.avatar_url"
              />
              <span>{{ record.nickname || '-' }}</span>
            </a-space>
          </template>
        </a-table-column>
        <a-table-column title="OpenID" data-index="openid" ellipsis tooltip />
        <a-table-column title="状态" data-index="status" :width="100">
          <template #cell="{ record }">
            <a-tag :color="record.status === 'active' ? 'green' : 'red'">
              {{ record.status === 'active' ? '正常' : record.status }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="最近同步" data-index="last_sync_at" :width="180">
          <template #cell="{ record }">
            {{
              record.last_sync_at ? formatDateTime(record.last_sync_at) : '-'
            }}
          </template>
        </a-table-column>
        <a-table-column title="绑定时间" data-index="created_at" :width="180">
          <template #cell="{ record }">
            {{ formatDateTime(record.created_at) }}
          </template>
        </a-table-column>
        <a-table-column
          v-if="canDelete"
          title="操作"
          :width="100"
          fixed="right"
        >
          <template #cell="{ record }">
            <a-popconfirm
              content="确认解绑该 OAuth 身份？"
              @ok="handleUnbind(record.id)"
            >
              <a-button type="text" status="danger" size="small">
                解绑
              </a-button>
            </a-popconfirm>
          </template>
        </a-table-column>
      </template>
    </a-table>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import {
    deleteAdminOAuthIdentity,
    getAdminOAuthIdentities,
  } from '@/api/oauth';
  import { useUserStore } from '@/store';
  import type { AdminOAuthIdentityListItem } from '@/types/api';
  import { formatDateTime } from '@/utils';
  import { getOAuthProviderLabel } from '@/utils/oauth';

  const userStore = useUserStore();
  const items = ref<AdminOAuthIdentityListItem[]>([]);
  const loading = ref(false);
  const keyword = ref('');
  const provider = ref('');
  const currentPage = ref(1);
  const pageSize = ref(10);
  const canDelete = computed(() =>
    userStore.hasAnyPermission(['admin-oauth:delete'])
  );

  const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });

  const fetchData = async () => {
    loading.value = true;
    try {
      const res = await getAdminOAuthIdentities({
        page: currentPage.value,
        page_size: pageSize.value,
        keyword: keyword.value || undefined,
        provider: provider.value || undefined,
      });
      items.value = res.data.data.data;
      pagination.current = currentPage.value;
      pagination.pageSize = pageSize.value;
      pagination.total = res.data.data.total;
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

  const handleUnbind = async (id: number) => {
    await deleteAdminOAuthIdentity(id);
    Message.success('解绑成功');
    await fetchData();
  };

  onMounted(fetchData);
</script>

<style lang="less" scoped>
  .admin-oauth-identities {
    .page-toolbar {
      margin-bottom: 16px;
    }
  }
</style>
