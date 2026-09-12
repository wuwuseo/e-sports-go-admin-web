<template>
  <a-drawer
    :visible="visible"
    :title="$t('system.loginLog.detail.title')"
    :width="600"
    :footer="false"
    @cancel="handleClose"
    @ok="handleClose"
  >
    <a-descriptions :column="1" bordered>
      <a-descriptions-item :label="$t('system.loginLog.detail.id')">
        {{ detail?.id }}
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.loginLog.detail.userId')">
        {{ detail?.user_id }}
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.loginLog.detail.username')">
        {{ detail?.username }}
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.loginLog.detail.loginType')">
        <a-tag :color="detail?.login_type === 'admin' ? 'arcoblue' : 'gray'">
          {{
            detail?.login_type === 'admin'
              ? $t('system.loginLog.loginType.admin')
              : $t('system.loginLog.loginType.user')
          }}
        </a-tag>
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.loginLog.detail.status')">
        <a-tag :color="detail?.status === 'success' ? 'green' : 'red'">
          {{
            detail?.status === 'success'
              ? $t('system.loginLog.status.success')
              : $t('system.loginLog.status.fail')
          }}
        </a-tag>
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.loginLog.detail.message')">
        {{ detail?.message || '-' }}
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.loginLog.detail.ip')">
        {{ detail?.ip }}
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.loginLog.detail.browser')">
        {{ detail?.browser || '-' }}
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.loginLog.detail.os')">
        {{ detail?.os || '-' }}
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.loginLog.detail.userAgent')">
        <span style="white-space: pre-wrap; word-break: break-all">{{
          detail?.user_agent || '-'
        }}</span>
      </a-descriptions-item>
      <a-descriptions-item :label="$t('system.loginLog.detail.createdAt')">
        {{ formatDateTime(detail?.created_at) }}
      </a-descriptions-item>
    </a-descriptions>
  </a-drawer>
</template>

<script lang="ts" setup>
  import type { LoginLogResponse } from '@/types/api';
  import { formatDateTime } from '@/utils';

  defineProps<{
    visible: boolean;
    detail?: LoginLogResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
  }>();

  const handleClose = () => {
    emit('update:visible', false);
  };
</script>
