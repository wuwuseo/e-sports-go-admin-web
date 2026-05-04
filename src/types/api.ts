// ===== 通用响应 =====
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  total: number;
}

// ===== 认证相关 =====
export interface LoginRequest {
  email?: string;
  password?: string;
  encrypted_email?: string;
  encrypted_password?: string;
  key_id?: string;
  nonce?: string;
  timestamp?: number;
}

export interface PublicKeyResponse {
  algorithm: string;
  created_at: string;
  expires_at: string;
  key_id: string;
  public_key: string;
  rotate_cycle: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

// ===== 用户相关 =====
export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

// ===== 角色相关 =====
export interface RoleResponse {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  is_system: boolean;
  status: string;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
}

export interface CreateRoleRequest {
  name: string;
  display_name: string;
  description?: string;
  created_by?: string;
}

export interface UpdateRoleRequest {
  name?: string;
  display_name?: string;
  description?: string;
  updated_by?: string;
}

// ===== 权限相关 =====
export type PermissionType = 'api' | 'menu' | 'button';

export interface PermissionResponse {
  id: number;
  role_name: string;
  domain: string;
  object: string;
  action: string;
  type: PermissionType;
  description?: string;
}

export interface CreatePermissionRequest {
  role_name: string;
  domain: string;
  object: string;
  action: string;
  type: PermissionType;
  description?: string;
}

export interface UpdatePermissionRequest {
  id: number;
  role_name?: string;
  domain?: string;
  object?: string;
  action?: string;
  type?: PermissionType;
  description?: string;
}

export interface AssignPermissionsRequest {
  role_name: string;
  domain: string;
  permissions: Array<{
    object: string;
    action: string;
    type: PermissionType;
    description?: string;
  }>;
}

export interface RemovePermissionsRequest {
  role_name: string;
  domain: string;
  permissions: Array<{
    object: string;
    action: string;
    type: PermissionType;
  }>;
}

// ===== 附件相关 =====
export interface AttachmentResponse {
  id: number;
  name: string;
  original_name: string;
  path: string;
  mime_type: string;
  extension: string;
  size: number;
  group_id: number;
  uploaded_by: number;
  created_at: string;
  updated_at: string;
}

export interface AttachmentGroupResponse {
  id: number;
  name: string;
  description?: string;
  sort: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAttachmentGroupRequest {
  name: string;
  description?: string;
  sort?: number;
}

export interface UpdateAttachmentGroupRequest {
  name?: string;
  description?: string;
  sort?: number;
}

// ===== 定时任务相关 =====
export type CronJobType = 'shell' | 'curl' | 'task';

export interface CronJobResponse {
  id: number;
  name: string;
  expression: string;
  type: CronJobType;
  command: string;
  description?: string;
  enabled: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LogFileInfo {
  filename: string;
  size: number;
  created_at: string;
}

export interface CreateCronJobRequest {
  name: string;
  expression: string;
  type: CronJobType;
  command: string;
  description?: string;
  enabled?: boolean;
}

export interface UpdateCronJobRequest {
  name?: string;
  expression?: string;
  type?: CronJobType;
  command?: string;
  description?: string;
  enabled?: boolean;
}

// ===== 操作日志相关 =====
export interface OperationLogResponse {
  id: number;
  user_id: number;
  username: string;
  module: string;
  action: string;
  description?: string;
  path: string;
  method: string;
  request_body: string;
  status_code: number;
  ip: string;
  user_agent: string;
  duration_ms: number;
  created_at: string;
}

// ===== 查询参数 =====
export interface PaginationQuery {
  page?: number;
  page_size?: number;
}

export interface RoleQuery extends PaginationQuery {
  keyword?: string;
  status?: string;
}

export interface PermissionQuery extends PaginationQuery {
  keyword?: string;
  role_name?: string;
  domain?: string;
  type?: PermissionType;
}

export interface AttachmentQuery extends PaginationQuery {
  group_id?: number;
  mime_type?: string;
  keyword?: string;
}

export interface CronJobQuery extends PaginationQuery {
  keyword?: string;
  type?: CronJobType;
  enabled?: boolean;
}

export interface OperationLogQuery extends PaginationQuery {
  username?: string;
  module?: string;
  action?: string;
  start_time?: string;
  end_time?: string;
}

// ===== 数据字典相关 =====
export interface DictDataResponse {
  id: number;
  dict_type: string;
  label: string;
  value: string;
  css_class?: string;
  is_default: boolean;
  sort: number;
  status: number;
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDictDataRequest {
  dict_type: string;
  label: string;
  value: string;
  css_class?: string;
  is_default?: boolean;
  sort?: number;
  status?: number;
  remark?: string;
}

export interface UpdateDictDataRequest {
  dict_type?: string;
  label?: string;
  value?: string;
  css_class?: string;
  is_default?: boolean;
  sort?: number;
  status?: number;
  remark?: string;
}

export interface DictDataQuery extends PaginationQuery {
  keyword?: string;
  dict_type?: string;
  status?: number;
}

// ===== 系统配置相关 =====
export type ConfigValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'json'
  | 'array'
  | 'array2d';

export interface ConfigResponse {
  id: number;
  name: string;
  key: string;
  value: string;
  type: ConfigValueType;
  group: string;
  status: number;
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateConfigRequest {
  name: string;
  key: string;
  value?: string;
  type?: ConfigValueType;
  group?: string;
  status?: number;
  remark?: string;
}

export interface UpdateConfigRequest {
  name?: string;
  key?: string;
  value?: string;
  type?: ConfigValueType;
  group?: string;
  status?: number;
  remark?: string;
}

export interface ConfigQuery extends PaginationQuery {
  keyword?: string;
  group?: string;
  status?: number;
}

// 配置分组选项
export interface ConfigGroup {
  label: string;
  value: string;
}
