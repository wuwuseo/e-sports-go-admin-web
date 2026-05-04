<template>
  <div class="container">
    <a-card class="general-card" :title="$t('menu.system.operationLog')">
      <!-- 筛选栏 -->
      <a-row style="margin-bottom: 20px">
        <a-col :span="24">
          <a-space wrap>
            <a-input
              v-model="searchForm.username"
              :placeholder="$t('system.operationLog.username.placeholder')"
              style="width: 160px"
              allow-clear
            >
              <template #prefix><icon-user /></template>
            </a-input>
            <a-select
              v-model="searchForm.module"
              :placeholder="$t('system.operationLog.module.placeholder')"
              style="width: 150px"
              allow-clear
            >
              <a-option value="auth">认证</a-option>
              <a-option value="user">用户</a-option>
              <a-option value="role">角色</a-option>
              <a-option value="permission">权限</a-option>
              <a-option value="attachment">附件</a-option>
              <a-option value="cron">定时任务</a-option>
              <a-option value="system">系统</a-option>
            </a-select>

            <a-range-picker
              v-model="timeRange"
              style="width: 300px"
              show-time
            />
            <a-button type="primary" @click="handleSearch">
              <template #icon><icon-search /></template>
              {{ $t('system.operationLog.search') }}
            </a-button>
            <a-button @click="handleReset">
              <template #icon><icon-refresh /></template>
              {{ $t('system.operationLog.reset') }}
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
            :title="$t('system.operationLog.username')"
            data-index="username"
            :width="100"
          />
          <a-table-column
            :title="$t('system.operationLog.module')"
            data-index="module"
            :width="90"
          >
            <template #cell="{ record }">
              <a-tag :color="moduleColorMap[record.module] || 'gray'">{{
                record.module
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.operationLog.action')"
            data-index="action"
            :width="90"
          />
          <a-table-column
            :title="$t('system.operationLog.path')"
            data-index="path"
            :ellipsis="true"
            :tooltip="true"
          />
          <a-table-column
            :title="$t('system.operationLog.method')"
            data-index="method"
            :width="80"
            align="center"
          >
            <template #cell="{ record }">
              <a-tag
                :color="methodColorMap[record.method] || 'gray'"
                size="small"
              >
                {{ record.method }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.operationLog.statusCode')"
            data-index="status_code"
            :width="90"
            align="center"
          >
            <template #cell="{ record }">
              <a-tag
                :color="
                  record.status_code >= 200 && record.status_code < 300
                    ? 'green'
                    : 'red'
                "
                size="small"
              >
                {{ record.status_code }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.operationLog.ip')"
            data-index="ip"
            :width="130"
          />
          <a-table-column
            :title="$t('system.operationLog.duration')"
            data-index="duration_ms"
            :width="90"
          >
            <template #cell="{ record }">
              <span
                :style="{
                  color: record.duration_ms > 1000 ? '#ef4444' : '#64748b',
                }"
              >
                {{ record.duration_ms }}ms
              </span>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.operationLog.createdAt')"
            data-index="created_at"
            :width="170"
          >
            <template #cell="{ record }">
              {{ formatDateTime(record.created_at) }}
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.operationLog.operations')"
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
                {{ $t('system.operationLog.viewDetail') }}
              </a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <LogDetail v-model:visible="detailVisible" :detail="currentLog" />
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive, onMounted } from 'vue';
  import { getOperationLogs } from '@/api/operation-log';
  import type { OperationLogResponse } from '@/types/api';
  import { formatDateTime } from '@/utils';
  import LogDetail from './components/LogDetail.vue';

  const loading = ref(false);
  const logList = ref<OperationLogResponse[]>([]);
  const detailVisible = ref(false);
  const currentLog = ref<OperationLogResponse | undefined>(undefined);
  const currentPage = ref(1);
  const pageSize = ref(10);
  const timeRange = ref<string[]>([]);

  const searchForm = reactive({
    username: '',
    module: undefined as string | undefined,
  });

  const pagination = reactive({
    current: currentPage.value,
    pageSize: pageSize.value,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });

  const methodColorMap: Record<string, string> = {
    GET: 'green',
    POST: 'blue',
    PUT: 'orange',
    DELETE: 'red',
    PATCH: 'purple',
  };

  const moduleColorMap: Record<string, string> = {
    auth: 'blue',
    user: 'green',
    role: 'purple',
    permission: 'orange',
    attachment: 'cyan',
    cron: 'arcoblue',
    system: 'gray',
  };

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
      if (searchForm.module) {
        params.module = searchForm.module;
      }
      if (timeRange.value && timeRange.value.length === 2) {
        [params.start_time, params.end_time] = timeRange.value;
      }
      const { data: responseData } = await getOperationLogs(params);
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
    searchForm.module = undefined;
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

  const handleViewDetail = (record: OperationLogResponse) => {
    currentLog.value = record;
    detailVisible.value = true;
  };

  onMounted(() => {
    fetchData();
  });
</script>

<script lang="ts">
  export default {
    name: 'SystemOperationLog',
  };
</script>
