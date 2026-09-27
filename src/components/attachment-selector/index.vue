<template>
  <slot name="trigger" :open="open">
    <a-button type="outline" :disabled="disabled" @click="open">
      <template #icon><icon-upload /></template>
      {{ triggerText || $t('components.attachmentSelector.trigger') }}
    </a-button>
  </slot>

  <a-modal
    :visible="visible"
    :title="$t('components.attachmentSelector.title')"
    :footer="false"
    :width="760"
    :mask-closable="!isUploading"
    @cancel="handleCancel"
  >
    <a-tabs v-model:active-key="activeTab" @change="handleTabChange">
      <a-tab-pane
        key="upload"
        :title="$t('components.attachmentSelector.tab.upload')"
      >
        <a-upload
          draggable
          :accept="accept"
          :auto-upload="false"
          :file-list="arcoFileList"
          :multiple="multiple"
          :disabled="isUploading"
          :show-file-list="false"
          @change="handleFileChange"
        >
          <template #upload-button>
            <div class="attachment-selector-upload-trigger">
              <icon-upload :size="28" style="color: var(--color-text-3)" />
              <div class="attachment-selector-upload-text">
                {{ $t('components.attachmentSelector.upload.drag') }}
              </div>
            </div>
          </template>
        </a-upload>

        <div class="attachment-selector-directory">
          <a-input
            v-model="uploadDirectory"
            allow-clear
            :disabled="isUploading"
            :placeholder="$t('system.attachment.upload.directory.placeholder')"
          />
          <div class="attachment-selector-directory-hint">
            {{ $t('system.attachment.upload.directory.hint') }}
          </div>
        </div>

        <div v-if="uploadItems.length > 0" class="attachment-selector-files">
          <div
            v-for="(item, index) in uploadItems"
            :key="`${item.file.name}-${index}`"
            class="attachment-selector-file"
          >
            <div class="attachment-selector-file-info">
              <div class="attachment-selector-file-preview">
                <img
                  v-if="item.previewUrl"
                  class="attachment-selector-file-preview-image"
                  :src="item.previewUrl"
                  :alt="item.file.name"
                />
                <div v-else class="attachment-selector-file-icon">
                  <icon-file />
                  <span>{{ getFileExtension(item.file) }}</span>
                </div>
              </div>
              <span class="attachment-selector-file-name">
                {{ item.file.name }}
              </span>
              <span class="attachment-selector-file-size">
                {{ formatSize(item.file.size) }}
              </span>
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
            <div class="attachment-selector-file-status">
              <template v-if="item.status === 'uploading'">
                <a-progress
                  :percent="Math.min(Math.max(item.progress, 0), 100) / 100"
                  :width="'100%'"
                  size="small"
                />
                <span v-if="item.chunkInfo" class="attachment-selector-chunk">
                  {{
                    $t('system.attachment.upload.chunkInfo', {
                      current: item.chunkInfo.current,
                      total: item.chunkInfo.total,
                    })
                  }}
                </span>
              </template>
              <span
                v-else-if="item.status === 'pending'"
                class="attachment-selector-pending"
              >
                {{ $t('system.attachment.upload.pending') }}
              </span>
              <span
                v-else-if="item.status === 'success'"
                class="attachment-selector-success"
              >
                <icon-check-circle-fill />
                {{ $t('system.attachment.uploadSuccess') }}
              </span>
              <span v-else class="attachment-selector-error">
                <icon-close-circle-fill />
                {{ item.errorMsg || $t('system.attachment.upload.failed') }}
              </span>
            </div>
          </div>
        </div>

        <div class="attachment-selector-footer">
          <a-button :disabled="isUploading" @click="handleCancel">
            {{ $t('system.attachment.upload.cancel') }}
          </a-button>
          <a-button
            type="primary"
            :loading="isUploading"
            :disabled="!canStartUpload"
            @click="handleStartUpload"
          >
            {{
              isUploading
                ? $t('system.attachment.upload.uploading')
                : $t('system.attachment.upload.confirm')
            }}
          </a-button>
        </div>
      </a-tab-pane>

      <a-tab-pane
        key="library"
        :title="$t('components.attachmentSelector.tab.library')"
      >
        <div class="attachment-selector-toolbar">
          <a-input-search
            v-model="searchKeyword"
            :placeholder="$t('system.attachment.search')"
            allow-clear
            class="attachment-selector-search"
            @search="handleSearch"
            @press-enter="handleSearch"
          />
          <a-select
            v-if="accept !== 'image/*'"
            v-model="filterMimeType"
            :placeholder="$t('system.attachment.filter.mimeType')"
            allow-clear
            class="attachment-selector-filter"
            @change="handleSearch"
          >
            <a-option value="image">
              {{ $t('components.attachmentSelector.filter.image') }}
            </a-option>
            <a-option value="application/pdf">PDF</a-option>
            <a-option value="text">
              {{ $t('components.attachmentSelector.filter.text') }}
            </a-option>
            <a-option value="application/zip">
              {{ $t('components.attachmentSelector.filter.archive') }}
            </a-option>
          </a-select>
        </div>

        <a-table
          row-key="id"
          :data="attachments"
          :loading="browserLoading"
          :pagination="browserPagination"
          :row-selection="rowSelection"
          :selected-keys="selectedKeys"
          @page-change="handlePageChange"
          @selection-change="handleSelectionChange"
        >
          <template #columns>
            <a-table-column
              :title="$t('system.attachment.fileName')"
              data-index="original_name"
              :ellipsis="true"
              :tooltip="true"
            >
              <template #cell="{ record }">
                <div class="attachment-selector-name-cell">
                  <a-avatar
                    v-if="isImage(record)"
                    :size="32"
                    shape="square"
                    class="attachment-selector-thumb"
                  >
                    <img
                      v-if="attachmentPreviewUrls[record.id]"
                      :src="attachmentPreviewUrls[record.id]"
                      :alt="record.original_name"
                    />
                  </a-avatar>
                  <a-tag v-else size="small">
                    {{ getExtensionLabel(record) }}
                  </a-tag>
                  <span class="attachment-selector-name">
                    {{ record.original_name }}
                  </span>
                </div>
              </template>
            </a-table-column>
            <a-table-column
              :title="$t('system.attachment.size')"
              data-index="size"
              :width="110"
            >
              <template #cell="{ record }">
                {{ formatSize(record.size) }}
              </template>
            </a-table-column>
            <a-table-column
              :title="$t('system.attachment.uploadedAt')"
              data-index="created_at"
              :width="170"
            >
              <template #cell="{ record }">
                {{ formatDateTime(record.created_at) }}
              </template>
            </a-table-column>
          </template>
        </a-table>

        <div class="attachment-selector-footer">
          <a-button :disabled="browserLoading" @click="handleCancel">
            {{ $t('system.attachment.upload.cancel') }}
          </a-button>
          <a-button
            type="primary"
            :disabled="selectedKeys.length === 0"
            @click="handleConfirmSelection"
          >
            {{ $t('components.attachmentSelector.confirm') }}
          </a-button>
        </div>
      </a-tab-pane>
    </a-tabs>
  </a-modal>
