<template>
  <a-modal
    :visible="visible"
    :title="$t('system.attachment.preview.title')"
    :footer="false"
    :width="680"
    @cancel="handleCancel"
  >
    <div v-if="attachment" class="preview-content">
      <div v-if="isImage" class="preview-image">
        <img :src="previewUrl" :alt="attachment.original_name" />
      </div>
      <div v-else class="preview-file">
        <icon-file style="font-size: 64px; color: var(--color-text-3)" />
        <p style="margin-top: 12px">{{ attachment.original_name }}</p>
        <a-button
          type="primary"
          style="margin-top: 12px"
          @click="handleDownload"
        >
          <template #icon><icon-download /></template>
          {{ $t('system.attachment.download') }}
        </a-button>
      </div>
      <a-descriptions
        :column="2"
        bordered
        style="margin-top: 16px"
        size="small"
      >
        <a-descriptions-item :label="$t('system.attachment.fileName')">
          {{ attachment.original_name }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.attachment.mimeType')">
          {{ attachment.mime_type }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.attachment.size')">
          {{ formatSize(attachment.size) }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.attachment.uploadedAt')">
          {{ attachment.created_at }}
        </a-descriptions-item>
      </a-descriptions>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
  import { computed } from 'vue';
  import type { AttachmentResponse } from '@/types/api';
  import { getAttachmentPreviewUrl } from '@/api/attachment';

  const props = defineProps<{
    visible: boolean;
    attachment?: AttachmentResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
  }>();

  const isImage = computed(() => {
    return props.attachment?.mime_type?.startsWith('image/');
  });

  const previewUrl = computed(() => {
    if (props.attachment) {
      return getAttachmentPreviewUrl(props.attachment.id);
    }
    return '';
  });

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / k ** i).toFixed(2)} ${units[i]}`;
  };

  const handleDownload = () => {
    if (props.attachment) {
      window.open(getAttachmentPreviewUrl(props.attachment.id));
    }
  };

  const handleCancel = () => {
    emit('update:visible', false);
  };
</script>

<script lang="ts">
  export default {
    name: 'AttachmentPreview',
  };
</script>

<style lang="less" scoped>
  .preview-content {
    .preview-image {
      text-align: center;

      img {
        max-width: 100%;
        max-height: 400px;
        border-radius: 4px;
      }
    }

    .preview-file {
      text-align: center;
      padding: 24px 0;
    }
  }
</style>
