<template>
  <div class="container page-container">
    <a-card class="general-card" :title="$t('menu.system.queueJob')">
      <!-- 工具栏 -->
      <div class="page-toolbar">
        <div class="page-toolbar-left">
          <a-select
            v-model="queueFilter"
            :placeholder="$t('system.queueJob.toolbar.queue')"
            style="width: 140px"
            @change="handleFilterChange"
          >
            <a-option v-for="q in queueOptions" :key="q" :value="q">
              {{ q }}
            </a-option>
          </a-select>
        </div>
        <div class="page-toolbar-right">
          <a-button @click="refreshAll">
            <template #icon><icon-refresh /></template>
            {{ $t('system.queueJob.toolbar.refresh') }}
          </a-button>
          <a-button type="primary" @click="enqueueVisible = true">
            <template #icon><icon-plus /></template>
            {{ $t('system.queueJob.toolbar.enqueue') }}
          </a-button>
        </div>
      </div>

      <!-- 状态切换（列表接口要求必传 state） -->
      <a-tabs
        v-model:active-key="activeState"
        size="medium"
        @change="handleFilterChange"
      >
        <a-tab-pane
          v-for="s in states"
          :key="s"
          :title="`${$t(`system.queueJob.state.${s}`)} (${stateCount(s)})`"
        />
      </a-tabs>

      <!-- 统计卡片 -->
      <a-row :gutter="12" style="margin-bottom: 20px">
        <a-col v-for="card in statCards" :key="card.key" :span="6">
          <div class="stat-card" style="padding: 10px 16px">
            <div
              class="stat-card-icon"
              :style="{
                width: '32px',
                height: '32px',
                background: card.bg,
                color: card.color,
              }"
            >
              <component :is="card.icon" />
            </div>
            <div>
              <div class="stat-card-value" style="font-size: 16px">
                {{ card.value }}
              </div>
              <div class="stat-card-label">{{ $t(card.label) }}</div>
            </div>
          </div>
        </a-col>
      </a-row>

      <!-- 任务表 -->
      <a-table
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column
            :title="$t('system.queueJob.table.id')"
            data-index="id"
            :width="120"
            :ellipsis="true"
          />
          <a-table-column
            :title="$t('system.queueJob.table.queue')"
            data-index="queue"
            :width="90"
          />
          <a-table-column
            :title="$t('system.queueJob.table.name')"
            data-index="name"
            :width="170"
          >
            <template #cell="{ record }">
              <a-space>
                <strong>{{ record.name }}</strong>
                <a-tag v-if="record.is_orphaned" color="red" size="small">
                  {{ $t('system.queueJob.table.orphaned') }}
                </a-tag>
              </a-space>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.queueJob.table.state')"
            data-index="state"
            :width="95"
            align="center"
          >
            <template #cell="{ record }">
              <a-tag :color="stateColorMap[record.state] || 'gray'">
                {{ $t(`system.queueJob.state.${record.state}`) }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.queueJob.table.attempts')"
            :width="90"
            align="center"
          >
            <template #cell="{ record }">
              {{ record.attempt }} / {{ record.max_retry }}
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.queueJob.table.lastError')"
            data-index="last_error"
            :ellipsis="true"
          >
            <template #cell="{ record }">
              <span
                v-if="record.last_error"
                style="color: #ef4444; font-size: 13px"
                >{{ record.last_error }}</span
              >
              <span v-else style="color: #94a3b8">-</span>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.queueJob.table.nextProcessAt')"
            :width="165"
          >
            <template #cell="{ record }">
              <span
                v-if="record.next_process_at"
                style="color: var(--primary-600); font-size: 13px"
                >{{ formatDateTime(record.next_process_at) }}</span
              >
              <span v-else style="color: #94a3b8">-</span>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.queueJob.table.completedAt')"
            :width="165"
          >
            <template #cell="{ record }">
              <span
                v-if="record.completed_at"
                style="color: #64748b; font-size: 13px"
                >{{ formatDateTime(record.completed_at) }}</span
              >
              <span v-else style="color: #94a3b8">-</span>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.queueJob.operations')"
            :width="280"
            fixed="right"
          >
            <template #cell="{ record }">
              <a-space>
                <a-button
                  type="text"
                  size="small"
                  @click="handleViewDetail(record)"
                >
                  <template #icon><icon-eye /></template>
                  {{ $t('system.queueJob.ops.detail') }}
                </a-button>
                <a-popconfirm
                  v-if="canRetry(record)"
                  :content="$t('system.queueJob.retryConfirm')"
                  @ok="handleRetry(record)"
                >
                  <a-button type="text" size="small">
                    <template #icon><icon-refresh /></template>
                    {{ $t('system.queueJob.ops.retry') }}
                  </a-button>
                </a-popconfirm>
                <a-popconfirm
                  v-if="record.state === 'active'"
                  :content="$t('system.queueJob.cancelConfirm')"
                  @ok="handleCancel(record)"
                >
                  <a-button type="text" status="warning" size="small">
                    <template #icon><icon-pause /></template>
                    {{ $t('system.queueJob.ops.cancel') }}
                  </a-button>
                </a-popconfirm>
                <a-popconfirm
                  v-if="record.state !== 'active'"
                  :content="$t('system.queueJob.deleteConfirm')"
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
    <QueueTaskDetail
      v-model:visible="detailVisible"
      :queue="currentTask?.queue"
      :task-id="currentTask?.id"
    />
    <EnqueueTaskForm
      v-model:visible="enqueueVisible"
      :queue-options="queueOptions"
      @success="refreshAll"
    />
  </div>
</template>

<script lang="ts" setup>
  import {
    ref,
    reactive,
    computed,
    onMounted,
    markRaw,
    type Component,
  } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import {
    IconClockCircle,
    IconPlayArrowFill,
    IconCalendar,
    IconRefresh,
    IconArchive,
    IconCheckCircle,
    IconThunderbolt,
    IconCloseCircle,
  } from '@arco-design/web-vue/es/icon';
  import { useI18n } from 'vue-i18n';
  import type {
    QueueStatsResponse,
    QueueTaskResponse,
    QueueTaskState,
  } from '@/types/api';
  import { formatDateTime } from '@/utils';
  import {
    getQueueTasks,
    getQueueStats,
    retryQueueTask,
    cancelQueueTask,
    deleteQueueTask,
  } from '@/api/queue-job';
  import QueueTaskDetail from './components/QueueTaskDetail.vue';
  import EnqueueTaskForm from './components/EnqueueTaskForm.vue';

  const { t } = useI18n();

  const states: QueueTaskState[] = [
    'pending',
    'active',
    'scheduled',
    'retry',
    'archived',
    'completed',
  ];

  const stateColorMap: Record<string, string> = {
    pending: 'gray',
    active: 'arcoblue',
    scheduled: 'cyan',
    retry: 'orange',
    archived: 'red',
    completed: 'green',
  };

  const activeState = ref<QueueTaskState>('pending');
  const queueFilter = ref('default');
  const loading = ref(false);
  const tableData = ref<QueueTaskResponse[]>([]);
  const statsData = ref<QueueStatsResponse[]>([]);
  const detailVisible = ref(false);
  const enqueueVisible = ref(false);
  const currentTask = ref<QueueTaskResponse | undefined>(undefined);
  const currentPage = ref(1);
  const pageSize = ref(10);

  const pagination = reactive({
    current: currentPage.value,
    pageSize: pageSize.value,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });

  // 统计跨队列汇总（通常只有一个 default 队列）
  const aggregated = computed(() => {
    const list = statsData.value;
    const sum = (pick: (s: QueueStatsResponse) => number) =>
      list.reduce((acc, s) => acc + (pick(s) || 0), 0);
    return {
      pending: sum((s) => s.pending),
      active: sum((s) => s.active),
      scheduled: sum((s) => s.scheduled),
      retry: sum((s) => s.retry),
      archived: sum((s) => s.archived),
      completed: sum((s) => s.completed),
      processed: sum((s) => s.processed),
      failed: sum((s) => s.failed),
    };
  });

  const stateCount = (state: QueueTaskState) => aggregated.value[state] ?? 0;

  const queueOptions = computed(() => {
    const names = statsData.value.map((s) => s.queue);
    return names.length ? names : ['default'];
  });

  const statCards = computed(() => [
    {
      key: 'pending',
      value: aggregated.value.pending,
      label: 'system.queueJob.state.pending',
      icon: markRaw(IconClockCircle as Component),
      bg: 'linear-gradient(135deg, #f1f5f9, #f8fafc)',
      color: '#64748b',
    },
    {
      key: 'active',
      value: aggregated.value.active,
      label: 'system.queueJob.state.active',
      icon: markRaw(IconPlayArrowFill as Component),
      bg: 'linear-gradient(135deg, #dbeafe, #eff6ff)',
      color: '#2563eb',
    },
    {
      key: 'scheduled',
      value: aggregated.value.scheduled,
      label: 'system.queueJob.state.scheduled',
      icon: markRaw(IconCalendar as Component),
      bg: 'linear-gradient(135deg, #cffafe, #ecfeff)',
      color: '#0891b2',
    },
    {
      key: 'retry',
      value: aggregated.value.retry,
      label: 'system.queueJob.state.retry',
      icon: markRaw(IconRefresh as Component),
      bg: 'linear-gradient(135deg, #fef3c7, #fffbeb)',
      color: '#f59e0b',
    },
    {
      key: 'archived',
      value: aggregated.value.archived,
      label: 'system.queueJob.state.archived',
      icon: markRaw(IconArchive as Component),
      bg: 'linear-gradient(135deg, #fee2e2, #fef2f2)',
      color: '#ef4444',
    },
    {
      key: 'completed',
      value: aggregated.value.completed,
      label: 'system.queueJob.state.completed',
      icon: markRaw(IconCheckCircle as Component),
      bg: 'linear-gradient(135deg, #d1fae5, #ecfdf5)',
      color: '#10b981',
    },
    {
      key: 'processed',
      value: aggregated.value.processed,
      label: 'system.queueJob.stats.processed',
      icon: markRaw(IconThunderbolt as Component),
      bg: 'linear-gradient(135deg, #e0e7ff, #eef2ff)',
      color: '#6366f1',
    },
    {
      key: 'failed',
      value: aggregated.value.failed,
      label: 'system.queueJob.stats.failed',
      icon: markRaw(IconCloseCircle as Component),
      bg: 'linear-gradient(135deg, #ffe4e6, #fff1f2)',
      color: '#e11d48',
    },
  ]);

  const canRetry = (record: QueueTaskResponse) =>
    ['scheduled', 'retry', 'archived'].includes(record.state);

  const fetchStats = async () => {
    try {
      const { data } = await getQueueStats();
      statsData.value = data.data || [];
    } catch {
      // error handled by interceptor
    }
  };

  const fetchData = async () => {
    loading.value = true;
    try {
      const { data } = await getQueueTasks({
        state: activeState.value,
        queue: queueFilter.value || undefined,
        page: currentPage.value,
        page_size: pageSize.value,
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

  const refreshAll = () => {
    fetchStats();
    fetchData();
  };

  const handleFilterChange = () => {
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

  const handleViewDetail = (record: QueueTaskResponse) => {
    currentTask.value = record;
    detailVisible.value = true;
  };

  const handleRetry = async (record: QueueTaskResponse) => {
    try {
      await retryQueueTask(record.queue, record.id);
      Message.success(t('system.queueJob.retrySuccess'));
      refreshAll();
    } catch {
      // error handled by interceptor
    }
  };

  const handleCancel = async (record: QueueTaskResponse) => {
    try {
      await cancelQueueTask(record.queue, record.id);
      Message.success(t('system.queueJob.cancelSuccess'));
      refreshAll();
    } catch {
      // error handled by interceptor
    }
  };

  const handleDelete = async (record: QueueTaskResponse) => {
    try {
      await deleteQueueTask(record.queue, record.id);
      Message.success(t('system.queueJob.deleteSuccess'));
      refreshAll();
    } catch {
      // error handled by interceptor
    }
  };

  onMounted(() => {
    refreshAll();
  });
</script>

<script lang="ts">
  export default {
    name: 'SystemQueueJob',
  };
</script>