</template>

<script lang="ts" setup>
  import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import type { TableRowSelection } from '@arco-design/web-vue/es/table/interface';
  import type { FileItem } from '@arco-design/web-vue/es/upload/interfaces';
  import { useI18n } from 'vue-i18n';
  import type { AttachmentResponse } from '@/types/api';
  import {
    getAttachments,
    uploadAttachment,
    uploadAttachmentChunk,
  } from '@/api/attachment';
  import { resolveAttachmentAccessUrl } from '@/services/attachment-access.service';
  import { getChunkUploadConfig } from '@/services/config.service';
  import { formatDateTime, formatSize } from '@/utils';

  type AttachmentSelectorValue =
    | AttachmentResponse
    | AttachmentResponse[]
    | null;

  type ActiveTab = 'upload' | 'library';

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
    attachment?: AttachmentResponse;
    previewUrl?: string;
  }

  type UploadResponseData = Partial<AttachmentResponse> & {
    attachment?: AttachmentResponse;
    upload_id?: string;
    chunk_index?: number;
    received?: boolean;
    total_chunks?: number;
  };

  const props = withDefaults(
    defineProps<{
      modelValue?: AttachmentSelectorValue;
      multiple?: boolean;
      groupId?: number;
      accept?: string;
      defaultDirectory?: string;
      disabled?: boolean;
      triggerText?: string;
      pageSize?: number;
    }>(),
    {
      modelValue: null,
      multiple: false,
      groupId: undefined,
      accept: '',
      defaultDirectory: '',
      disabled: false,
      triggerText: '',
      pageSize: 10,
    }
  );

  const emit = defineEmits<{
    (e: 'update:modelValue', value: AttachmentSelectorValue): void;
    (e: 'select', value: AttachmentResponse | AttachmentResponse[]): void;
    (
      e: 'uploadSuccess',
      value: AttachmentResponse | AttachmentResponse[]
    ): void;
    (e: 'cancel'): void;
  }>();

  const { t } = useI18n();

  const visible = ref(false);
  const activeTab = ref<ActiveTab>('upload');

  const arcoFileList = ref<FileItem[]>([]);
  const uploadItems = ref<UploadItem[]>([]);
  const isUploading = ref(false);
  const chunkThreshold = ref(10 * 1024 * 1024);
  const chunkSize = ref(5 * 1024 * 1024);
  const uploadDirectory = ref(props.defaultDirectory);

  const attachments = ref<AttachmentResponse[]>([]);
  const attachmentPreviewUrls = reactive<Record<number, string>>({});
  const browserLoading = ref(false);
  const searchKeyword = ref('');
  const filterMimeType = ref('');
  const currentPage = ref(1);
  const selectedKeys = ref<number[]>([]);
  const selectedAttachments = ref<AttachmentResponse[]>([]);
  let previewBatchId = 0;

  const browserPagination = reactive({
    current: 1,
    pageSize: props.pageSize,
    total: 0,
    showTotal: true,
    showPageSize: false,
  });

  const rowSelection = computed<TableRowSelection>(() => ({
    type: props.multiple ? 'checkbox' : 'radio',
    showCheckedAll: props.multiple,
  }));

  const canStartUpload = computed(
    () =>
      uploadItems.value.length > 0 &&
      uploadItems.value.some((item) => item.status !== 'success') &&
      !isUploading.value
  );

  const open = () => {
    if (props.disabled) return;
    visible.value = true;
    activeTab.value = 'upload';
    initSelectionFromModel();
    fetchUploadConfig();
  };

  const resetUploadState = () => {
    cleanupPreviewUrls();
    arcoFileList.value = [];
    uploadItems.value = [];
    isUploading.value = false;
    uploadDirectory.value = props.defaultDirectory;
  };

  const close = () => {
    visible.value = false;
    resetUploadState();
  };

  const fetchUploadConfig = async () => {
    try {
      const config = await getChunkUploadConfig();
      chunkThreshold.value = config.CHUNK_THRESHOLD;
      chunkSize.value = config.CHUNK_SIZE;
    } catch {
      // Keep defaults if dynamic upload config is unavailable.
    }
  };

  const initSelectionFromModel = () => {
    const value = props.modelValue;
    let nextAttachments: AttachmentResponse[] = [];

    if (Array.isArray(value)) {
      nextAttachments = value;
    } else if (value) {
      nextAttachments = [value];
    }

    selectedAttachments.value = props.multiple
      ? nextAttachments
      : nextAttachments.slice(0, 1);
    selectedKeys.value = selectedAttachments.value.map((item) => item.id);
  };

  const handleFileChange = (list: FileItem[]) => {
    const nextList = props.multiple ? list : list.slice(-1);
    cleanupPreviewUrls();
    arcoFileList.value = nextList;
    uploadItems.value = nextList
      .filter((item) => item.file)
      .map((item) => createUploadItem(item.file as File));
  };

  const handleStartUpload = async () => {
    if (!canStartUpload.value) return;

    isUploading.value = true;
    let allSuccess = true;
    const successfulAttachments: AttachmentResponse[] = [];
    const pendingItems = uploadItems.value.filter(
      (item) => item.status !== 'success'
    );

    await pendingItems.reduce(async (prev, item) => {
      await prev;

      try {
        item.status = 'uploading';
        item.errorMsg = undefined;

        const attachment =
          item.file.size >= chunkThreshold.value
            ? await uploadByChunks(item)
            : await uploadSimple(item);

        item.attachment = attachment;
        item.status = 'success';
        item.progress = 100;
        successfulAttachments.push(attachment);
      } catch (error) {
        item.status = 'error';
        item.errorMsg = getUploadErrorMessage(error);
        allSuccess = false;
      }
    }, Promise.resolve());

    isUploading.value = false;

    if (allSuccess && successfulAttachments.length > 0) {
      const value = props.multiple
        ? successfulAttachments
        : successfulAttachments[0];
      Message.success(t('system.attachment.uploadSuccess'));
      emitSelectedValue(value);
      emit('uploadSuccess', value);
      close();
    } else {
      Message.warning(t('system.attachment.upload.partialFail'));
    }
  };

  const getUploadDirectory = () => uploadDirectory.value.trim() || undefined;

  const uploadSimple = async (item: UploadItem) => {
    item.method = 'simple';
    const res = await uploadAttachment(
      item.file,
      props.groupId,
      getUploadDirectory()
    );
    const attachment = getUploadedAttachment(
      res.data?.data as UploadResponseData
    );

    if (!attachment) {
      throw new Error(t('system.attachment.upload.failed'));
    }

    return attachment;
  };

  const uploadByChunks = async (item: UploadItem) => {
    item.method = 'chunk';
    const { file } = item;
    const totalChunks = Math.ceil(file.size / chunkSize.value);
    let uploadId: string | undefined;
    let uploadedAttachment: AttachmentResponse | undefined;

    const chunkInfo: ChunkInfo = { current: 0, total: totalChunks };
    item.chunkInfo = chunkInfo;

    const chunkIndices = Array.from({ length: totalChunks }, (_, i) => i);
    await chunkIndices.reduce(async (prev, i) => {
      await prev;

      chunkInfo.current = i + 1;

      const start = i * chunkSize.value;
      const end = Math.min(start + chunkSize.value, file.size);
      const chunkBlob = file.slice(start, end, file.type);

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
          if (!progressEvent.total || progressEvent.total <= 0) {
            return;
          }

          const chunkProgress = Math.min(
            Math.max(progressEvent.loaded / progressEvent.total, 0),
            1
          );
          const overall = ((i + chunkProgress) / totalChunks) * 100;
          const next = Math.min(Math.max(Math.round(overall), 0), 99);

          if (next > item.progress) {
            item.progress = next;
          }
        }
      );

      const chunkData = res.data?.data as UploadResponseData;

      if (i === 0) {
        uploadId = chunkData?.upload_id;
      }

      const attachment = getUploadedAttachment(chunkData);
      if (attachment) {
        uploadedAttachment = attachment;
        item.progress = 100;
      } else {
        const done = Math.min(
          Math.max(Math.round(((i + 1) / totalChunks) * 100), 0),
          99
        );
        if (done > item.progress) {
          item.progress = done;
        }
      }
    }, Promise.resolve());

    if (!uploadedAttachment) {
      throw new Error(t('system.attachment.upload.failed'));
    }

    return uploadedAttachment;
  };

  const fetchAttachments = async () => {
    browserLoading.value = true;
    try {
      const res = await getAttachments({
        page: currentPage.value,
        page_size: browserPagination.pageSize,
        group_id: props.groupId,
        keyword: searchKeyword.value || undefined,
        mime_type:
          props.accept === 'image/*'
            ? 'image/'
            : filterMimeType.value || undefined,
      });
      attachments.value = res.data.data.data;
      browserPagination.total = res.data.data.total;
      browserPagination.current = currentPage.value;
      loadAttachmentPreviewUrls(attachments.value);
    } catch {
      attachments.value = [];
      loadAttachmentPreviewUrls([]);
    } finally {
      browserLoading.value = false;
    }
  };

  const handleTabChange = (key: string | number) => {
    activeTab.value = key as ActiveTab;
    if (activeTab.value === 'library') {
      fetchAttachments();
    }
  };

  const handleSearch = () => {
    currentPage.value = 1;
    fetchAttachments();
  };

  const handlePageChange = (page: number) => {
    currentPage.value = page;
    fetchAttachments();
  };

  const handleSelectionChange = (keys: (string | number)[]) => {
    const normalizedKeys = keys.map((key) => Number(key));
    selectedKeys.value = props.multiple
      ? normalizedKeys
      : normalizedKeys.slice(-1);

    const currentSelectedMap = new Map(
      selectedAttachments.value.map((item) => [item.id, item])
    );
    const pageAttachmentMap = new Map(
      attachments.value.map((item) => [item.id, item])
    );

    selectedAttachments.value = selectedKeys.value
      .map((id) => currentSelectedMap.get(id) || pageAttachmentMap.get(id))
      .filter((item): item is AttachmentResponse => Boolean(item));
  };

  const handleConfirmSelection = () => {
    if (selectedAttachments.value.length === 0) {
      Message.warning(t('components.attachmentSelector.selectRequired'));
      return;
    }

    const value = props.multiple
      ? selectedAttachments.value
      : selectedAttachments.value[0];
    emitSelectedValue(value);
    close();
  };

  const emitSelectedValue = (
    value: AttachmentResponse | AttachmentResponse[]
  ) => {
    const values = asArray(value);
    const nextValue = props.multiple ? values : values[0];

    emit('update:modelValue', nextValue);
    emit('select', nextValue);
  };

  const asArray = (
    value: AttachmentResponse | AttachmentResponse[]
  ): AttachmentResponse[] => (Array.isArray(value) ? value : [value]);

  const handleCancel = () => {
    if (isUploading.value) return;
    emit('cancel');
    close();
  };

  const getUploadErrorMessage = (error: unknown) => {
    const candidate = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    return (
      candidate.response?.data?.message ||
      candidate.message ||
      t('system.attachment.upload.failed')
    );
  };

  const getUploadedAttachment = (data?: UploadResponseData) => {
    if (!data) {
      return undefined;
    }

    if (data.attachment) {
      return data.attachment;
    }

    if (typeof data.id === 'number' && data.original_name) {
      return data as AttachmentResponse;
    }

    return undefined;
  };

  const createUploadItem = (file: File): UploadItem => ({
    file,
    status: 'pending',
    progress: 0,
    previewUrl: isImageFile(file) ? URL.createObjectURL(file) : undefined,
  });

  const cleanupPreviewUrls = () => {
    uploadItems.value.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  };

  const isImage = (record: AttachmentResponse) =>
    record.mime_type?.startsWith('image/');

  const loadAttachmentPreviewUrls = async (records: AttachmentResponse[]) => {
    previewBatchId += 1;
    const requestId = previewBatchId;
    const currentIds = new Set(records.map((record) => record.id));

    Object.keys(attachmentPreviewUrls).forEach((key) => {
      const id = Number(key);
      if (!currentIds.has(id)) {
        delete attachmentPreviewUrls[id];
      }
    });

    const imageRecords = records.filter(isImage);
    await Promise.all(
      imageRecords.map(async (record) => {
        try {
          const url = await resolveAttachmentAccessUrl(record.id);
          if (requestId === previewBatchId) {
            attachmentPreviewUrls[record.id] = url;
          }
        } catch {
          if (requestId === previewBatchId) {
            delete attachmentPreviewUrls[record.id];
          }
        }
      })
    );
  };

  const isImageFile = (file: File) => file.type.startsWith('image/');

  const getFileExtension = (file: File) => {
    const nameParts = file.name.split('.');
    const extension = nameParts.length > 1 ? nameParts.pop() : '';
    return extension ? extension.toUpperCase() : 'FILE';
  };

  const getExtensionLabel = (record: AttachmentResponse) =>
    (record.extension || record.mime_type || 'FILE').toUpperCase();

  watch(
    () => props.pageSize,
    (pageSize) => {
      browserPagination.pageSize = pageSize;
      currentPage.value = 1;
      if (visible.value && activeTab.value === 'library') {
        fetchAttachments();
      }
    }
  );

  watch(
    () => props.groupId,
    () => {
      currentPage.value = 1;
      if (visible.value && activeTab.value === 'library') {
        fetchAttachments();
      }
    }
  );

  onBeforeUnmount(() => {
    cleanupPreviewUrls();
  });
