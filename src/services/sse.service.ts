import { fetchSseTicket, MessageRecord } from '@/api/message';

// SSE 事件类型
// - message / system：业务消息推送（system 为系统公告）
// - unread_count：未读数变更（后端会推送最新的未读数统计）
// - message_deleted：消息被删除（用于多端同步删除状态）
// - dispatch_changed：派单看板有业务变更（任一电竞写操作成功后广播），页面收到即重拉
// - ready：连接就绪（后端推送的初始化事件）
// - heartbeat：心跳保活
// - error：连接错误（前端内部事件，非后端推送）
export type SseEventType =
  | 'message'
  | 'system'
  | 'unread_count'
  | 'message_deleted'
  | 'dispatch_changed'
  | 'ready'
  | 'heartbeat'
  | 'error';

// 后端推送的可订阅事件名（不含 error，error 为前端内部状态）
const SERVER_EVENT_TYPES: Exclude<SseEventType, 'error'>[] = [
  'message',
  'system',
  'unread_count',
  'message_deleted',
  'dispatch_changed',
  'ready',
  'heartbeat',
];

// SSE 事件载荷
export interface SseEventPayload<T = unknown> {
  type: SseEventType;
  // 服务端事件 ID，用于断线重连时的 Last-Event-ID
  id?: string;
  data: T;
}

// SSE 连接状态
export type SseConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'closed';

// SSE 监听器类型
type SseListener<T = unknown> = (payload: SseEventPayload<T>) => void;

// 状态监听器
type StatusListener = (status: SseConnectionStatus) => void;

// 重连退避序列（毫秒）：1s -> 2s -> 4s -> 8s -> 16s -> 30s
const BACKOFF_SEQUENCE = [1000, 2000, 4000, 8000, 16000, 30000];

// localStorage 中保存 Last-Event-ID 的 key
const LAST_EVENT_ID_KEY = 'sse_last_event_id';

// 从 localStorage 读取最后一次事件 ID
function readLastEventId(): string | null {
  try {
    return localStorage.getItem(LAST_EVENT_ID_KEY);
  } catch {
    return null;
  }
}

// 写入最后一次事件 ID
function writeLastEventId(id: string): void {
  try {
    localStorage.setItem(LAST_EVENT_ID_KEY, id);
  } catch {
    // 忽略 localStorage 异常
  }
}

/**
 * SSE 连接管理器（单例）
 * 职责：
 * 1. 通过 ticket 鉴权建立长连接
 * 2. 自动重连（指数退避）+ Last-Event-ID 补发
 * 3. 心跳检测
 * 4. 事件订阅分发
 */
class SseService {
  private eventSource: EventSource | null = null;

  private status: SseConnectionStatus = 'idle';

  private retryIndex = 0;

  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  // 心跳超时检测计时器
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;

  // 心跳超时阈值：服务端 25s 心跳，前端 40s 未收到任何消息则判定为断线
  private heartbeatTimeout = 40_000;

  // 主动关闭标志，避免主动关闭时触发重连
  private manualClosed = false;

  // 事件监听器（按事件类型）
  private listeners = new Map<SseEventType, Set<SseListener>>();

  // 状态变更监听器
  private statusListeners = new Set<StatusListener>();

  /**
   * 启动 SSE 连接
   */
  async connect(): Promise<void> {
    if (
      this.status === 'connecting' ||
      this.status === 'open' ||
      this.status === 'reconnecting'
    ) {
      return;
    }
    this.manualClosed = false;
    await this.openConnection();
  }

  /**
   * 主动断开连接
   */
  disconnect(): void {
    this.manualClosed = true;
    this.clearRetryTimer();
    this.clearHeartbeatTimer();
    this.closeEventSource();
    this.setStatus('closed');
    this.retryIndex = 0;
  }

