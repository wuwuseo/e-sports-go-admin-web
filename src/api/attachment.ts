import axios from 'axios';
import type {
  AttachmentResponse,
  AttachmentGroupResponse,
  CreateAttachmentGroupRequest,
  UpdateAttachmentGroupRequest,
  AttachmentQuery,
  ApiResponse,
  PaginatedResponse,
} from '@/types/api';

// 获取附件列表
export function getAttachments(params?: AttachmentQuery) {
  return axios.get<ApiResponse<PaginatedResponse<AttachmentResponse>>>(
    '/api/v1/admin/auth/attachments',
    { params }
  );
}

// 上传附件
export function uploadAttachment(file: File, groupId?: number) {
  const formData = new FormData();
  formData.append('file', file);
  if (groupId) formData.append('group_id', String(groupId));
  return axios.post<ApiResponse<AttachmentResponse>>(
    '/api/v1/admin/auth/attachments',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
}

// 获取附件详情
export function getAttachmentDetail(id: number) {
  return axios.get<ApiResponse<AttachmentResponse>>(
    `/api/v1/admin/auth/attachments/${id}`
  );
}

// 删除附件
export function deleteAttachment(id: number) {
  return axios.delete<ApiResponse<null>>(
    `/api/v1/admin/auth/attachments/${id}`
  );
}

// 批量删除附件
export function batchDeleteAttachments(ids: number[]) {
  return axios.delete<ApiResponse<null>>(
    '/api/v1/admin/auth/attachments/batch',
    { data: { ids } }
  );
}

// 移动附件到分组
export function moveAttachment(id: number, groupId?: number | null) {
  return axios.put<ApiResponse<null>>(
    `/api/v1/admin/auth/attachments/${id}/move`,
    { group_id: groupId ?? null }
  );
}

// 预览/下载附件
export function getAttachmentPreviewUrl(id: number) {
  return `/api/v1/admin/auth/attachments/${id}/preview`;
}

// 获取附件分组列表
export function getAttachmentGroups(params?: {
  page?: number;
  page_size?: number;
}) {
  return axios.get<ApiResponse<PaginatedResponse<AttachmentGroupResponse>>>(
    '/api/v1/admin/auth/attachment-groups',
    { params }
  );
}

// 创建附件分组
export function createAttachmentGroup(data: CreateAttachmentGroupRequest) {
  return axios.post<ApiResponse<AttachmentGroupResponse>>(
    '/api/v1/admin/auth/attachment-groups',
    data
  );
}

// 获取附件分组详情
export function getAttachmentGroupDetail(id: number) {
  return axios.get<ApiResponse<AttachmentGroupResponse>>(
    `/api/v1/admin/auth/attachment-groups/${id}`
  );
}

// 更新附件分组
export function updateAttachmentGroup(
  id: number,
  data: UpdateAttachmentGroupRequest
) {
  return axios.put<ApiResponse<AttachmentGroupResponse>>(
    `/api/v1/admin/auth/attachment-groups/${id}`,
    data
  );
}

// 删除附件分组
export function deleteAttachmentGroup(id: number) {
  return axios.delete<ApiResponse<null>>(
    `/api/v1/admin/auth/attachment-groups/${id}`
  );
}
