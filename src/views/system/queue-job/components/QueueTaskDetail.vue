<template>
  <a-drawer
    :visible="visible"
    :title="$t('system.queueJob.detail.title')"
    :width="600"
    :footer="false"
    @cancel="handleClose"
    @ok="handleClose"
  >
    <a-spin :loading="detailLoading" style="width: 100%">
      <a-descriptions :column="1" bordered>
        <a-descriptions-item :label="$t('system.queueJob.table.id')">
          {{ detail?.id }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.queueJob.table.queue')">
          {{ detail?.queue }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.queueJob.table.name')">
          {{ detail?.name }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.queueJob.table.state')">
          <a-space>
            <a-tag :color="stateColorMap[detail?.state || ''] || 'gray'">
              {{
                detail?.state
                  ? $t(`system.queueJob.state.${detail.state}`)
                  : '-'
              }}
            </a-tag>
            <a-tag v-if="detail?.is_orphaned" color="red" size="small">
              {{ $t('system.queueJob.table.orphaned') }}
            </a-tag>
          </a-space>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.queueJob.detail.attempts')">
          {{ detail?.attempt }} / {{ detail?.max_retry }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.queueJob.detail.timeout')">
          {{ detail?.timeout_seconds ?? '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.queueJob.table.lastError')">
          <span
            style="color: #ef4444; white-space: pre-wrap; word-break: break-all"
            >{{ detail?.last_error || '-' }}</span
          >
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.queueJob.detail.lastFailedAt')">
          {{ formatDateTime(detail?.last_failed_at) }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.queueJob.table.nextProcessAt')">
          {{ formatDateTime(detail?.next_process_at) }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.queueJob.table.completedAt')">
          {{ formatDateTime(detail?.completed_at) }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.queueJob.detail.payload')">
          <pre class="payload-pre">{{ formattedPayload }}</pre>
        </a-descriptions-item>
      </a-descriptions>
    </a-spin>
  </a-drawer>
</template>

<script lang="ts" setup>
  import { ref, computed, watch } from 'vue';
  import type { QueueTaskResponse } from '@/types/api';
  import { formatDateTime } from '@/utils';
  import { getQueueTaskDetail } from '@/api/queue-job';

  const props = defineProps<{
    visible: boolean;
    queue?: string;
    taskId?: string;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
  }>();

  const detail = ref<QueueTaskResponse | undefined>(undefined);
  const detailLoading = ref(false);

  const stateColorMap: Record<string, string> = {
    pending: 'gray',
    active: 'arcoblue',
    scheduled: 'cyan',
    retry: 'orange',
    archived: 'red',
    completed: 'green',
  };

  // 仿 operation-log LogDetail：payload 美化展示，非法 JSON 回退原文
  const formattedPayload = computed(() => {
    const raw = detail.value?.payload;
    if (!raw) return '-';
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  });

  const fetchDetail = async () => {
    if (!props.queue || !props.taskId) return;
    detailLoading.value = true;
    try {
      const { data } = await getQueueTaskDetail(props.queue, props.taskId);
      detail.value = data.data;
    } catch {
      // error handled by interceptor
    } finally {
      detailLoading.value = false;
    }
  };

  watch(
    () => props.visible,
    (val) => {
      if (val) {
        fetchDetail();
      } else {
        detail.value = undefined;
      }
    }
  );

  const handleClose = () => {
    emit('update:visible', false);
  };
</script>

<style scoped lang="less">
  .payload-pre {
    max-height: 260px;
    margin: 0;
    padding: 8px 12px;
    overflow: auto;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-all;
    background: var(--color-fill-2);
    border-radius: 4px;
  }
</style>
