import { defineStore } from 'pinia';
import {
  queryMessageList,
  queryUnreadCount,
  markMessageRead,
  markAllMessageRead,
  markMessageUnread,
  deleteMessage,
  deleteMessageBatch,
  clearMessages,
  getMessageDetail,
  getMessagePreference,
  updateMessagePreference,
  MessageRecord,
  MessageBizType,
  UnreadCountResp,
  MessageListParams,
  MessagePreference,
  UpdateMessagePreferenceParams,
  ClearMessagesReq,
} from '@/api/message';

// 默认偏好
const DEFAULT_PREFERENCE: MessagePreference = {
  desktop_notify: true,
  sound_notify: false,
  subscribe_system: true,
  subscribe_business: true,
  subscribe_task: true,
  do_not_disturb_start: '',
  do_not_disturb_end: '',
};

// 消息模块的 store 状态
export interface MessageState {
  // 消息列表（按时间倒序）
  list: MessageRecord[];
  // 当前分页页码
  page: number;
  // 分页大小
  pageSize: number;
  // 总数
  total: number;
  // 未读数统计
  unread: UnreadCountResp;
  // 列表加载中
  loading: boolean;
  // 消息偏好
  preference: MessagePreference;
  // 偏好加载中
  preferenceLoading: boolean;
}

// 工具：从 HttpResponse 中安全取出业务 data
function pickData<T>(resp: unknown): T | null {
  const wrapped = resp as { data?: { data?: T } };
  return wrapped?.data?.data ?? null;
}

// 工具：根据消息类型扣减未读数（避免多处重复逻辑）
function decUnread(unread: UnreadCountResp, type: MessageBizType, n = 1) {
  unread.total = Math.max(0, unread.total - n);
  if (type === 'system') unread.system = Math.max(0, unread.system - n);
  else if (type === 'business')
    unread.business = Math.max(0, unread.business - n);
  else if (type === 'task') unread.task = Math.max(0, unread.task - n);
}

