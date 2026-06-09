import type { PermissionResponse } from '@/types/api';

export type RoleType = '' | '*' | 'admin' | 'user';
export interface UserState {
  name?: string;
  avatar?: string;
  job?: string;
  organization?: string;
  location?: string;
  email?: string;
  introduction?: string;
  personalWebsite?: string;
  jobName?: string;
  organizationName?: string;
  locationName?: string;
  phone?: string;
  registrationDate?: string;
  accountId?: string;
  certification?: number;
  role: RoleType;
  // 用户混合权限列表
  permissions: PermissionResponse[];
  // 用户混合权限码列表
  permissionCodes: string[];
  // 权限加载状态
  permissionsLoading: boolean;
  // 是否为管理员账号
  isAdmin?: boolean;
  // 是否为超级管理员
  isSuperAdmin?: boolean;
}
