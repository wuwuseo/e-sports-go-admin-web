<template>
  <a-modal
    :visible="visible"
    :title="$t('system.attachment.upload.title')"
    :footer="false"
    :mask-closable="!isUploading"
    @cancel="handleCancel"
  >
    <a-upload
      draggable
      :auto-upload="false"
      :file-list="arcoFileList"
      :multiple="true"
      :disabled="isUploading"
      @change="handleFileChange"
    >
      <template #upload-button>
        <div class="upload-trigger">
          <div>
            <icon-upload style="color: var(--color-text-3); font-size: 28px" />
          </div>
          <div style="margin-top: 8px; color: var(--color-text-3)">
            {{ $t('system.attachment.upload.drag') }}
          </div>
        </div>
      </template>
    </a-upload>

    <div class="upload-directory">
      <a-input
        v-model="uploadDirectory"
        allow-clear
        :disabled="isUploading"
        :placeholder="$t('system.attachment.upload.directory.placeholder')"
      />
      <div class="upload-directory-hint">
        {{ $t('system.attachment.upload.directory.hint') }}
      </div>
    </div>

    <!-- 文件列表与进度 -->
    <div v-if="uploadItems.length > 0" class="file-list">
      <div v-for="(item, index) in uploadItems" :key="index" class="file-item">
        <div class="file-info">
          <span class="file-name">{{ item.file.name }}</span>
          <span class="file-size">{{ formatSize(item.file.size) }}</span>
          <a-tag
            v-if="item.method"
            :color="item.method === 'chunk' ? 'orange' : 'blue'"
            size="small"
          >
            {{
              item.method === 'chunk'
                ? $t('system.attachment.upload.method.chunk')
                : $t('system.attachment.upload.method.simple')
            }}
          </a-tag>
        </div>
        <div class="file-status">
          <!-- 上传中 -->
          <template v-if="item.status === 'uploading'">
            <a-progress
              :percent="Math.min(Math.max(item.progress, 0), 100) / 100"
              :width="'100%'"
              size="small"
            />
            <span v-if="item.chunkInfo" class="chunk-hint">
              {{
                $t('system.attachment.upload.chunkInfo', {
                  current: item.chunkInfo.current,
                  total: item.chunkInfo.total,
                })
              }}
            </span>
          </template>
          <!-- 等待中 -->
          <span v-else-if="item.status === 'pending'" class="status-pending">
            {{ $t('system.attachment.upload.pending') }}
          </span>
          <!-- 成功 -->
          <span v-else-if="item.status === 'success'" class="status-success">
            <icon-check-circle-fill />
            {{ $t('system.attachment.uploadSuccess') }}
          </span>
          <!-- 失败 -->
          <span v-else-if="item.status === 'error'" class="status-error">
            <icon-close-circle-fill />
            {{ item.errorMsg || $t('system.attachment.upload.failed') }}
          </span>
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div class="modal-footer">
      <a-button :disabled="isUploading" @click="handleCancel">
        {{ $t('system.attachment.upload.cancel') || '取消' }}
      </a-button>
      <a-button
        type="primary"
        :loading="isUploading"
        :disabled="uploadItems.length === 0 || allUploaded"
        @click="handleStartUpload"
      >
        {{
          isUploading
            ? $t('system.attachment.upload.uploading')
            : $t('system.attachment.upload.confirm') || '确定上传'
        }}
      </a-button>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
  import { ref, computed, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import type { FileItem } from '@arco-design/web-vue/es/upload/interfaces';
  import { useI18n } from 'vue-i18n';
  import { uploadAttachment, uploadAttachmentChunk } from '@/api/attachment';
  import { getChunkUploadConfig } from '@/services/config.service';
  import { formatSize } from '@/utils';

  interface ChunkInfo {
    current: number;
    total: number;
  }

  interface UploadItem {
    file: File;
    method?: 'simple' | 'chunk';
    status: 'pending' | 'uploading' | 'success' | 'error';
    progress: number;
    errorMsg?: string;
    chunkInfo?: ChunkInfo;
  }

  const props = defineProps<{
    visible: boolean;
    groupId?: number;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
    (e: 'success'): void;
  }>();

  const { t } = useI18n();

  // Arco 组件使用的文件列表
  const arcoFileList = ref<FileItem[]>([]);
  // 内部管理的上传队列
  const uploadItems = ref<UploadItem[]>([]);
  const isUploading = ref(false);
  const chunkThreshold = ref(10 * 1024 * 1024);
  const chunkSize = ref(5 * 1024 * 1024);
  const uploadDirectory = ref('');

  // 是否全部上传完毕
  const allUploaded = computed(
    () =>
      uploadItems.value.length > 0 &&
      uploadItems.value.every(
        (item) => item.status === 'success' || item.status === 'error'
      )
  );

  // 监听弹窗打开，获取配置
  watch(
    () => props.visible,
    async (visible) => {
      if (visible) {
        await fetchUploadConfig();
      } else {
        // 关闭时重置
        arcoFileList.value = [];
        uploadItems.value = [];
        isUploading.value = false;
        uploadDirectory.value = '';
      }
    }
  );

  const fetchUploadConfig = async () => {
    try {
      const config = await getChunkUploadConfig();
      chunkThreshold.value = config.CHUNK_THRESHOLD;
      chunkSize.value = config.CHUNK_SIZE;
    } catch (error) {
      // 获取分片上传配置失败，使用默认值兜底
      // eslint-disable-next-line no-console
      console.error('获取分片上传配置失败:', error);
    }
  };

  // 处理文件选择
  const handleFileChange = (list: FileItem[]) => {
    arcoFileList.value = list;
    uploadItems.value = list
      .filter((item) => item.file)
      .map((item) => ({
        file: item.file as File,
        status: 'pending' as const,
        progress: 0,
      }));
  };

  // 开始上传
  const handleStartUpload = async () => {
    if (uploadItems.value.length === 0) return;
    isUploading.value = true;

    let allSuccess = true;

    // 筛选待上传项，使用 reduce 串行处理（避免 no-await-in-loop）
    const pendingItems = uploadItems.value.filter(
      (item) => item.status !== 'success'
    );
    await pendingItems.reduce(async (prev, item) => {
      await prev;

      try {
        item.status = 'uploading';

        if (item.file.size >= chunkThreshold.value) {
          item.method = 'chunk';
          await uploadByChunks(item);
        } else {
          item.method = 'simple';
          await uploadSimple(item);
        }

        item.status = 'success';
        item.progress = 100;
      } catch (err: any) {
        item.status = 'error';
        item.errorMsg =
          err?.response?.data?.message || err?.message || '上传失败';
        allSuccess = false;
      }
    }, Promise.resolve());

    isUploading.value = false;

    if (allSuccess) {
      Message.success(t('system.attachment.uploadSuccess'));
      emit('success');
      // 全部成功后自动关闭
      emit('update:visible', false);
    } else {
      Message.warning(t('system.attachment.upload.partialFail'));
    }
  };

  const getUploadDirectory = () => uploadDirectory.value.trim() || undefined;

  // 简单上传
  const uploadSimple = async (item: UploadItem) => {
    await uploadAttachment(item.file, props.groupId, getUploadDirectory());
    item.progress = 100;
  };

  // 分片上传
  const uploadByChunks = async (item: UploadItem) => {
    const { file } = item;
    const totalChunks = Math.ceil(file.size / chunkSize.value);
    let uploadId: string | undefined;

    const chunkInfo: ChunkInfo = { current: 0, total: totalChunks };
    item.chunkInfo = chunkInfo;

    // 使用 Array.from + reduce 串行上传分片
    const chunkIndices = Array.from({ length: totalChunks }, (_, i) => i);
    await chunkIndices.reduce(async (prev, i) => {
      await prev;

      chunkInfo.current = i + 1;

      const start = i * chunkSize.value;
      const end = Math.min(start + chunkSize.value, file.size);
      const chunkBlob = file.slice(start, end, file.type);

      const isFirstChunk = i === 0;

      // 单分片上传进度回调
      const res = await uploadAttachmentChunk(
        chunkBlob,
        {
          groupId: props.groupId,
          uploadId,
          chunkIndex: i,
          totalChunks,
          filename: file.name,
          fileSize: file.size,
          chunkSize: chunkSize.value,
          directory: getUploadDirectory(),
        },
        (progressEvent) => {
          // 防御：total 不存在或为 0 时跳过本次回调，避免 Infinity / NaN
          if (!progressEvent.total || progressEvent.total <= 0) {
            return;
          }
          // 当前分片自身的完成比例，限制在 [0, 1]
          const chunkProgress = Math.min(
            Math.max(progressEvent.loaded / progressEvent.total, 0),
            1
          );
          // 整体进度 = (已完成分片数 + 当前分片完成比例) / 总分片数
          const overall = ((i + chunkProgress) / totalChunks) * 100;
          // 上传阶段最多显示 99%，等待后端合并完成后再置 100
          const next = Math.min(Math.max(Math.round(overall), 0), 99);
          // 防止进度回退（同一分片内多次回调或重试时可能出现）
          if (next > item.progress) {
            item.progress = next;
          }
        }
      );

      const { data: chunkData } = res.data;

      if (isFirstChunk) {
        uploadId = chunkData.upload_id;
      }

      // 最后一片：响应包含 attachment 字段表示合并完成
      if (chunkData.attachment) {
        item.progress = 100;
      } else {
        // 单片完成后用"已完成分片数 / 总分片数"再纠正一次，最多到 99%
        const done = Math.min(
          Math.max(Math.round(((i + 1) / totalChunks) * 100), 0),
          99
        );
        if (done > item.progress) {
          item.progress = done;
        }
      }
    }, Promise.resolve());
  };

  // 取消
  const handleCancel = () => {
    arcoFileList.value = [];
    uploadItems.value = [];
    isUploading.value = false;
    uploadDirectory.value = '';
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

  .file-list {
    max-height: 300px;
    margin-top: 16px;
    overflow-y: auto;
  }

  .upload-directory {
    margin-top: 12px;
  }

  .upload-directory-hint {
    margin-top: 6px;
    color: rgb(var(--gray-5));
    font-size: 12px;
    line-height: 1.4;
  }

  .file-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 4px;
    border-bottom: 1px solid var(--color-border-2);

    &:last-child {
      border-bottom: none;
    }
  }

  .file-info {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 13px;
  }

  .file-name {
    flex: 1;
    overflow: hidden;
    color: rgb(var(--gray-8));
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .file-size {
    flex-shrink: 0;
    color: rgb(var(--gray-5));
    font-size: 12px;
  }

  .file-status {
    display: flex;
    gap: 8px;
    align-items: center;
    padding-left: 4px;

    .arco-progress {
      flex: 1;
    }
  }

  .chunk-hint {
    color: rgb(var(--gray-5));
    font-size: 11px;
    white-space: nowrap;
  }

  .status-success {
    display: flex;
    gap: 4px;
    align-items: center;
    color: rgb(var(--green-6));
    font-size: 12px;
  }

  .status-error {
    display: flex;
    gap: 4px;
    align-items: center;
    color: rgb(var(--red-6));
    font-size: 12px;
  }

  .modal-footer {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 20px;
  }
</style>
