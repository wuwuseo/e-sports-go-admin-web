<template>
  <a-modal
    :visible="visible"
    :title="$t('system.attachment.upload.title')"
    :ok-loading="uploading"
    :on-before-ok="handleBeforeOk"
    @cancel="handleCancel"
  >
    <a-upload
      draggable
      :auto-upload="false"
      :file-list="fileList"
      @change="handleFileChange"
    >
      <template #upload-button>
        <div class="upload-trigger">
          <div>
            <icon-upload style="font-size: 28px; color: var(--color-text-3)" />
          </div>
          <div style="margin-top: 8px; color: var(--color-text-3)">
            {{ $t('system.attachment.upload.drag') }}
          </div>
        </div>
      </template>
    </a-upload>
  </a-modal>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import type { FileItem } from '@arco-design/web-vue/es/upload/interfaces';
  import { useI18n } from 'vue-i18n';
  import { uploadAttachment } from '@/api/attachment';

  const props = defineProps<{
    visible: boolean;
    groupId?: number;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
    (e: 'success'): void;
  }>();

  const { t } = useI18n();
  const fileList = ref<FileItem[]>([]);
  const uploading = ref(false);

  const handleFileChange = (list: FileItem[]) => {
    fileList.value = list;
  };

  const handleBeforeOk = async (done: (closed: boolean) => void) => {
    if (fileList.value.length === 0) {
      done(false);
      return;
    }
    uploading.value = true;
    try {
      const uploadPromises = fileList.value.map((item) => {
        if (item.file) {
          return uploadAttachment(item.file, props.groupId);
        }
        return Promise.resolve();
      });
      await Promise.all(uploadPromises);
      Message.success(t('system.attachment.uploadSuccess'));
      fileList.value = [];
      emit('success');
      done(true);
    } catch (err) {
      done(false);
    } finally {
      uploading.value = false;
    }
  };

  const handleCancel = () => {
    fileList.value = [];
    emit('update:visible', false);
  };
</script>

<script lang="ts">
  export default {
    name: 'FileUpload',
  };
</script>

<style lang="less" scoped>
  .upload-trigger {
    padding: 20px 0;
    text-align: center;
    background-color: var(--color-fill-2);
    border: 1px dashed var(--color-border-3);
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      border-color: rgb(var(--primary-6));
    }
  }
</style>
