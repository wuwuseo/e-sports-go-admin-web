import axios from 'axios';
import type {
  ApiResponse,
  InstallPluginRequest,
  PaginatedResponse,
  PluginQuery,
  PluginResponse,
} from '@/types/api';

const pluginPath = (pluginId: string) => encodeURIComponent(pluginId);

// 获取插件列表
export function getPlugins(params?: PluginQuery) {
  return axios.get<
    ApiResponse<PaginatedResponse<PluginResponse> | PluginResponse[]>
  >('/api/v1/admin/auth/plugins', { params });
}

// 获取插件详情
export function getPluginDetail(pluginId: string) {
  return axios.get<ApiResponse<PluginResponse>>(
    `/api/v1/admin/auth/plugins/${pluginPath(pluginId)}`
  );
}

// 安装插件
export function installPlugin(data: InstallPluginRequest) {
  return axios.post<ApiResponse<PluginResponse>>(
    '/api/v1/admin/auth/plugins/install',
    data
  );
}

// 启用插件
export function enablePlugin(pluginId: string) {
  return axios.post<ApiResponse<null>>(
    `/api/v1/admin/auth/plugins/${pluginPath(pluginId)}/enable`
  );
}

// 停用插件
export function disablePlugin(pluginId: string) {
  return axios.post<ApiResponse<null>>(
    `/api/v1/admin/auth/plugins/${pluginPath(pluginId)}/disable`
  );
}

// 卸载插件
export function uninstallPlugin(pluginId: string) {
  return axios.delete<ApiResponse<null>>(
    `/api/v1/admin/auth/plugins/${pluginPath(pluginId)}`
  );
}
