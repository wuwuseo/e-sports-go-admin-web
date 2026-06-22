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

export interface PublicOAuthProvider {
  provider: string;
  display_name: string;
}

export interface OAuthExchangeRequest {
  code: string;
}

export interface OAuthIdentity {
  id: number;
  provider: string;
  display_name: string;
  openid: string;
  nickname: string;
  avatar_url: string;
  status: string;
  last_sync_at?: string;
}

export interface OAuthProviderConfig {
  provider: string;
  display_name: string;
  client_id: string;
  client_secret?: string;
  secret_configured: boolean;
  callback_url: string;
  user_redirect_url: string;
  admin_redirect_url: string;
  user_enabled: boolean;
  admin_enabled: boolean;
}

export interface OAuthProviderConfigInput {
  provider: string;
  display_name: string;
  client_id: string;
  client_secret?: string;
  clear_secret?: boolean;
  callback_url: string;
  user_redirect_url: string;
  admin_redirect_url: string;
  user_enabled: boolean;
  admin_enabled: boolean;
}

export interface AdminOAuthIdentityListItem {
  id: number;
  admin_id: number;
  admin_uid: string;
  admin_email: string;
  admin_name: string;
  provider: string;
  display_name: string;
  openid: string;
  nickname: string;
  avatar_url: string;
  status: string;
  last_sync_at?: string;
  created_at: string;
}

// ===== 用户相关 =====
export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

// ===== 角色相关 =====
// 角色数据权限范围枚举
export type DataScope =
  | 'all'
  | 'self'
  | 'department'
  | 'department_and_child'
  | 'custom';

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
  // 数据权限范围
  data_scope: DataScope;
  // 自定义部门列表（仅 data_scope = 'custom' 时生效）
  data_scope_department_ids: number[];
}

export interface CreateRoleRequest {
  name: string;
  display_name: string;
  description?: string;
  created_by?: string;
  // 数据权限范围（默认 self）
  data_scope?: DataScope;
  // 自定义部门 ID 列表
  data_scope_department_ids?: number[];
}

