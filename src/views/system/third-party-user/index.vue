<template>
  <div class="container page-container">
    <a-card class="general-card" :title="$t('menu.system.thirdPartyUser')">
      <div class="page-toolbar">
        <div class="page-toolbar-left">
          <a-input-search
            v-model="searchKeyword"
            :placeholder="$t('system.thirdPartyUser.searchPlaceholder')"
            style="width: 260px"
            @search="handleSearch"
          />
          <a-select
            v-model="platformFilter"
            style="width: 150px; margin-left: 12px"
            :placeholder="$t('system.thirdPartyUser.provider')"
            allow-create
            allow-search
            @change="handleSearch"
          >
            <a-option value="">{{
              $t('system.thirdPartyUser.filter.all')
            }}</a-option>
            <a-option
              v-for="platform in platformOptions"
              :key="platform"
              :value="platform"
            >
              {{ getOAuthProviderLabel(platform) }}
            </a-option>
          </a-select>
        </div>
      </div>

      <a-table
        :data="userManagementStore.thirdPartyUsers"
        :loading="userManagementStore.loading"
        :pagination="pagination"
        row-key="id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column title="ID" data-index="id" :width="70" />
          <a-table-column title="用户名" data-index="username" :width="140">
            <template #cell="{ record }">
              {{
                record.user_name || record.username || `用户 ${record.user_id}`
              }}
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.thirdPartyUser.provider')"
            data-index="platform"
            :width="120"
            align="center"
          >
            <template #cell="{ record }">
              <a-tag color="arcoblue">{{
                record.platform_name || getOAuthProviderLabel(record.platform)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="平台账号" data-index="nickname" :width="150">
            <template #cell="{ record }">
              <div style="display: flex; gap: 8px; align-items: center">
                <a-avatar
                  v-if="record.avatar_url"
                  :image-url="record.avatar_url"
                  :size="28"
                />
                <a-avatar v-else :size="28">{{
                  (
                    record.nickname ||
                    record.user_name ||
                    record.username ||
                    '-'
                  )?.charAt(0)
                }}</a-avatar>
                <span>
                  {{
                    record.nickname ||
                    record.user_name ||
                    record.username ||
                    '-'
                  }}
                </span>
              </div>
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
          <a-table-column
            :title="$t('system.thirdPartyUser.bindTime')"
            data-index="created_at"
            :width="170"
          >
            <template #cell="{ record }">
              {{ formatDateTime(record.created_at) }}
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.thirdPartyUser.operations')"
            :width="120"
            fixed="right"
          >
            <template #cell="{ record }">
              <a-popconfirm
                :content="$t('system.thirdPartyUser.unbindConfirm')"
                @ok="handleUnbind(record)"
              >
                <a-button type="text" status="danger" size="small">
                  <template #icon><icon-unlink /></template>
                  {{ $t('system.thirdPartyUser.unbind') }}
                </a-button>
              </a-popconfirm>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref, reactive, onMounted } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { formatDateTime } from '@/utils';
  import { getOAuthProviderLabel } from '@/utils/oauth';
  import useUserManagementStore from '@/store/modules/user-management';
  import type { ThirdPartyUserResponse } from '@/types/api';

  const { t } = useI18n();
  const userManagementStore = useUserManagementStore();

  const searchKeyword = ref('');
  const platformFilter = ref('');
  const currentPage = ref(1);
  const pageSize = ref(10);

  const pagination = reactive({
    current: currentPage.value,
    pageSize: pageSize.value,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });

  const platformOptions = computed(() => {
    const platforms = userManagementStore.thirdPartyUsers
      .map((item) => item.platform)
      .filter(Boolean) as string[];
    return Array.from(new Set(platforms));
  });

  const fetchData = async () => {
    await userManagementStore.fetchThirdPartyUsers({
      page: currentPage.value,
      page_size: pageSize.value,
      keyword: searchKeyword.value || undefined,
      platform: platformFilter.value || undefined,
    });
    pagination.total = userManagementStore.thirdPartyTotal;
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

  const handleUnbind = async (record: ThirdPartyUserResponse) => {
    try {
      await userManagementStore.unbindThirdPartyUser(record.id);
      Message.success(t('system.thirdPartyUser.unbindSuccess'));
      fetchData();
    } catch (err) {
      // 错误已在API层处理
    }
  };

  onMounted(() => {
    fetchData();
  });
</script>

<script lang="ts">
  export default {
    name: 'SystemThirdPartyUser',
  };
</script>
