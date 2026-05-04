<template>
  <a-drawer
    :visible="visible"
    :title="$t('system.operationLog.detail.title')"
    :width="600"
    :footer="false"
    @cancel="handleClose"
    @ok="handleClose"
  >
    <a-descriptions :column="1" bordered>
      <a-descriptions-item :label="$t('system.operationLog.detail.userId')">
        {{ detail?.user_id }}
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.operationLog.detail.username')">
        {{ detail?.username }}
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.operationLog.detail.module')">
        {{ detail?.module }}
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.operationLog.detail.action')">
        {{ detail?.action }}
      </a-descriptions-item>
      <a-descriptions-item
        :label="$t('system.operationLog.detail.description')"
      >
        {{ detail?.description || '-' }}
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.operationLog.detail.path')">
        {{ detail?.path }}
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.operationLog.detail.method')">
        <a-tag :color="methodColorMap[detail?.method || ''] || 'gray'">
          {{ detail?.method }}
        </a-tag>
      </a-descriptions-item>
      <a-descriptions-item
        :label="$t('system.operationLog.detail.requestBody')"
      >
        <pre v-if="formattedRequestBody" class="request-body">{{
          formattedRequestBody
        }}</pre>
        <span v-else>-</span>
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.operationLog.detail.statusCode')">
        <a-tag
          :color="
            detail?.status_code &&
            detail.status_code >= 200 &&
            detail.status_code < 300
              ? 'green'
              : 'red'
          "
        >
          {{ detail?.status_code }}
        </a-tag>
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.operationLog.detail.ip')">
        {{ detail?.ip }}
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.operationLog.detail.userAgent')">
        <span style="word-break: break-all">{{ detail?.user_agent }}</span>
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.operationLog.detail.duration')">
        {{ detail?.duration_ms }}
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.operationLog.detail.createdAt')">
        {{ detail?.created_at }}
      </a-descriptions-item>
    </a-descriptions>
  </a-drawer>
</template>

<script lang="ts" setup>
  import { computed } from 'vue';
  import type { OperationLogResponse } from '@/types/api';

  const props = defineProps<{
    visible: boolean;
    detail?: OperationLogResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
  }>();

  const methodColorMap: Record<string, string> = {
    GET: 'green',
    POST: 'blue',
    PUT: 'orange',
    DELETE: 'red',
  };

  const formattedRequestBody = computed(() => {
    if (!props.detail?.request_body) return '';
    try {
      const parsed = JSON.parse(props.detail.request_body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return props.detail.request_body;
    }
  });

  const handleClose = () => {
    emit('update:visible', false);
  };
</script>

<style lang="less" scoped>
  .request-body {
    margin: 0;
    padding: 8px;
    background-color: var(--color-fill-2);
    border-radius: 4px;
    font-size: 13px;
    max-height: 300px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>