export interface UpdateRoleRequest {
  name?: string;
  display_name?: string;
  description?: string;
  updated_by?: string;
  // 数据权限范围
  data_scope?: DataScope;
  // 自定义部门 ID 列表
  data_scope_department_ids?: number[];
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

// 权限规则（用于分配/移除权限）
export interface PermissionRule {
  object: string;
  action: string;
}

// 权限复合键（用于查询/删除权限）
export interface PermissionKey {
  role_name: string;
  domain: string;
  object: string;
  action: string;
}

// ===== 系统权限元数据（sys_permissions） =====
export type SysPermissionType = 'api' | 'menu' | 'button';

export interface SysPermissionResponse {
  id: number;
  name: string;
  code: string;
  type: SysPermissionType;
  domain: string;
  path?: string;
  method?: string;
  menu_path?: string;
  component?: string;
  icon?: string;
  parent_id?: number;
  sort_order?: number;
  is_common?: boolean;
  status: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSysPermissionRequest {
  name: string;
  code: string;
  type: SysPermissionType;
  domain: string;
  path?: string;
  method?: string;
  menu_path?: string;
  component?: string;
  icon?: string;
  parent_id?: number;
  sort_order?: number;
  is_common?: boolean;
  status?: number;
  description?: string;
}

export interface UpdateSysPermissionRequest {
  name?: string;
  code?: string;
  type?: SysPermissionType;
  domain?: string;
  path?: string;
  method?: string;
  menu_path?: string;
  component?: string;
  icon?: string;
  parent_id?: number;
  sort_order?: number;
  is_common?: boolean;
  status?: number;
  description?: string;
}

export interface SysPermissionTreeNode {
  id: number;
  name: string;
  code: string;
  type: SysPermissionType;
  domain: string;
  path?: string;
  method?: string;
  menu_path?: string;
  component?: string;
  icon?: string;
  parent_id?: number;
  sort_order?: number;
  is_common?: boolean;
  status: number;
  description?: string;
  children?: SysPermissionTreeNode[];
  checked?: boolean;
  indeterminate?: boolean;
}

export interface SysPermissionQuery {
  page?: number;
  page_size?: number;
  domain?: string;
  type?: SysPermissionType;
  keyword?: string;
  status?: number;
}

// ===== 部门管理相关 =====
export type DepartmentStatus = 'active' | 'inactive';

export interface Department {
  id: number;
  name: string;
  parent_id: number;
  path: string;
  sort: number;
  status: DepartmentStatus;
  leader?: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface DepartmentTreeNode extends Department {
  children?: DepartmentTreeNode[];
}

export interface CreateDepartmentPayload {
  name: string;
  parent_id: number;
  sort: number;
  status: DepartmentStatus;
  leader?: string;
  phone?: string;
  email?: string;
}

export interface UpdateDepartmentPayload {
  name: string;
  parent_id: number;
  sort: number;
  status: DepartmentStatus;
  leader?: string;
  phone?: string;
  email?: string;
}

export interface DepartmentTreeQuery {
  keyword?: string;
  status?: DepartmentStatus;
}

// 保存角色权限请求（覆盖式，基于 Casbin）
export interface SaveRolePermissionsRequest {
  domain: string;
  permissions: Array<{
    object: string;
    action: string;
  }>;
}

// ===== RBAC 树形权限结构 =====
export interface PermissionTreeNode {
  key: string;
  title: string;
  type: PermissionType;
  object: string;
  action: string;
  description?: string;
  children?: PermissionTreeNode[];
  isLeaf?: boolean;
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
}

export interface PermissionGroup {
  object: string;
  permissions: PermissionResponse[];
  children?: {
    action: string;
    permissions: PermissionResponse[];
  }[];
}

// 权限操作类型
export type PermissionAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'assign';

// 权限缓存项
export interface PermissionCacheItem {
  roleName: string;
  permissions: PermissionResponse[];
  timestamp: number;
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
  role_name: string;
  domain: string;
  object: string;
  action: string;
  type: PermissionType;
  new_object?: string;
  new_action?: string;
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
  disk?: string;
  driver?: string;
  directory?: string;
  content_hash?: string;
  mime_type: string;
  extension: string;
  size: number;
  group_id: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface AttachmentAccessUrlResponse {
  url: string;
  expires_in: number;
  mode?: string;
  public?: boolean;
  disk?: string;
  driver?: string;
}

export interface AttachmentGroupResponse {
  id: number;
  name: string;
  description?: string;
  sort: number;
  attachment_count?: number;
  file_count?: number;
  count?: number;
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

// ===== 分片上传相关 =====
export interface ChunkInitData {
  upload_id: string;
  chunk_index: number;
  received: boolean;
  total_chunks: number;
}

export interface ChunkProgressData {
  upload_id: string;
  chunk_index: number;
  received: boolean;
}

export interface ChunkUploadResult {
  attachment: AttachmentResponse;
}

export interface ChunkStatusResponse {
  upload_id: string;
  total_chunks: number;
  received_chunks: number[];
  is_completed: boolean;
}

// 统一上传响应（兼容简单上传与分片上传）
export interface UnifiedUploadResponse {
  attachment?: AttachmentResponse;
  chunk_index?: number;
  received?: boolean;
  total_chunks?: number;
  upload_id?: string;
}

// 批量删除请求
export interface BatchDeleteRequest {
  ids: number[];
}

// 移动附件请求
export interface MoveAttachmentRequest {
  group_id?: number;
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

// 获取所有权限（不带分页）的查询参数
export interface PermissionsAllQuery {
  keyword?: string;
  type?: PermissionType;
  domain?: string;
  role_name?: string;
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

// ===== 插件管理相关 =====
export type PluginStatus = 'installed' | 'enabled' | 'disabled' | 'error';

export interface PluginEngine {
  type: string;
  protocol: string;
  entry: Record<string, string>;
}

export interface PluginCompatibility {
  app: string;
  api: string;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description?: string;
  engine: PluginEngine;
  compatibility: PluginCompatibility;
  permissions: string[];
  extension_points: string[];
}

export interface PluginResponse {
  id?: number | string;
  plugin_id?: string;
  name: string;
  version: string;
  author: string;
  description?: string;
  status: PluginStatus;
  install_path: string;
  manifest?: PluginManifest;
  manifest_json?: PluginManifest | string;
  error_message?: string;
  installed_at?: string;
  enabled_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PluginQuery extends PaginationQuery {
  keyword?: string;
  status?: PluginStatus;
}

export interface InstallPluginRequest {
  package_path: string;
}

// 配置分组选项
export interface ConfigGroup {
  label: string;
  value: string;
}

// ===== 用户管理相关 =====
export interface UserResponse {
  id: number;
  username: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: 'active' | 'inactive';
  is_blacklisted: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserDetailResponse extends UserResponse {
  roles: string[];
  created_by?: string;
  updated_by?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  password?: string;
}

export interface UserQuery extends PaginationQuery {
  keyword?: string;
  status?: 'active' | 'inactive';
  is_blacklisted?: boolean;
}

// ===== 第三方用户相关 =====
export interface ThirdPartyUserResponse {
  id: number;
  user_id: number;
  user_uid?: string;
  user_name?: string;
  user_email?: string;
  platform: string;
  platform_name: string;
  openid: string;
  username?: string;
  nickname?: string;
  avatar_url?: string;
  source?: string;
  company?: string;
  status: string;
  last_sync_at?: string;
  created_at: string;
}

export interface ThirdPartyUserQuery extends PaginationQuery {
  keyword?: string;
  platform?: string;
}

// ===== 黑名单相关 =====
export interface BlacklistResponse {
  id: number;
  user_id: number;
  username: string;
  email: string;
  reason?: string;
  created_by: string;
  created_at: string;
  expires_at?: string;
}

export interface BlacklistUserRequest {
  reason?: string;
  expires_at?: string;
}

// ===== 角色分配相关 =====
export interface AssignUserRolesRequest {
  role_ids: number[];
}

// ===== 管理员管理相关 =====
export interface AdminLoginRequest {
  username?: string;
  password?: string;
  encrypted_username?: string;
  encrypted_password?: string;
  key_id?: string;
  nonce?: string;
  timestamp?: number;
}

export interface AdminResponse {
  id: number;
  username: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: 'active' | 'inactive';
  is_super_admin: boolean;
  // 所属部门 ID（0 表示未分配）
  department_id?: number;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminDetailResponse extends AdminResponse {
  roles: string[];
  created_by?: string;
  updated_by?: string;
}

export interface CreateAdminRequest {
  username: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
  is_super_admin?: boolean;
  // 所属部门 ID
  department_id?: number;
}

export interface UpdateAdminRequest {
  username?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  password?: string;
  is_super_admin?: boolean;
  // 所属部门 ID
  department_id?: number;
}

export interface AdminQuery extends PaginationQuery {
  keyword?: string;
  status?: 'active' | 'inactive';
  is_super_admin?: boolean;
}

export interface ChangeAdminPasswordRequest {
  old_password: string;
  new_password: string;
}
