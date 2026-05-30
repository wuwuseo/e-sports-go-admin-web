import { onMounted, onUnmounted, ref } from 'vue';
import { Notification } from '@arco-design/web-vue';
import { isLogin } from '@/utils/auth';
import { useMessageStore } from '@/store';
import sseService, {
  SseConnectionStatus,
  SseEventPayload,
} from '@/services/sse.service';
import { MessageRecord, MessageLevel, UnreadCountResp } from '@/api/message';

// hook 配置项
export interface UseSseMessageOptions {
  // 是否在挂载时自动建立连接，默认 true
  autoConnect?: boolean;
  // 是否启用浏览器内通知弹窗，默认 true
  enableNotification?: boolean;
  // 收到新消息的额外回调
  onMessage?: (msg: MessageRecord) => void;
}

// 根据消息级别映射 Arco Notification 的类型
function mapNotificationType(level?: MessageLevel) {
  switch (level) {
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    case 'info':
    default:
      return 'info';
  }
}

/**
 * 站内消息 SSE 订阅 Hook
 * 提供连接状态、自动订阅、登出清理等能力
 */
export default function useSseMessage(options: UseSseMessageOptions = {}) {
  const { autoConnect = true, enableNotification = true, onMessage } = options;

  const status = ref<SseConnectionStatus>(sseService.getStatus());
  const messageStore = useMessageStore();

  // 取消订阅函数集合
  const disposers: Array<() => void> = [];
  let started = false;

  const initializeMessageCache = async () => {
    await Promise.allSettled([
      messageStore.fetchUnreadCount(),
      messageStore.fetchList({ page: 1 }),
    ]);
  };

  const handleIncoming = (payload: SseEventPayload<MessageRecord>) => {
    const msg = payload.data as MessageRecord;
    if (!msg || typeof msg !== 'object' || !msg.id) {
      return;
    }
    // 更新 store
    messageStore.pushIncoming(msg);

    // 浏览器内通知弹窗
    if (enableNotification) {
      Notification[mapNotificationType(msg.level)]({
        title: msg.title || '新消息',
        content: msg.content || '',
        duration: 5000,
        closable: true,
      });
    }

    // 自定义回调
    onMessage?.(msg);
  };

  // 处理未读数变更事件：后端推送最新的未读数统计，直接覆盖本地状态
  const handleUnreadCount = (payload: SseEventPayload<UnreadCountResp>) => {
    const { data } = payload;
    if (!data || typeof data !== 'object') {
      return;
    }
    // 后端可能只推总数，也可能推完整对象；做兼容合并
    messageStore.unread = {
      total:
        typeof data.total === 'number' ? data.total : messageStore.unread.total,
      system:
        typeof data.system === 'number'
          ? data.system
          : messageStore.unread.system,
      business:
        typeof data.business === 'number'
          ? data.business
          : messageStore.unread.business,
      task:
        typeof data.task === 'number' ? data.task : messageStore.unread.task,
    };
  };

  // 处理消息删除事件：用于多端同步删除状态
  // 后端可能推送单个 id 或 id 数组：{ id: 1 } 或 { ids: [1,2] }
  const handleMessageDeleted = (
    payload: SseEventPayload<{ id?: number; ids?: number[] }>
  ) => {
    const { data } = payload;
    if (!data || typeof data !== 'object') {
      return;
    }
    const ids: number[] = [];
    if (Array.isArray(data.ids)) {
      ids.push(...data.ids.filter((v) => typeof v === 'number'));
    }
    if (typeof data.id === 'number') {
      ids.push(data.id);
    }
    if (!ids.length) return;
    // 本地同步移除并扣减未读数；不再调用后端删除接口（事件本身即来自后端）
    messageStore.list.forEach((item) => {
      if (ids.includes(item.id) && !item.read_at) {
        messageStore.unread.total = Math.max(0, messageStore.unread.total - 1);
        if (item.type === 'system')
          messageStore.unread.system = Math.max(
            0,
            messageStore.unread.system - 1
          );
        else if (item.type === 'business')
          messageStore.unread.business = Math.max(
            0,
            messageStore.unread.business - 1
          );
        else if (item.type === 'task')
          messageStore.unread.task = Math.max(0, messageStore.unread.task - 1);
      }
    });
    messageStore.list = messageStore.list.filter(
      (item) => !ids.includes(item.id)
    );
    messageStore.total = Math.max(0, messageStore.total - ids.length);
  };

  const start = async () => {
    if (!isLogin()) return;
    if (started) return;
    started = true;

    disposers.push(
      sseService.onStatusChange((s) => {
        status.value = s;
      })
    );
    disposers.push(
      sseService.on<MessageRecord>('message', handleIncoming as never)
    );
    disposers.push(
      sseService.on<MessageRecord>('system', handleIncoming as never)
    );
    disposers.push(
      sseService.on<UnreadCountResp>('unread_count', handleUnreadCount as never)
    );
    disposers.push(
      sseService.on<{ id?: number; ids?: number[] }>(
        'message_deleted',
        handleMessageDeleted as never
      )
    );

    await sseService.connect();
    initializeMessageCache();
  };

  const stop = () => {
    disposers.forEach((dispose) => dispose());
    disposers.length = 0;
    started = false;
    sseService.disconnect();
  };

  onMounted(() => {
    if (autoConnect) {
      start();
    }
  });

  onUnmounted(() => {
    stop();
  });

  return {
    status,
    start,
    stop,
  };
}