</script>

<script lang="ts">
  export default {
    name: 'AttachmentSelector',
  };
</script>

<style lang="less" scoped>
  .attachment-selector-upload-trigger {
    padding: 24px 0;
    text-align: center;
    background-color: var(--color-fill-2);
    border: 1px dashed var(--color-border-3);
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      border-color: rgb(var(--primary-6));
    }
  }

  .attachment-selector-upload-text {
    margin-top: 8px;
    color: var(--color-text-3);
  }

  .attachment-selector-directory {
    margin-top: 12px;
  }

  .attachment-selector-directory-hint {
    margin-top: 6px;
    color: rgb(var(--gray-5));
    font-size: 12px;
    line-height: 1.4;
  }

  .attachment-selector-files {
    max-height: 260px;
    margin-top: 16px;
    overflow-y: auto;
  }

  .attachment-selector-file {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 4px;
    border-bottom: 1px solid var(--color-border-2);

    &:last-child {
      border-bottom: none;
    }
  }

  .attachment-selector-file-info,
  .attachment-selector-file-status,
  .attachment-selector-name-cell,
  .attachment-selector-toolbar,
  .attachment-selector-footer {
    display: flex;
    align-items: center;
  }

  .attachment-selector-file-info {
    gap: 8px;
    font-size: 13px;
  }

  .attachment-selector-file-preview {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    overflow: hidden;
    background: var(--color-fill-2);
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
  }

  .attachment-selector-file-preview-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .attachment-selector-file-icon {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: rgb(var(--gray-6));
    font-size: 10px;
    line-height: 1;

    .arco-icon {
      margin-bottom: 4px;
      font-size: 18px;
    }
  }

  .attachment-selector-file-name,
  .attachment-selector-name {
    flex: 1;
    overflow: hidden;
    color: rgb(var(--gray-8));
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .attachment-selector-file-size,
  .attachment-selector-chunk {
    flex-shrink: 0;
    color: rgb(var(--gray-5));
    font-size: 12px;
  }

  .attachment-selector-file-status {
    gap: 8px;
    padding-left: 4px;

    .arco-progress {
      flex: 1;
    }
  }

  .attachment-selector-chunk {
    font-size: 11px;
    white-space: nowrap;
  }

  .attachment-selector-pending,
  .attachment-selector-success,
  .attachment-selector-error {
    display: flex;
    gap: 4px;
    align-items: center;
    font-size: 12px;
  }

  .attachment-selector-pending {
    color: rgb(var(--gray-6));
  }

  .attachment-selector-success {
    color: rgb(var(--green-6));
  }

  .attachment-selector-error {
    color: rgb(var(--red-6));
  }

  .attachment-selector-toolbar {
    gap: 12px;
    margin-bottom: 12px;
  }

  .attachment-selector-search {
    width: 260px;
  }

  .attachment-selector-filter {
    width: 140px;
  }

  .attachment-selector-name-cell {
    gap: 8px;
    min-width: 0;
  }

  .attachment-selector-thumb {
    flex-shrink: 0;
    overflow: hidden;
    border: 1px solid var(--color-border-2);
  }

  .attachment-selector-footer {
    gap: 12px;
    justify-content: flex-end;
    margin-top: 20px;
  }
</style>
