import axios from 'axios';
import type {
  DictDataResponse,
  CreateDictDataRequest,
  UpdateDictDataRequest,
  DictDataQuery,
  ApiResponse,
  PaginatedResponse,
} from '@/types/api';

// 获取字典数据列表
export function getDictDataList(params?: DictDataQuery) {
  return axios.get<ApiResponse<PaginatedResponse<DictDataResponse>>>(
    '/api/v1/admin/auth/dict-data',
    { params }
  );
}

// 创建字典数据
export function createDictData(data: CreateDictDataRequest) {
  return axios.post<ApiResponse<DictDataResponse>>(
    '/api/v1/admin/auth/dict-data',
    data
  );
}

// 获取字典数据详情
export function getDictDataDetail(id: number) {
  return axios.get<ApiResponse<DictDataResponse>>(
    `/api/v1/admin/auth/dict-data/${id}`
  );
}

// 更新字典数据
export function updateDictData(id: number, data: UpdateDictDataRequest) {
  return axios.put<ApiResponse<DictDataResponse>>(
    `/api/v1/admin/auth/dict-data/${id}`,
    data
  );
}

// 删除字典数据
export function deleteDictData(id: number) {
  return axios.delete<ApiResponse<null>>(`/api/v1/admin/auth/dict-data/${id}`);
}

// 按类型获取字典数据
export function getDictDataByType(type: string) {
  return axios.get<ApiResponse<DictDataResponse[]>>(
    `/api/v1/admin/auth/dict-data/type/${type}`
  );
}
