import axios from 'axios';
import type {
  SlideResponse,
  SlideQuery,
  CreateSlideRequest,
  UpdateSlideRequest,
  ApiResponse,
  PaginatedResponse,
} from '@/types/api';

// 获取幻灯片列表
export function getSlides(params?: SlideQuery) {
  return axios.get<ApiResponse<PaginatedResponse<SlideResponse>>>(
    '/api/v1/admin/auth/slides',
    { params }
  );
}

// 获取幻灯片详情
export function getSlideDetail(id: number) {
  return axios.get<ApiResponse<SlideResponse>>(
    `/api/v1/admin/auth/slides/${id}`
  );
}

// 创建幻灯片
export function createSlide(data: CreateSlideRequest) {
  return axios.post<ApiResponse<SlideResponse>>(
    '/api/v1/admin/auth/slides',
    data
  );
}

// 更新幻灯片
export function updateSlide(id: number, data: UpdateSlideRequest) {
  return axios.put<ApiResponse<SlideResponse>>(
    `/api/v1/admin/auth/slides/${id}`,
    data
  );
}

// 删除幻灯片
export function deleteSlide(id: number) {
  return axios.delete<ApiResponse<null>>(`/api/v1/admin/auth/slides/${id}`);
}
