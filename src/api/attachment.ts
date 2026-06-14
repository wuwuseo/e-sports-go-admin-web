import axios from 'axios';
import type {
  AttachmentResponse,
  AttachmentAccessUrlResponse,
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

export function getAttachments(params?: AttachmentQuery) {
  return axios.get<ApiResponse<PaginatedResponse<AttachmentResponse>>>(
    '/api/v1/admin/auth/attachments',
    { params }
  );
}

export function uploadAttachment(
  file: File,
  groupId?: number,
  directory?: string
) {
  const formData = new FormData();
  formData.append('file', file);
  if (groupId) formData.append('group_id', String(groupId));
  if (directory) formData.append('directory', directory);
  return axios.post<ApiResponse<UnifiedUploadResponse>>(
    '/api/v1/admin/auth/attachments/upload',
    formData
  );
}

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
    directory?: string;
  },
  onProgress?: (progressEvent: { loaded: number; total?: number }) => void
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('chunk_index', String(options.chunkIndex));

  if (options.uploadId) {
    formData.append('upload_id', options.uploadId);
  }
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
  if (options.directory) {
    formData.append('directory', options.directory);
  }

  return axios.post<ApiResponse<UnifiedUploadResponse>>(
    '/api/v1/admin/auth/attachments/upload',
    formData,
    { onUploadProgress: onProgress }
  );
}

export function getChunkStatus(uploadId: string) {
  return axios.get<ApiResponse<import('@/types/api').ChunkStatusResponse>>(
    `/api/v1/admin/auth/attachments/chunk/status/${uploadId}`
  );
}

export function cancelChunkUpload(uploadId: string) {
  return axios.delete<ApiResponse<null>>(
    `/api/v1/admin/auth/attachments/chunk/${uploadId}`
  );
}

export function getAttachmentDetail(id: number) {
  return axios.get<ApiResponse<AttachmentResponse>>(
    `/api/v1/admin/auth/attachments/${id}`
  );
}

export function deleteAttachment(id: number) {
  return axios.delete<ApiResponse<null>>(
    `/api/v1/admin/auth/attachments/${id}`
  );
}

export function batchDeleteAttachments(ids: number[]) {
  const data: BatchDeleteRequest = { ids };
  return axios.delete<ApiResponse<null>>(
    '/api/v1/admin/auth/attachments/batch',
    { data }
  );
}

export function moveAttachment(id: number, groupId?: number | null) {
  const data: MoveAttachmentRequest = { group_id: groupId ?? undefined };
  return axios.put<ApiResponse<null>>(
    `/api/v1/admin/auth/attachments/${id}/move`,
    data
  );
}

export function getAttachmentAccessUrl(id: number) {
  return axios.get<ApiResponse<AttachmentAccessUrlResponse>>(
    `/api/v1/admin/auth/attachments/${id}/access-url`
  );
}

export function getAttachmentGroups(params?: {
  page?: number;
  page_size?: number;
}) {
  return axios.get<ApiResponse<PaginatedResponse<AttachmentGroupResponse>>>(
    '/api/v1/admin/auth/attachment-groups',
    { params }
  );
}

export function createAttachmentGroup(data: CreateAttachmentGroupRequest) {
  return axios.post<ApiResponse<AttachmentGroupResponse>>(
    '/api/v1/admin/auth/attachment-groups',
    data
  );
}

export function getAttachmentGroupDetail(id: number) {
  return axios.get<ApiResponse<AttachmentGroupResponse>>(
    `/api/v1/admin/auth/attachment-groups/${id}`
  );
}

export function updateAttachmentGroup(
  id: number,
  data: UpdateAttachmentGroupRequest
) {
  return axios.put<ApiResponse<AttachmentGroupResponse>>(
    `/api/v1/admin/auth/attachment-groups/${id}`,
    data
  );
}

export function deleteAttachmentGroup(id: number) {
  return axios.delete<ApiResponse<null>>(
    `/api/v1/admin/auth/attachment-groups/${id}`
  );
}
