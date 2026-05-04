<template>
  <div class="container">
    <a-card class="general-card" :title="$t('menu.system.attachment')">
      <a-row :gutter="16">
        <!-- 左侧分组管理 -->
        <a-col :span="5">
          <div class="group-panel">
            <div class="group-panel-header">
              <span class="group-panel-title">分组管理</span>
              <a-button type="text" size="small" @click="handleCreateGroup">
                <template #icon><icon-plus /></template>
              </a-button>
            </div>
            <div class="group-list">
              <div
                class="group-item"
                :class="{ active: !activeGroupId }"
                @click="handleGroupSelect(undefined)"
              >
                <icon-folder class="group-item-icon" />
                <span>全部文件</span>
                <span class="group-item-count">{{ attachments.length }}</span>
              </div>
              <div
                v-for="group in groups"
                :key="group.id"
                class="group-item"
                :class="{ active: activeGroupId === group.id }"
                @click="handleGroupSelect(group.id)"
              >
                <icon-folder class="group-item-icon" />
                <span class="group-item-name">{{ group.name }}</span>
                <a-dropdown trigger="click" position="br">
                  <a-button
                    type="text"
                    size="mini"
                    class="group-item-more"
                    @click.stop
                  >
                    <icon-more-vertical />
                  </a-button>
                  <template #content>
                    <a-doption @click.stop="handleEditGroup(group)">
                      <template #icon><icon-edit /></template>
                      编辑
                    </a-doption>
                    <a-doption @click.stop="handleDeleteGroup(group)">
                      <template #icon><icon-delete /></template>
                      <span style="color: #ef4444">删除</span>
                    </a-doption>
                  </template>
                </a-dropdown>
              </div>
            </div>
          </div>
        </a-col>

        <!-- 右侧文件列表 -->
        <a-col :span="19">
          <!-- 工具栏 -->
          <div class="page-toolbar">
            <div class="page-toolbar-left">
              <a-input-search
                v-model="searchKeyword"
                :placeholder="$t('system.attachment.search')"
                style="width: 240px"
                @search="handleSearch"
              />
              <a-select
                v-model="filterMimeType"
                placeholder="文件类型"
                style="width: 130px"
                allow-clear
                @change="handleSearch"
              >
                <a-option value="image">图片</a-option>
                <a-option value="application/pdf">PDF</a-option>
                <a-option value="text">文本</a-option>
                <a-option value="application/zip">压缩包</a-option>
              </a-select>
            </div>
            <div class="page-toolbar-right">
              <a-popconfirm
                :content="$t('system.attachment.batchDeleteConfirm')"
                @ok="handleBatchDelete"
              >
                <a-button
                  type="outline"
                  status="danger"
                  :disabled="selectedKeys.length === 0"
                >
                  <template #icon><icon-delete /></template>
                  {{ $t('system.attachment.batchDelete') }}
                  <span v-if="selectedKeys.length"
                    >({{ selectedKeys.length }})</span
                  >
                </a-button>
              </a-popconfirm>
              <a-button type="primary" @click="uploadVisible = true">
                <template #icon><icon-upload /></template>
                {{ $t('system.attachment.upload') }}
              </a-button>
            </div>
          </div>

          <!-- 表格 -->
          <a-table
            :data="attachments"
            :loading="loading"
            :pagination="pagination"
            row-key="id"
            :row-selection="{ type: 'checkbox', showCheckedAll: true }"
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
                  <div style="display: flex; align-items: center; gap: 8px">
                    <span class="file-icon" :class="getFileIconClass(record)">{{
                      getFileIcon(record)
                    }}</span>
                    <span>{{ record.original_name }}</span>
                  </div>
                </template>
              </a-table-column>
              <a-table-column
                :title="$t('system.attachment.mimeType')"
                data-index="mime_type"
                :width="130"
              />
              <a-table-column
                :title="$t('system.attachment.size')"
                data-index="size"
                :width="100"
              >
                <template #cell="{ record }">
                  {{ formatSize(record.size) }}
                </template>
              </a-table-column>
              <a-table-column
                :title="$t('system.attachment.group')"
                data-index="group_id"
                :width="110"
              >
                <template #cell="{ record }">
                  <a-tag v-if="record.group_id" color="blue" size="small">{{
                    getGroupName(record.group_id)
                  }}</a-tag>
                  <span v-else style="color: #94a3b8">未分组</span>
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
              <a-table-column
                :title="$t('system.attachment.operations')"
                :width="200"
                fixed="right"
              >
                <template #cell="{ record }">
                  <a-space>
                    <a-button
                      type="text"
                      size="small"
                      @click="handlePreview(record)"
                    >
                      <template #icon><icon-eye /></template>
                      {{ $t('system.attachment.preview') }}
                    </a-button>
                    <a-dropdown trigger="click">
                      <a-button type="text" size="small">
                        <icon-folder-add /> 移动
                      </a-button>
                      <template #content>
                        <a-doption @click="handleMove(record, undefined)">
                          取消分组
                        </a-doption>
                        <a-doption
                          v-for="group in groups"
                          :key="group.id"
                          @click="handleMove(record, group.id)"
                        >
                          {{ group.name }}
                        </a-doption>
                      </template>
                    </a-dropdown>
                    <a-popconfirm
                      :content="$t('system.attachment.deleteConfirm')"
                      @ok="handleDelete(record)"
                    >
                      <a-button type="text" status="danger" size="small">
                        <template #icon><icon-delete /></template>
                      </a-button>
                    </a-popconfirm>
                  </a-space>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-col>
      </a-row>
    </a-card>

    <FileUpload
      v-model:visible="uploadVisible"
      :group-id="activeGroupId"
      @success="fetchAttachments"
    />
    <AttachmentPreview
      v-model:visible="previewVisible"
      :attachment="currentAttachment"
    />

    <!-- 分组编辑弹窗 -->
    <a-modal
      :visible="groupFormVisible"
      :title="editingGroup ? '编辑分组' : '新建分组'"
      @cancel="groupFormVisible = false"
    >
      <a-form :model="groupForm" layout="vertical">
        <a-form-item
          label="分组名称"
          :rules="[{ required: true, message: '请输入分组名称' }]"
          field="name"
        >
          <a-input v-model="groupForm.name" placeholder="请输入分组名称" />
        </a-form-item>
        <a-form-item label="描述" field="description">
          <a-textarea
            v-model="groupForm.description"
            placeholder="可选，输入分组描述"
            :max-length="500"
            show-word-limit
          />
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button @click="groupFormVisible = false">取消</a-button>
        <a-button
          type="primary"
          :loading="submitting"
          @click="handleGroupFormSubmit"
          >确定</a-button
        >
      </template>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive, onMounted } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import type {
    AttachmentResponse,
    AttachmentGroupResponse,
  } from '@/types/api';
  import { formatDateTime, formatSize } from '@/utils';
  import {
    getAttachments,
    deleteAttachment,
    batchDeleteAttachments,
    moveAttachment,
    getAttachmentGroups,
    createAttachmentGroup,
    updateAttachmentGroup,
    deleteAttachmentGroup,
  } from '@/api/attachment';
  import FileUpload from './components/FileUpload.vue';
  import AttachmentPreview from './components/AttachmentPreview.vue';

  const { t } = useI18n();

  // 附件列表
  const attachments = ref<AttachmentResponse[]>([]);
  const loading = ref(false);
  const searchKeyword = ref('');
  const filterMimeType = ref('');
  const activeGroupId = ref<number | undefined>(undefined);
  const selectedKeys = ref<number[]>([]);
  const currentPage = ref(1);
  const pageSize = ref(10);
  const currentAttachment = ref<AttachmentResponse | undefined>(undefined);

  const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });

  // 弹窗
  const uploadVisible = ref(false);
  const previewVisible = ref(false);

  // 分组
  const groups = ref<AttachmentGroupResponse[]>([]);
  const groupFormVisible = ref(false);
  const editingGroup = ref<AttachmentGroupResponse | undefined>(undefined);
  const submitting = ref(false);
  const groupForm = reactive({
    name: '',
    description: '',
  });

  const getGroupName = (groupId: number | undefined | null): string => {
    if (!groupId) return '-';
    const group = groups.value.find((g) => g.id === groupId);
    return group ? group.name : '-';
  };

  const getFileIcon = (record: AttachmentResponse): string => {
    const ext = record.extension?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return '🖼';
    if (['pdf'].includes(ext)) return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📊';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '📦';
    if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) return '🎬';
    if (['mp3', 'wav', 'flac'].includes(ext)) return '🎵';
    return '📁';
  };

  const getFileIconClass = (record: AttachmentResponse): string => {
    const ext = record.extension?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext))
      return 'icon-image';
    if (['pdf'].includes(ext)) return 'icon-pdf';
    if (['zip', 'rar', '7z'].includes(ext)) return 'icon-archive';
    return 'icon-default';
  };

  const fetchAttachments = async () => {
    loading.value = true;
    try {
      const res = await getAttachments({
        page: currentPage.value,
        page_size: pageSize.value,
        group_id: activeGroupId.value,
        keyword: searchKeyword.value || undefined,
        mime_type: filterMimeType.value || undefined,
      });
      attachments.value = res.data.data.data;
      pagination.total = res.data.data.total;
      pagination.current = currentPage.value;
    } catch (err) {
      // error handled by interceptor
    } finally {
      loading.value = false;
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await getAttachmentGroups({ page: 1, page_size: 100 });
      groups.value = res.data.data.data;
    } catch (err) {
      // error handled by interceptor
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
    selectedKeys.value = keys as number[];
  };

  const handleGroupSelect = (groupId?: number) => {
    activeGroupId.value = groupId;
    currentPage.value = 1;
    fetchAttachments();
  };

  const handlePreview = (record: AttachmentResponse) => {
    currentAttachment.value = record;
    previewVisible.value = true;
  };

  const handleDelete = async (record: AttachmentResponse) => {
    try {
      await deleteAttachment(record.id);
      Message.success(t('system.attachment.deleteSuccess'));
      fetchAttachments();
    } catch (err) {
      // error handled by interceptor
    }
  };

  const handleBatchDelete = async () => {
    try {
      await batchDeleteAttachments(selectedKeys.value);
      Message.success(t('system.attachment.deleteSuccess'));
      selectedKeys.value = [];
      fetchAttachments();
    } catch (err) {
      // error handled by interceptor
    }
  };

  const handleMove = async (record: AttachmentResponse, groupId?: number) => {
    try {
      await moveAttachment(record.id, groupId);
      Message.success(t('system.attachment.moveSuccess'));
      fetchAttachments();
    } catch (err) {
      // error handled by interceptor
    }
  };

  // 分组管理
  const handleCreateGroup = () => {
    editingGroup.value = undefined;
    groupForm.name = '';
    groupForm.description = '';
    groupFormVisible.value = true;
  };

  const handleEditGroup = (group: AttachmentGroupResponse) => {
    editingGroup.value = group;
    groupForm.name = group.name;
    groupForm.description = group.description || '';
    groupFormVisible.value = true;
  };

  const handleDeleteGroup = async (group: AttachmentGroupResponse) => {
    try {
      await deleteAttachmentGroup(group.id);
      Message.success(t('system.attachment.group.deleteSuccess'));
      fetchGroups();
      if (activeGroupId.value === group.id) {
        activeGroupId.value = undefined;
        fetchAttachments();
      }
    } catch (err) {
      // error handled by interceptor
    }
  };

  const handleGroupFormSubmit = async () => {
    if (!groupForm.name.trim()) return;
    submitting.value = true;
    try {
      if (editingGroup.value) {
        await updateAttachmentGroup(editingGroup.value.id, {
          name: groupForm.name,
          description: groupForm.description || undefined,
        });
        Message.success(t('system.attachment.group.updateSuccess'));
      } else {
        await createAttachmentGroup({
          name: groupForm.name,
          description: groupForm.description || undefined,
        });
        Message.success(t('system.attachment.group.createSuccess'));
      }
      await fetchGroups();
      groupFormVisible.value = false;
    } catch (err) {
      // error handled by interceptor
    } finally {
      submitting.value = false;
    }
  };

  onMounted(() => {
    fetchAttachments();
    fetchGroups();
  });
</script>

<script lang="ts">
  export default {
    name: 'SystemAttachment',
  };
</script>

<style lang="less" scoped>
  .group-panel {
    background: var(--bg-subtle);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
    overflow: hidden;
    min-height: 400px;

    &-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-subtle);
    }

    &-title {
      font-weight: 600;
      font-size: 14px;
      color: rgb(var(--gray-8));
    }
  }

  .group-list {
    padding: 4px;
  }

  .group-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: var(--transition-fast);
    font-size: 13px;
    color: rgb(var(--gray-7));

    &:hover {
      background: var(--bg-card-hover);
    }

    &.active {
      background: var(--primary-50);
      color: var(--primary-600);
      font-weight: 500;
    }

    &-icon {
      color: var(--primary-400);
      font-size: 16px;
      flex-shrink: 0;
    }

    &-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &-count {
      margin-left: auto;
      font-size: 11px;
      color: rgb(var(--gray-5));
      background: rgb(var(--gray-2));
      padding: 0 6px;
      border-radius: 10px;
    }

    &-more {
      opacity: 0;
      margin-left: auto;
    }

    &:hover &-more {
      opacity: 1;
    }
  }

  .file-icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;

    &.icon-image {
      background: #dbeafe;
    }
    &.icon-pdf {
      background: #fef2f2;
    }
    &.icon-archive {
      background: #fef3c7;
    }
    &.icon-default {
      background: #f1f5f9;
    }
  }

  body[arco-theme='dark'] & {
    .group-item {
      &.active {
        background: rgba(37, 99, 235, 0.15);
      }

      &:hover {
        background: var(--bg-card-hover);
      }

      &-count {
        background: rgb(var(--gray-3));
      }
    }
  }
</style>
