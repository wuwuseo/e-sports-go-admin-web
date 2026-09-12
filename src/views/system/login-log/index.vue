<template>
  <div class="container page-container">
    <a-card class="general-card" :title="$t('menu.system.loginLog')">
      <!-- 筛选栏 -->
      <a-row style="margin-bottom: 20px">
        <a-col :span="24">
          <a-space wrap>
            <a-input
              v-model="searchForm.username"
              :placeholder="$t('system.loginLog.username.placeholder')"
              style="width: 160px"
              allow-clear
            >
              <template #prefix><icon-user /></template>
            </a-input>
            <a-select
              v-model="searchForm.login_type"
              :placeholder="$t('system.loginLog.loginType.placeholder')"
              style="width: 150px"
              allow-clear
            >
              <a-option value="admin">{{
                $t('system.loginLog.loginType.admin')
              }}</a-option>
              <a-option value="user">{{
                $t('system.loginLog.loginType.user')
              }}</a-option>
            </a-select>
            <a-select
              v-model="searchForm.status"
              :placeholder="$t('system.loginLog.status.placeholder')"
              style="width: 130px"
              allow-clear
            >
              <a-option value="success">{{
                $t('system.loginLog.status.success')
              }}</a-option>
              <a-option value="fail">{{
                $t('system.loginLog.status.fail')
              }}</a-option>
            </a-select>
            <a-input
              v-model="searchForm.ip"
              :placeholder="$t('system.loginLog.ip.placeholder')"
              style="width: 160px"
              allow-clear
            />
            <a-range-picker
              v-model="timeRange"
              style="width: 300px"
              show-time
            />
            <a-button type="primary" @click="handleSearch">
              <template #icon><icon-search /></template>
              {{ $t('system.loginLog.search') }}
            </a-button>
            <a-button @click="handleReset">
              <template #icon><icon-refresh /></template>
              {{ $t('system.loginLog.reset') }}
            </a-button>
          </a-space>
        </a-col>
      </a-row>

      <!-- 表格 -->
      <a-table
        :data="logList"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column title="ID" data-index="id" :width="65" />
          <a-table-column
            :title="$t('system.loginLog.username')"
            data-index="username"
            :width="110"
          />
          <a-table-column
            :title="$t('system.loginLog.loginType')"
            data-index="login_type"
            :width="110"
          >
            <template #cell="{ record }">
              <a-tag
                :color="record.login_type === 'admin' ? 'arcoblue' : 'gray'"
              >
                {{
                  record.login_type === 'admin'
                    ? $t('system.loginLog.loginType.admin')
                    : $t('system.loginLog.loginType.user')
                }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.loginLog.status')"
            data-index="status"
            :width="90"
            align="center"
          >
            <template #cell="{ record }">
              <a-tag :color="record.status === 'success' ? 'green' : 'red'">
                {{
                  record.status === 'success'
                    ? $t('system.loginLog.status.success')
                    : $t('system.loginLog.status.fail')
                }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.loginLog.message')"
            data-index="message"
            :ellipsis="true"
            :tooltip="true"
          />
          <a-table-column
            :title="$t('system.loginLog.ip')"
            data-index="ip"
            :width="130"
          />
          <a-table-column
            :title="$t('system.loginLog.browser')"
            data-index="browser"
            :width="110"
          />
          <a-table-column
            :title="$t('system.loginLog.os')"
            data-index="os"
            :width="110"
          />
          <a-table-column
            :title="$t('system.loginLog.createdAt')"
            data-index="created_at"
            :width="170"
          >
            <template #cell="{ record }">
              {{ formatDateTime(record.created_at) }}
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.loginLog.operations')"
            :width="100"
            fixed="right"
          >
            <template #cell="{ record }">
              <a-button
                type="text"
                size="small"
                @click="handleViewDetail(record)"
              >
                <template #icon><icon-eye /></template>
                {{ $t('system.loginLog.viewDetail') }}
              </a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <LoginLogDetail v-model:visible="detailVisible" :detail="currentLog" />
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive, onMounted } from 'vue';
  import { getLoginLogs } from '@/api/login-log';
  import type { LoginLogResponse } from '@/types/api';
  import { formatDateTime } from '@/utils';
  import LoginLogDetail from './components/LoginLogDetail.vue';

  const loading = ref(false);
  const logList = ref<LoginLogResponse[]>([]);
  const detailVisible = ref(false);
  const currentLog = ref<LoginLogResponse | undefined>(undefined);
  const currentPage = ref(1);
  const pageSize = ref(10);
  const timeRange = ref<string[]>([]);

  const searchForm = reactive({
    username: '',
    login_type: undefined as string | undefined,
    status: undefined as string | undefined,
    ip: '',
  });

  const pagination = reactive({
    current: currentPage.value,
    pageSize: pageSize.value,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });

  const fetchData = async () => {
    loading.value = true;
    try {
      const params: Record<string, any> = {
        page: currentPage.value,
        page_size: pageSize.value,
      };
      if (searchForm.username) {
        params.username = searchForm.username;
      }
      if (searchForm.login_type) {
        params.login_type = searchForm.login_type;
      }
      if (searchForm.status) {
        params.status = searchForm.status;
      }
      if (searchForm.ip) {
        params.ip = searchForm.ip;
      }
      if (timeRange.value && timeRange.value.length === 2) {
        [params.start_time, params.end_time] = timeRange.value;
      }
      const { data: responseData } = await getLoginLogs(params);
      // 兼容 Swagger 返回的 items 字段和标准 PaginatedResponse 的 data 字段
      const result = responseData.data as any;
      if (result) {
        logList.value = result.items || result.data || [];
        pagination.total = result.total || 0;
      }
      pagination.current = currentPage.value;
    } finally {
      loading.value = false;
    }
  };

  const handleSearch = () => {
    currentPage.value = 1;
    fetchData();
  };

  const handleReset = () => {
    searchForm.username = '';
    searchForm.login_type = undefined;
    searchForm.status = undefined;
    searchForm.ip = '';
    timeRange.value = [];
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

  const handleViewDetail = (record: LoginLogResponse) => {
    currentLog.value = record;
    detailVisible.value = true;
  };

  onMounted(() => {
    fetchData();
  });
</script>

<script lang="ts">
  export default {
    name: 'SystemLoginLog',
  };
</script>