  /**
   * 订阅指定类型的事件
   * @returns 取消订阅函数
   */
  on<T = MessageRecord>(
    type: SseEventType,
    listener: SseListener<T>
  ): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener as SseListener);
    return () => {
      this.listeners.get(type)?.delete(listener as SseListener);
    };
  }

  /**
   * 订阅连接状态变化
   */
  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * 获取当前连接状态
   */
  getStatus(): SseConnectionStatus {
    return this.status;
  }

  // ============== 私有方法 ==============

  private async openConnection(): Promise<void> {
    try {
      this.setStatus(this.retryIndex > 0 ? 'reconnecting' : 'connecting');

      // 1. 申请 ticket
      // axios 返回的 data 是后端统一的 HttpResponse 结构，再取 .data 才是业务字段
      const resp = await fetchSseTicket();
      const ticket = (resp.data as unknown as { data?: { ticket?: string } })
        ?.data?.ticket;
      if (!ticket) {
        throw new Error('未获取到 SSE ticket');
      }

      // 2. 拼接 URL（带上 lastEventId 用于断线补发）
      const lastEventId = readLastEventId();
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const params = new URLSearchParams({ ticket });
      if (lastEventId) {
        params.append('lastEventId', lastEventId);
      }
      const url = `${baseUrl}/api/v1/admin/sse/connect?${params.toString()}`;

      // 3. 建立 EventSource
      this.closeEventSource();
      const es = new EventSource(url, { withCredentials: false });
      this.eventSource = es;

      es.onopen = () => {
        this.setStatus('open');
        this.retryIndex = 0;
        this.resetHeartbeatTimer();
      };

      // 注意：onmessage 与 addEventListener('message') 监听的是同一个事件。
      // 为避免重复触发（之前的实现会让每条 message 被分发两次），
      // 这里只使用 addEventListener 统一注册所有后端推送的事件类型。
      SERVER_EVENT_TYPES.forEach((evtName) => {
        es.addEventListener(evtName, (ev) =>
          this.handleMessageEvent(ev as MessageEvent, evtName)
        );
      });

      es.onerror = () => {
        // EventSource 自身的 onerror 在断连/不可达时触发
        this.handleConnectionError();
      };
    } catch (err) {
      // ticket 申请失败或建立连接抛错，进入重连
      this.handleConnectionError();
    }
  }

  private handleMessageEvent(ev: MessageEvent, type: SseEventType): void {
    // 收到任意事件即视为连接活跃，重置心跳计时
    this.resetHeartbeatTimer();

    // 保存 Last-Event-ID 用于下次重连
    if (ev.lastEventId) {
      writeLastEventId(ev.lastEventId);
    }

    // 心跳与 ready 事件仅用于保活/握手，不分发到业务监听
    if (type === 'heartbeat' || type === 'ready') {
      return;
    }

    let { data } = ev;
    try {
      data = JSON.parse(ev.data);
    } catch {
      // 非 JSON 数据按原样分发
    }

    this.emit(type, {
      type,
      id: ev.lastEventId || undefined,
      data,
    });
  }

  private handleConnectionError(): void {
    if (this.manualClosed) {
      return;
    }
    this.closeEventSource();
    this.clearHeartbeatTimer();
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    this.clearRetryTimer();
    const delay =
      BACKOFF_SEQUENCE[Math.min(this.retryIndex, BACKOFF_SEQUENCE.length - 1)];
    this.retryIndex += 1;
    this.setStatus('reconnecting');
    this.retryTimer = setTimeout(() => {
      // 定时器触发时再次确认未被主动关闭，避免在 disconnect 之后仍然重连
      if (this.manualClosed) {
        return;
      }
      this.openConnection();
    }, delay);
  }

  private resetHeartbeatTimer(): void {
    this.clearHeartbeatTimer();
    this.heartbeatTimer = setTimeout(() => {
      // 超过阈值未收到任何事件，主动重连
      this.handleConnectionError();
    }, this.heartbeatTimeout);
  }

  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private closeEventSource(): void {
    if (this.eventSource) {
      this.eventSource.onopen = null;
      this.eventSource.onmessage = null;
      this.eventSource.onerror = null;
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private setStatus(status: SseConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch {
        // 忽略监听器异常
      }
    });
  }

  private emit(type: SseEventType, payload: SseEventPayload): void {
    this.listeners.get(type)?.forEach((listener) => {
      try {
        listener(payload);
      } catch {
        // 忽略业务监听器异常，避免影响其他订阅
      }
    });
  }
}

// 单例导出
const sseService = new SseService();

// Vite HMR：在模块被热替换前主动断开旧连接，避免开发期累积大量泄漏连接。
// import.meta.hot 仅在 dev 模式存在，生产构建时该分支会被剔除。
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try {
      sseService.disconnect();
    } catch {
      // 忽略 dispose 阶段异常
    }
  });
}

export default sseService;
