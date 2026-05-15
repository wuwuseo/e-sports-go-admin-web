import axios from 'axios';
import type {
  AttachmentResponse,
  AttachmentGroupResponse,
  CreateAttachmentGroupRequest,
  UpdateAttachmentGroupRequest,
  AttachmentQuery,
  ApiResponse,
  PaginatedResponse,
  UnifiedUploadResponse,
  BatchDeleteRequest,
  MoveAttachmentRequest,
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
  return axios.post<ApiResponse<UnifiedUploadResponse>>(
    '/api/v1/admin/auth/attachments/upload',
    formData
  );
}

// 分片上传 - 上传单个分片
export function uploadAttachmentChunk(
  file: Blob,
  options: {
    groupId?: number;
    uploadId?: string;
    chunkIndex: number;
    totalChunks?: number;
    filename?: string;
    fileSize?: number;
    chunkSize?: number;
  },
  onProgress?: (progressEvent: { loaded: number; total?: number }) => void
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('chunk_index', String(options.chunkIndex));

  if (options.uploadId) {
    formData.append('upload_id', options.uploadId);
  }
  // 每片都携带，方便后端校验
  if (options.totalChunks !== undefined) {
    formData.append('total_chunks', String(options.totalChunks));
  }
  if (options.filename) {
    formData.append('filename', options.filename);
  }
  if (options.fileSize !== undefined) {
    formData.append('file_size', String(options.fileSize));
  }
  if (options.chunkSize !== undefined) {
    formData.append('chunk_size', String(options.chunkSize));
  }

  if (options.groupId) {
    formData.append('group_id', String(options.groupId));
  }

  return axios.post<ApiResponse<UnifiedUploadResponse>>(
    '/api/v1/admin/auth/attachments/upload',
    formData,
    { onUploadProgress: onProgress }
  );
}

// 查询分片上传状态
export function getChunkStatus(uploadId: string) {
  return axios.get<ApiResponse<import('@/types/api').ChunkStatusResponse>>(
    `/api/v1/admin/auth/attachments/chunk/status/${uploadId}`
  );
}

// 取消分片上传
export function cancelChunkUpload(uploadId: string) {
  return axios.delete<ApiResponse<null>>(
    `/api/v1/admin/auth/attachments/chunk/${uploadId}`
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
  const data: BatchDeleteRequest = { ids };
  return axios.delete<ApiResponse<null>>(
    '/api/v1/admin/auth/attachments/batch',
    { data }
  );
}

// 移动附件到分组
export function moveAttachment(id: number, groupId?: number | null) {
  const data: MoveAttachmentRequest = { group_id: groupId ?? undefined };
  return axios.put<ApiResponse<null>>(
    `/api/v1/admin/auth/attachments/${id}/move`,
    data
  );
}

// 预览/下载附件
// 直接生成 URL（不携带 JWT，仅用于非认证场景）
export function getAttachmentPreviewUrl(id: number) {
  return `/api/v1/admin/auth/attachments/${id}/preview`;
}

// 通过 axios 带认证下载附件（返回 Blob）
export function downloadAttachment(
  id: number,
  onProgress?: (progressEvent: { loaded: number; total?: number }) => void
) {
  return axios.get<Blob>(`/api/v1/admin/auth/attachments/${id}/preview`, {
    responseType: 'blob',
    onDownloadProgress: onProgress,
  });
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