const useMessageStore = defineStore('message', {
  state: (): MessageState => ({
    list: [],
    page: 1,
    pageSize: 20,
    total: 0,
    unread: { total: 0, system: 0, business: 0, task: 0 },
    loading: false,
    preference: { ...DEFAULT_PREFERENCE },
    preferenceLoading: false,
  }),

  getters: {
    // 未读总数
    unreadTotal(state): number {
      return state.unread.total;
    },
    // 按业务类型筛选消息
    listByType:
      (state) =>
      (type: MessageBizType): MessageRecord[] => {
        return state.list.filter((item) => item.type === type);
      },
  },

  actions: {
    // 拉取消息列表（兼容驼峰/下划线两种字段命名风格）
    async fetchList(params: MessageListParams & { pageSize?: number } = {}) {
      this.loading = true;
      try {
        const resp = await queryMessageList({
          page: params.page ?? this.page,
          page_size: params.page_size ?? params.pageSize ?? this.pageSize,
          type: params.type,
          read_status: params.read_status,
          keyword: params.keyword,
          level: params.level,
          start_time: params.start_time,
          end_time: params.end_time,
          sort: params.sort,
        });
        // 后端返回结构：{ data: MessageRecord[], total, page }
        const data = pickData<{
          data: MessageRecord[];
          total: number;
          page: number;
        }>(resp);
        if (data) {
          this.list = data.data || [];
          this.total = data.total || 0;
          this.page = data.page || 1;
          if (params.page_size ?? params.pageSize) {
            this.pageSize = (params.page_size ?? params.pageSize) as number;
          }
        }
      } finally {
        this.loading = false;
      }
    },

    // 拉取未读数
    async fetchUnreadCount() {
      try {
        const resp = await queryUnreadCount();
        const data = pickData<UnreadCountResp>(resp);
        if (data) {
          this.unread = data;
        }
      } catch {
        // 静默失败，不打断用户操作
      }
    },

    // 获取详情（不写入 list，由调用方接收返回值）
    async fetchDetail(id: number): Promise<MessageRecord | null> {
      const resp = await getMessageDetail(id);
      return pickData<MessageRecord>(resp);
    },

    // 处理新消息：插入到列表头部并更新未读数
    pushIncoming(msg: MessageRecord) {
      // 防重：相同 id 不重复插入
      if (this.list.some((item) => item.id === msg.id)) {
        return;
      }
      this.list.unshift(msg);
      // 仅未读才累加（read_at 为空串/null/undefined 都算未读）
      if (!msg.read_at) {
        this.unread.total += 1;
        if (msg.type === 'system') this.unread.system += 1;
        else if (msg.type === 'business') this.unread.business += 1;
        else if (msg.type === 'task') this.unread.task += 1;
      }
    },

    // 标记指定消息为已读
    async markRead(ids: number[]) {
      if (!ids.length) return;
      await markMessageRead(ids);
      const now = new Date().toISOString();
      this.list = this.list.map((item) => {
        if (ids.includes(item.id) && !item.read_at) {
          decUnread(this.unread, item.type, 1);
          return { ...item, read_at: now };
        }
        return item;
      });
    },

    // 批量标记为未读
    async markUnread(ids: number[]) {
      if (!ids.length) return;
      await markMessageUnread(ids);
      this.list = this.list.map((item) => {
        if (ids.includes(item.id) && item.read_at) {
          // 累加未读
          this.unread.total += 1;
          if (item.type === 'system') this.unread.system += 1;
          else if (item.type === 'business') this.unread.business += 1;
          else if (item.type === 'task') this.unread.task += 1;
          return { ...item, read_at: null };
        }
        return item;
      });
    },

    // 一键全部已读
    async markAllRead() {
      await markAllMessageRead();
      const now = new Date().toISOString();
      this.list = this.list.map((item) =>
        item.read_at ? item : { ...item, read_at: now }
      );
      this.unread = { total: 0, system: 0, business: 0, task: 0 };
    },

    // 删除单条消息
    async remove(id: number) {
      await deleteMessage(id);
      const target = this.list.find((item) => item.id === id);
      this.list = this.list.filter((item) => item.id !== id);
      if (target && !target.read_at) {
        decUnread(this.unread, target.type, 1);
      }
      this.total = Math.max(0, this.total - 1);
    },

    // 批量删除
    async removeBatch(ids: number[]) {
      if (!ids.length) return 0;
      const resp = await deleteMessageBatch(ids);
      const data = pickData<{ deleted: number }>(resp);
      // 扣减未读数
      this.list.forEach((item) => {
        if (ids.includes(item.id) && !item.read_at) {
          decUnread(this.unread, item.type, 1);
        }
      });
      this.list = this.list.filter((item) => !ids.includes(item.id));
      const deleted = data?.deleted ?? ids.length;
      this.total = Math.max(0, this.total - deleted);
      return deleted;
    },

    // 条件清空
    async clear(params: ClearMessagesReq) {
      const resp = await clearMessages(params);
      const data = pickData<{ deleted: number }>(resp);
      // 清空后强制刷新一次列表 + 未读数
      await Promise.all([this.fetchList({ page: 1 }), this.fetchUnreadCount()]);
      return data?.deleted ?? 0;
    },

    // 拉取消息偏好
    async fetchPreference() {
      this.preferenceLoading = true;
      try {
        const resp = await getMessagePreference();
        const data = pickData<MessagePreference>(resp);
        if (data) {
          this.preference = { ...DEFAULT_PREFERENCE, ...data };
        }
      } finally {
        this.preferenceLoading = false;
      }
    },

    // 更新消息偏好
    async updatePreference(params: UpdateMessagePreferenceParams) {
      const resp = await updateMessagePreference(params);
      const data = pickData<MessagePreference>(resp);
      if (data) {
        this.preference = { ...DEFAULT_PREFERENCE, ...data };
      } else {
        // 后端没回完整对象时，做本地合并
        this.preference = { ...this.preference, ...params };
      }
    },

    // 重置整个 store（登出时调用）
    reset() {
      this.list = [];
      this.page = 1;
      this.total = 0;
      this.unread = { total: 0, system: 0, business: 0, task: 0 };
      this.preference = { ...DEFAULT_PREFERENCE };
    },
  },
});

export default useMessageStore;
