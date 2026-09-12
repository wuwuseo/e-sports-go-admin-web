<template>
  <a-drawer
    :visible="visible"
    :title="`${$t('system.cronJob.logs.title')} - ${cronJob?.name || ''}`"
    :width="800"
    @cancel="handleClose"
  >
    <div class="log-viewer">
      <div class="log-viewer-header">
        <a-space>
          <a-button size="small" @click="handleRefresh">
            <template #icon><icon-refresh /></template>
            {{ $t('system.cronJob.logs.refresh') }}
          </a-button>
          <a-button size="small" @click="handleTail(100)">
            {{ $t('system.cronJob.logs.tail') }} 100
            {{ $t('system.cronJob.logs.lines') }}
          </a-button>
          <a-button size="small" @click="handleTail(500)">
            {{ $t('system.cronJob.logs.tail') }} 500
            {{ $t('system.cronJob.logs.lines') }}
          </a-button>
        </a-space>
      </div>
      <div class="log-viewer-body">
        <div class="log-file-list">
          <a-spin :loading="filesLoading" style="width: 100%">
            <div v-if="logFiles.length === 0" class="log-empty">
              {{ $t('system.cronJob.logs.noFiles') }}
            </div>
            <a-menu
              v-else
              :selected-keys="selectedFile ? [selectedFile] : []"
              @menu-item-click="handleFileSelect"
            >
              <a-menu-item
                v-for="file in logFiles"
                :key="file.filename"
                class="log-file-item"
              >
                <icon-file />
                <span
                  class="log-file-item-name"
                  :title="
                    file.filename + ' - ' + formatDateTime(file.created_at)
                  "
                  >{{ file.filename }}</span
                >
                <span class="log-file-item-size">
                  {{ formatSize(file.size) }}
                </span>
              </a-menu-item>
            </a-menu>
          </a-spin>
        </div>
        <div class="log-content">
          <a-spin :loading="contentLoading" style="width: 100%; height: 100%">
            <div v-if="!selectedFile && !logContent" class="log-placeholder">
              {{ $t('system.cronJob.logs.selectFile') }}
            </div>
            <pre v-else class="log-pre">{{ logContent }}</pre>
          </a-spin>
        </div>
      </div>
    </div>
  </a-drawer>
</template>

<script lang="ts" setup>
  import { ref, watch } from 'vue';
  import { formatDateTime, formatSize } from '@/utils';
  import {
    getCronJobLogs,
    getCronJobLogContent,
    getCronJobLogTail,
  } from '@/api/cron-job';
  import type { CronJobResponse, LogFileInfo } from '@/types/api';

  const props = defineProps<{
    visible: boolean;
    cronJob?: CronJobResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
  }>();

  const logFiles = ref<LogFileInfo[]>([]);
  const selectedFile = ref('');
  const logContent = ref('');
  const filesLoading = ref(false);
  const contentLoading = ref(false);

  const fetchLogFiles = async () => {
    if (!props.cronJob) return;
    filesLoading.value = true;
    try {
      const { data } = await getCronJobLogs(props.cronJob.id);
      logFiles.value = data.data || [];
    } catch {
      logFiles.value = [];
    } finally {
      filesLoading.value = false;
    }
  };

  const fetchLogContent = async (filename: string) => {
    if (!props.cronJob) return;
    contentLoading.value = true;
    try {
      const { data } = await getCronJobLogContent(props.cronJob.id, filename);
      logContent.value = data.data || '';
    } catch {
      logContent.value = '';
    } finally {
      contentLoading.value = false;
    }
  };

  const handleFileSelect = (key: string) => {
    selectedFile.value = key;
    fetchLogContent(key);
  };

  const handleRefresh = () => {
    fetchLogFiles();
    if (selectedFile.value) {
      fetchLogContent(selectedFile.value);
    }
  };

  const handleTail = async (lines: number) => {
    if (!props.cronJob) return;
    contentLoading.value = true;
    selectedFile.value = '';
    try {
      const { data } = await getCronJobLogTail(props.cronJob.id, { lines });
      logContent.value = data.data || '';
    } catch {
      logContent.value = '';
    } finally {
      contentLoading.value = false;
    }
  };

  const handleClose = () => {
    emit('update:visible', false);
  };

  watch(
    () => props.visible,
    (val) => {
      if (val) {
        logFiles.value = [];
        selectedFile.value = '';
        logContent.value = '';
        fetchLogFiles();
      }
    }
  );
</script>

<style lang="less" scoped>
  .log-viewer {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .log-viewer-header {
    margin-bottom: 12px;
  }

  .log-viewer-body {
    display: flex;
    flex: 1;
    min-height: 500px;
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }

  .log-file-list {
    width: 200px;
    overflow-y: auto;
    background-color: var(--color-bg-1);
    border-right: 1px solid var(--color-border);
  }

  .log-empty,
  .log-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 200px;
    color: var(--color-text-3);
    font-size: 14px;
  }

  .log-file-item {
    display: flex !important;
    gap: 8px;
    align-items: center;
    height: auto !important;
    min-height: 40px;
    padding: 8px 12px !important;
    line-height: 1.4 !important;
  }

  .log-file-item-name {
    flex: 1;
    overflow: hidden;
    color: var(--color-text-1);
    font-size: 13px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .log-file-item-size {
    flex-shrink: 0;
    padding: 0 6px;
    color: var(--color-text-3);
    font-size: 11px;
    line-height: 18px;
    background: var(--color-fill-2);
    border-radius: 3px;
  }

  .log-content {
    flex: 1;
    overflow: auto;
    background-color: #1e1e1e;
  }

  .log-pre {
    min-height: 100%;
    margin: 0;
    padding: 16px;
    color: #d4d4d4;
    font-size: 13px;
    font-family: 'Courier New', Courier, monospace;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>
