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
        <a-spin v-if="previewLoading" />
        <img
          v-else-if="previewUrl"
          :src="previewUrl"
          :alt="attachment.original_name"
        />
      </div>
      <div v-else class="preview-file">
        <icon-file style="font-size: 64px; color: var(--color-text-3)" />
        <p style="margin-top: 12px">{{ attachment.original_name }}</p>
        <a-button
          type="primary"
          style="margin-top: 12px"
          :loading="downloadLoading"
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
  import { ref, computed, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import type { AttachmentResponse } from '@/types/api';
  import { resolveAttachmentAccessUrl } from '@/services/attachment-access.service';
  import { formatSize } from '@/utils';

  const props = defineProps<{
    visible: boolean;
    attachment?: AttachmentResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
  }>();

  const previewUrl = ref('');
  const previewLoading = ref(false);
  const downloadLoading = ref(false);
  let previewRequestId = 0;

  const isImage = computed(() => {
    return props.attachment?.mime_type?.startsWith('image/');
  });

  const getAccessErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : '获取附件访问地址失败';

  const loadPreview = async () => {
    if (!props.attachment) return;
    previewRequestId += 1;
    const requestId = previewRequestId;
    previewUrl.value = '';
    previewLoading.value = true;

    try {
      const url = await resolveAttachmentAccessUrl(props.attachment.id);
      if (requestId === previewRequestId && props.visible) {
        previewUrl.value = url;
      }
    } catch (error) {
      if (requestId === previewRequestId) {
        previewUrl.value = '';
        Message.error(getAccessErrorMessage(error));
      }
    } finally {
      if (requestId === previewRequestId) {
        previewLoading.value = false;
      }
    }
  };

  watch(
    () => [props.visible, props.attachment?.id] as const,
    ([visible]) => {
      if (visible && props.attachment && isImage.value) {
        loadPreview();
      } else {
        previewRequestId += 1;
        previewUrl.value = '';
        previewLoading.value = false;
      }
    }
  );

  const handleDownload = async () => {
    if (!props.attachment) return;
    downloadLoading.value = true;
    try {
      const url = await resolveAttachmentAccessUrl(props.attachment.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = props.attachment.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      Message.error(getAccessErrorMessage(error));
    } finally {
      downloadLoading.value = false;
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
