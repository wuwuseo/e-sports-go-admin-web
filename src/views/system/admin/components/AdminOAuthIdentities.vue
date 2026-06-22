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
        <a-table-column
          title="管理员"
          data-index="admin_username"
          :width="160"
        />
        <a-table-column title="平台" data-index="provider" :width="120">
          <template #cell="{ record }">
            <a-tag color="arcoblue">{{
              getOAuthProviderLabel(record.provider)
            }}</a-tag>
          </template>
        </a-table-column>
        <a-table-column title="平台用户名" data-index="nickname" :width="180">
          <template #cell="{ record }">
            {{ record.nickname || record.platform_username || '-' }}
          </template>
        </a-table-column>
        <a-table-column title="OpenID" data-index="openid" ellipsis tooltip />
        <a-table-column title="状态" data-index="status" :width="100">
          <template #cell="{ record }">
            <a-tag :color="record.status === 'active' ? 'green' : 'red'">
              {{ record.status === 'active' ? '正常' : '停用' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="绑定时间" data-index="created_at" :width="180">
          <template #cell="{ record }">
            {{ formatDateTime(record.created_at) }}
          </template>
        </a-table-column>
        <a-table-column title="操作" :width="120" fixed="right">
          <template #cell="{ record }">
            <a-popconfirm
              content="确认解绑该 OAuth 身份？"
              @ok="handleUnbind(record.id)"
            >
              <a-button type="text" status="danger" size="small">解绑</a-button>
            </a-popconfirm>
          </template>
        </a-table-column>
      </template>
    </a-table>
  </div>
</template>

<script lang="ts" setup>
  import { reactive, ref, onMounted } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import {
    deleteAdminOAuthIdentity,
    getAdminOAuthIdentities,
  } from '@/api/oauth';
  import type { AdminOAuthIdentityListItem } from '@/types/api';
  import { formatDateTime } from '@/utils';
  import { getOAuthProviderLabel } from '@/utils/oauth';

  const items = ref<AdminOAuthIdentityListItem[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const keyword = ref('');
  const provider = ref('');
  const currentPage = ref(1);
  const pageSize = ref(10);

  const pagination = reactive({
    current: currentPage.value,
    pageSize: pageSize.value,
    total: total.value,
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
      total.value = res.data.data.total;
      pagination.current = currentPage.value;
      pagination.total = total.value;
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
    fetchData();
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
