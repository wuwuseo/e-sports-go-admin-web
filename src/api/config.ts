import axios from 'axios';
import { invalidateWalletDisplay } from '@/apps/esports/wallet-display';
import type {
  ConfigResponse,
  CreateConfigRequest,
  UpdateConfigRequest,
  ConfigQuery,
  ApiResponse,
  PaginatedResponse,
  ConfigGroup,
} from '@/types/api';

// 获取动态配置列表
export function getConfigList(params?: ConfigQuery) {
  return axios.get<ApiResponse<PaginatedResponse<ConfigResponse>>>(
    '/api/v1/admin/auth/configs',
    { params }
  );
}

// 创建动态配置
export async function createConfig(data: CreateConfigRequest) {
  const response = await axios.post<ApiResponse<ConfigResponse>>(
    '/api/v1/admin/auth/configs',
    data
  );
  if (data.key === 'app.esports.wallet_display') {
    await invalidateWalletDisplay();
  }
  return response;
}

// 按键获取配置
export function getConfigByKey(key: string) {
  return axios.get<ApiResponse<ConfigResponse>>(
    `/api/v1/admin/auth/configs/by-key/${key}`
  );
}

// 按分组获取配置
export function getConfigByGroup(group: string) {
  return axios.get<ApiResponse<ConfigResponse[]>>(
    `/api/v1/admin/auth/configs/group/${group}`
  );
}

// 获取配置详情
export function getConfigDetail(id: number) {
  return axios.get<ApiResponse<ConfigResponse>>(
    `/api/v1/admin/auth/configs/${id}`
  );
}

// 更新配置
export async function updateConfig(id: number, data: UpdateConfigRequest) {
  const response = await axios.put<ApiResponse<ConfigResponse>>(
    `/api/v1/admin/auth/configs/${id}`,
    data
  );
  if (response.data.data?.key === 'app.esports.wallet_display') {
    await invalidateWalletDisplay();
  }
  return response;
}

// 删除配置
export async function deleteConfig(id: number) {
  const response = await axios.delete<ApiResponse<null>>(
    `/api/v1/admin/auth/configs/${id}`
  );
  await invalidateWalletDisplay();
  return response;
}

// 获取配置分组选项
export function getConfigGroups() {
  return axios.get<ApiResponse<ConfigGroup[]>>(
    '/api/v1/admin/auth/configs/groups'
  );
}
