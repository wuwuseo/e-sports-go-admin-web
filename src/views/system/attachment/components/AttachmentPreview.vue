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
  import type { AttachmentResponse } from '@/types/api';
  import { downloadAttachment } from '@/api/attachment';
  import { formatSize } from '@/utils';

  const props = defineProps<{
    visible: boolean;
    attachment?: AttachmentResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
  }>();

  const previewUrl = ref('');
  const downloadLoading = ref(false);

  const isImage = computed(() => {
    return props.attachment?.mime_type?.startsWith('image/');
  });

  // 通过 axios 带认证获取图片 blob 并生成 object URL
  const loadPreview = async () => {
    if (!props.attachment) return;
    try {
      const res = await downloadAttachment(props.attachment.id);
      const blob = res.data;
      previewUrl.value = URL.createObjectURL(blob);
    } catch {
      previewUrl.value = '';
    }
  };

  watch(
    () => props.visible && props.attachment,
    (val) => {
      if (val) {
        loadPreview();
      } else if (previewUrl.value) {
        // 组件关闭时释放 object URL
        URL.revokeObjectURL(previewUrl.value);
        previewUrl.value = '';
      }
    }
  );

  const handleDownload = async () => {
    if (!props.attachment) return;
    downloadLoading.value = true;
    try {
      const res = await downloadAttachment(props.attachment.id);
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = props.attachment.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // error handled by interceptor
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
