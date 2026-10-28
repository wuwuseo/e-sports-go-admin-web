import axios from 'axios';
import type {
  SlideGroupResponse,
  CreateSlideGroupRequest,
  UpdateSlideGroupRequest,
  ApiResponse,
} from '@/types/api';

// 获取幻灯片分组列表(含分组下幻灯片数量)
export function getSlideGroups() {
  return axios.get<ApiResponse<SlideGroupResponse[]>>(
    '/api/v1/admin/auth/slide-groups'
  );
}

// 创建幻灯片分组
export function createSlideGroup(data: CreateSlideGroupRequest) {
  return axios.post<ApiResponse<SlideGroupResponse>>(
    '/api/v1/admin/auth/slide-groups',
    data
  );
}

// 更新幻灯片分组
export function updateSlideGroup(id: number, data: UpdateSlideGroupRequest) {
  return axios.put<ApiResponse<null>>(
    `/api/v1/admin/auth/slide-groups/${id}`,
    data
  );
}

// 删除幻灯片分组
export function deleteSlideGroup(id: number) {
  return axios.delete<ApiResponse<null>>(
    `/api/v1/admin/auth/slide-groups/${id}`
  );
}
