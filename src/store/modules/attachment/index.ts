import { defineStore } from 'pinia';
import {
  createFetchListAction,
  createFetchDetailAction,
  createDeleteAction,
} from '@/store/mixins/crud';
import {
  getAttachments,
  createAttachmentGroup,
  updateAttachmentGroup,
  deleteAttachmentGroup,
  getAttachmentGroups,
  getAttachmentDetail,
  deleteAttachment,
  batchDeleteAttachments,
  moveAttachment,
} from '@/api/attachment';
import type {
  AttachmentResponse,
  AttachmentGroupResponse,
  CreateAttachmentGroupRequest,
  UpdateAttachmentGroupRequest,
  AttachmentQuery,
} from '@/types/api';

export interface AttachmentState {
  items: AttachmentResponse[];
  total: number;
  currentItem?: AttachmentResponse;
  loading: boolean;
  groups: AttachmentGroupResponse[];
}

const useAttachmentStore = defineStore('attachment', {
  state: (): AttachmentState => ({
    items: [],
    total: 0,
    currentItem: undefined,
    loading: false,
    groups: [],
  }),

  getters: {
    attachments: (state) => state.items,
    currentAttachment: (state) => state.currentItem,
  },

  actions: {
    // 只使用：查 + 删（附件通过上传创建，不使用通用 create；移动是专用 API）
    ...createFetchListAction<AttachmentResponse, AttachmentQuery>({
      getList: getAttachments,
    }),
    ...createFetchDetailAction<AttachmentResponse>({
      getDetail: getAttachmentDetail,
    }),
    ...createDeleteAction<AttachmentResponse>({
      delete: deleteAttachment,
    }),

    // 别名：保持向后兼容
    async fetchAttachments(query?: AttachmentQuery) {
      await this.fetchList(query);
      return this.items;
    },

    async deleteAttachment(id: number) {
      await this.delete(id);
    },

    async fetchAttachmentDetail(id: number) {
      return this.fetchDetail(id);
    },

    // 业务特定方法
    async batchDelete(ids: number[]) {
      await batchDeleteAttachments(ids);
    },

    async moveAttachment(id: number, groupId?: number | null) {
      await moveAttachment(id, groupId);
    },

    // 附件分组 CRUD
    async fetchGroups(params?: { page?: number; page_size?: number }) {
      const res = await getAttachmentGroups(params);
      this.groups = res.data.data.data;
      return this.groups;
    },

    async createGroup(data: CreateAttachmentGroupRequest) {
      const res = await createAttachmentGroup(data);
      return res.data.data;
    },

    async updateGroup(id: number, data: UpdateAttachmentGroupRequest) {
      const res = await updateAttachmentGroup(id, data);
      return res.data.data;
    },

    async deleteGroup(id: number) {
      await deleteAttachmentGroup(id);
    },
  },
});

export default useAttachmentStore;
