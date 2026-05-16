<template>
  <div class="container">
    <a-card class="general-card" :title="$t('menu.system.cronJob')">
      <!-- 工具栏 -->
      <div class="page-toolbar">
        <div class="page-toolbar-left">
          <a-input-search
            v-model="searchName"
            :placeholder="$t('system.cronJob.searchPlaceholder')"
            style="width: 240px"
            @search="handleSearch"
          />
          <a-select
            v-model="filterType"
            :placeholder="$t('system.cronJob.filterType')"
            style="width: 140px"
            allow-clear
            @change="handleSearch"
          >
            <a-option value="shell">Shell</a-option>
            <a-option value="curl">Curl</a-option>
            <a-option value="task">Task</a-option>
          </a-select>
          <a-select
            v-model="filterEnabled"
            :placeholder="$t('system.cronJob.filterStatus')"
            style="width: 110px"
            allow-clear
            @change="handleSearch"
          >
            <a-option :value="true">{{
              $t('system.cronJob.filterStatus.enabled')
            }}</a-option>
            <a-option :value="false">{{
              $t('system.cronJob.filterStatus.disabled')
            }}</a-option>
          </a-select>
        </div>
        <div class="page-toolbar-right">
          <a-button type="primary" @click="handleCreate">
            <template #icon><icon-plus /></template>
            {{ $t('system.cronJob.create') }}
          </a-button>
        </div>
      </div>

      <!-- 统计卡片 -->
      <a-row :gutter="12" style="margin-bottom: 20px">
        <a-col :span="6">
          <div class="stat-card" style="padding: 10px 16px">
            <div
              class="stat-card-icon"
              style="
                width: 32px;
                height: 32px;
                background: linear-gradient(135deg, #dbeafe, #eff6ff);
                color: #2563eb;
              "
            >
              <icon-clock-circle />
            </div>
            <div>
              <div class="stat-card-value" style="font-size: 16px">{{
                cronStat.total
              }}</div>
              <div class="stat-card-label">{{
                $t('system.cronJob.stats.total')
              }}</div>
            </div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card" style="padding: 10px 16px">
            <div
              class="stat-card-icon"
              style="
                width: 32px;
                height: 32px;
                background: linear-gradient(135deg, #d1fae5, #ecfdf5);
                color: #10b981;
              "
            >
              <icon-check-circle />
            </div>
            <div>
              <div class="stat-card-value" style="font-size: 16px">{{
                cronStat.enabled
              }}</div>
              <div class="stat-card-label">{{
                $t('system.cronJob.stats.enabled')
              }}</div>
            </div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card" style="padding: 10px 16px">
            <div
              class="stat-card-icon"
              style="
                width: 32px;
                height: 32px;
                background: linear-gradient(135deg, #fef3c7, #fffbeb);
                color: #f59e0b;
              "
            >
              <icon-stop />
            </div>
            <div>
              <div class="stat-card-value" style="font-size: 16px">{{
                cronStat.disabled
              }}</div>
              <div class="stat-card-label">{{
                $t('system.cronJob.stats.disabled')
              }}</div>
            </div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card" style="padding: 10px 16px">
            <div
              class="stat-card-icon"
              style="
                width: 32px;
                height: 32px;
                background: linear-gradient(135deg, #e0e7ff, #eef2ff);
                color: #6366f1;
              "
            >
              <icon-history />
            </div>
            <div>
              <div class="stat-card-value" style="font-size: 16px">{{
                cronStat.runnable
              }}</div>
              <div class="stat-card-label">{{
                $t('system.cronJob.stats.readyToRun')
              }}</div>
            </div>
          </div>
        </a-col>
      </a-row>

      <!-- 表格 -->
      <a-table
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column title="ID" data-index="id" :width="65" />
          <a-table-column
            :title="$t('system.cronJob.name')"
            data-index="name"
            :width="140"
          >
            <template #cell="{ record }">
              <div style="display: flex; align-items: center; gap: 8px">
                <icon-code :style="{ color: typeColorMap[record.type] }" />
                <strong>{{ record.name }}</strong>
              </div>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.cronJob.expression')"
            data-index="expression"
            :width="140"
          >
            <template #cell="{ record }">
              <code
                style="
                  background: var(--bg-subtle);
                  padding: 2px 8px;
                  border-radius: 4px;
                  font-size: 12px;
                  color: var(--primary-600);
                "
                >{{ record.expression }}</code
              >
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.cronJob.type')"
            data-index="type"
            :width="90"
            align="center"
          >
            <template #cell="{ record }">
              <span
                class="gradient-badge"
                :class="
                  record.type === 'shell'
                    ? 'primary'
                    : record.type === 'curl'
                    ? 'success'
                    : 'warning'
                "
              >
                {{ record.type }}
              </span>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.cronJob.description')"
            data-index="description"
            :ellipsis="true"
          />
          <a-table-column
            :title="$t('system.cronJob.enabled')"
            data-index="enabled"
            :width="80"
            align="center"
          >
            <template #cell="{ record }">
              <a-switch
                :model-value="record.enabled"
                size="small"
                @change="(val: string | number | boolean) => handleToggleEnabled(record, val as boolean)"
              />
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.cronJob.lastRunAt')"
            data-index="last_run_at"
            :width="165"
          >
            <template #cell="{ record }">
              <span
                v-if="record.last_run_at"
                style="color: #64748b; font-size: 13px"
                >{{ formatDateTime(record.last_run_at) }}</span
              >
              <span v-else style="color: #94a3b8">从未执行</span>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.cronJob.nextRunAt')"
            data-index="next_run_at"
            :width="165"
          >
            <template #cell="{ record }">
              <span
                v-if="record.next_run_at"
                style="color: var(--primary-600); font-size: 13px"
                >{{ formatDateTime(record.next_run_at) }}</span
              >
              <span v-else style="color: #94a3b8">-</span>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.cronJob.operations')"
            :width="340"
            fixed="right"
          >
            <template #cell="{ record }">
              <a-space>
                <a-button type="text" size="small" @click="handleEdit(record)">
                  <template #icon><icon-edit /></template>
                  {{ $t('common.edit') }}
                </a-button>
                <a-button
                  type="text"
                  size="small"
                  @click="handleViewLogs(record)"
                >
                  <template #icon><icon-file-text /></template>
                  {{ $t('system.cronJob.viewLogs') }}
                </a-button>
                <a-popconfirm
                  :content="$t('system.cronJob.runConfirm')"
                  @ok="handleRun(record)"
                >
                  <a-button type="text" size="small">
                    <template #icon><icon-play-arrow-fill /></template>
                    执行
                  </a-button>
                </a-popconfirm>
                <a-popconfirm
                  :content="$t('system.cronJob.deleteConfirm')"
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
    <CronJobForm
      v-model:visible="formVisible"
      :cron-job="currentJob"
      @success="handleFormSuccess"
    />
    <LogViewer v-model:visible="logVisible" :cron-job="currentJob" />
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive, computed, onMounted } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import type { CronJobResponse, CronJobType } from '@/types/api';
  import { formatDateTime } from '@/utils';
  import {
    getCronJobs,
    deleteCronJob,
    enableCronJob,
    disableCronJob,
    runCronJob,
  } from '@/api/cron-job';
  import CronJobForm from './components/CronJobForm.vue';
  import LogViewer from './components/LogViewer.vue';

  const { t } = useI18n();

  const searchName = ref('');
  const filterType = ref('');
  const filterEnabled = ref<boolean | undefined>(undefined);
  const loading = ref(false);
  const tableData = ref<CronJobResponse[]>([]);
  const formVisible = ref(false);
  const logVisible = ref(false);
  const currentJob = ref<CronJobResponse | undefined>(undefined);
  const currentPage = ref(1);
  const pageSize = ref(10);

  const typeColorMap: Record<string, string> = {
    shell: 'var(--primary-500)',
    curl: 'var(--success)',
    task: 'var(--warning)',
  };

  const pagination = reactive({
    current: currentPage.value,
    pageSize: pageSize.value,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });

  const cronStat = computed(() => {
    const list = tableData.value;
    return {
      total: pagination.total,
      enabled: list.filter((r) => r.enabled).length,
      disabled: list.filter((r) => !r.enabled).length,
      runnable: list.filter((r) => r.enabled).length,
    };
  });

  const fetchData = async () => {
    loading.value = true;
    try {
      const { data } = await getCronJobs({
        page: currentPage.value,
        page_size: pageSize.value,
        keyword: searchName.value || undefined,
        type: (filterType.value as CronJobType) || undefined,
        enabled: filterEnabled.value,
      });
      tableData.value = data.data?.data || [];
      pagination.total = data.data?.total || 0;
      pagination.current = currentPage.value;
    } catch {
      // error handled by interceptor
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
    currentJob.value = undefined;
    formVisible.value = true;
  };

  const handleEdit = (record: CronJobResponse) => {
    currentJob.value = record;
    formVisible.value = true;
  };

  const handleDelete = async (record: CronJobResponse) => {
    try {
      await deleteCronJob(record.id);
      Message.success(t('system.cronJob.deleteSuccess'));
      fetchData();
    } catch {
      // error handled by interceptor
    }
  };

  const handleToggleEnabled = async (record: CronJobResponse, val: boolean) => {
    try {
      if (val) {
        await enableCronJob(record.id);
      } else {
        await disableCronJob(record.id);
      }
      fetchData();
    } catch {
      // error handled by interceptor
    }
  };

  const handleRun = async (record: CronJobResponse) => {
    try {
      await runCronJob(record.id);
      Message.success(t('system.cronJob.runSuccess'));
    } catch {
      // error handled by interceptor
    }
  };

  const handleViewLogs = (record: CronJobResponse) => {
    currentJob.value = record;
    logVisible.value = true;
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
    name: 'SystemCronJob',
  };
</script>
