import axios from 'axios';

// 消息类型：系统公告 / 个人业务 / 任务进度
export type MessageBizType = 'system' | 'business' | 'task';

// 消息级别
export type MessageLevel = 'info' | 'warning' | 'error';

// 广播作用域
export type BroadcastScope = 'all' | 'users' | 'roles';

// 服务端推送 / 列表返回的消息结构（对齐后端 service.MessageResponse）
export interface MessageRecord {
  id: number;
  type: MessageBizType;
  level?: MessageLevel;
  title: string;
  subTitle?: string;
  avatar?: string;
  content: string;
  // 富文本正文（详情接口返回）
  content_html?: string;
  // 后端字段：created_at（ISO 时间字符串）
  created_at: string;
  // 已读时间，空字符串 / null / undefined 表示未读
  read_at?: string | null;
  // 接收用户 UID
  user_uid?: string;
  // 业务扩展字段，例如跳转链接
  extra?: Record<string, unknown>;
}

export type MessageListType = MessageRecord[];

// 列表分页响应（对齐后端 service.ListResponse-service_MessageResponse）
export interface MessagePageResp {
  // 后端字段名为 data
  data: MessageRecord[];
  total: number;
  page: number;
}

// 分页查询参数（snake_case，对齐后端 query 参数命名）
export interface MessageListParams {
  page?: number;
  page_size?: number;
  type?: MessageBizType;
  // 0 未读 / 1 已读
  read_status?: 0 | 1;
  // 关键字（按标题/内容模糊搜索）
  keyword?: string;
  level?: MessageLevel;
  // RFC3339 起止时间
  start_time?: string;
  end_time?: string;
  // 排序方式
  sort?: 'created_at_desc' | 'created_at_asc';
}

// 未读数响应（对齐后端 service.UnreadCountResponse）
export interface UnreadCountResp {
  total: number;
  system: number;
  business: number;
  task: number;
}

// 申请 SSE 临时 ticket 的响应
export interface SseTicketResp {
  ticket: string;
  // 过期时间（秒级时间戳），兼容驼峰与下划线两种命名
  expireAt?: number;
  expire_at?: number;
}

// 消息偏好（对齐 service.MessagePreferenceResponse / UpdateMessagePreferenceRequest）
export interface MessagePreference {
  desktop_notify: boolean;
  sound_notify: boolean;
  subscribe_system: boolean;
  subscribe_business: boolean;
  subscribe_task: boolean;
  // HH:mm，可为空字符串
  do_not_disturb_start: string;
  do_not_disturb_end: string;
}

export type UpdateMessagePreferenceParams = Partial<MessagePreference>;

// 批量删除请求
export interface DeleteBatchReq {
  ids: number[];
}

// 批量删除/清空响应
export interface DeleteBatchResp {
  deleted: number;
}

// 条件清空请求
export interface ClearMessagesReq {
  type?: MessageBizType;
  // 0 未读 / 1 已读
  read_status?: 0 | 1;
  // RFC3339，删除此时间之前的
  before?: string;
}

// 广播目标
export interface BroadcastTarget {
  scope: BroadcastScope;
  user_uids?: string[];
  role_codes?: string[];
}

// 广播请求
export interface BroadcastReq {
  type: MessageBizType;
  level: MessageLevel;
  title: string;
  content: string;
  content_html?: string;
  extra?: Record<string, unknown>;
  target: BroadcastTarget;
}

// 广播响应
export interface BroadcastResp {
  delivered: number;
}

// 后端路径前缀
const ADMIN_AUTH_BASE = '/api/v1/admin/auth';

// 获取消息列表（分页）
export function queryMessageList(params: MessageListParams = {}) {
  return axios.get<MessagePageResp>(`${ADMIN_AUTH_BASE}/messages`, { params });
}

// 获取消息详情
export function getMessageDetail(id: number) {
  return axios.get<MessageRecord>(`${ADMIN_AUTH_BASE}/messages/${id}`);
}

// 标记部分消息为已读
export function markMessageRead(ids: number[]) {
  return axios.post<null>(`${ADMIN_AUTH_BASE}/messages/read`, { ids });
}

// 一键全部已读
export function markAllMessageRead() {
  return axios.post<null>(`${ADMIN_AUTH_BASE}/messages/read-all`);
}

// 批量标记为未读
export function markMessageUnread(ids: number[]) {
  return axios.post<null>(`${ADMIN_AUTH_BASE}/messages/unread`, { ids });
}

// 删除指定消息
export function deleteMessage(id: number) {
  return axios.delete<null>(`${ADMIN_AUTH_BASE}/messages/${id}`);
}

// 批量删除
export function deleteMessageBatch(ids: number[]) {
  return axios.post<DeleteBatchResp>(
    `${ADMIN_AUTH_BASE}/messages/delete-batch`,
    {
      ids,
    }
  );
}

// 条件清空
export function clearMessages(params: ClearMessagesReq) {
  return axios.post<DeleteBatchResp>(
    `${ADMIN_AUTH_BASE}/messages/clear`,
    params
  );
}

// 获取未读数统计（注意：路径是 unread-count）
export function queryUnreadCount() {
  return axios.get<UnreadCountResp>(`${ADMIN_AUTH_BASE}/messages/unread-count`);
}

// 获取消息偏好
export function getMessagePreference() {
  return axios.get<MessagePreference>(`${ADMIN_AUTH_BASE}/messages/preference`);
}

// 更新消息偏好（部分更新）
export function updateMessagePreference(data: UpdateMessagePreferenceParams) {
  return axios.put<MessagePreference>(
    `${ADMIN_AUTH_BASE}/messages/preference`,
    data
  );
}

// 管理员广播
export function broadcastMessage(data: BroadcastReq) {
  return axios.post<BroadcastResp>(
    `${ADMIN_AUTH_BASE}/messages/broadcast`,
    data
  );
}

// 申请 SSE 临时 ticket（5 分钟有效，一次性使用）
export function fetchSseTicket() {
  return axios.post<SseTicketResp>(`${ADMIN_AUTH_BASE}/sse/ticket`);
}

// 为了兼容旧调用：保留 setMessageStatus 别名
export function setMessageStatus(data: { ids: number[] }) {
  return markMessageRead(data.ids);
}
