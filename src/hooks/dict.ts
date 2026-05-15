import { ref, onUnmounted, type Ref } from 'vue';
import mitt from 'mitt';
import { getDictDataByType } from '@/api/dict-data';
import type { DictDataResponse } from '@/types/api';

// 下拉框/标签使用的字典选项结构
export interface DictOption {
  label: string;
  value: string;
  raw: DictDataResponse;
}

// 字典事件总线类型：'change' 表示某个字典类型发生了变更
type DictEvents = {
  change: { dictType: string };
};

// 全局字典事件总线（同一进程内单例）
const dictBus = mitt<DictEvents>();

// 字典数据缓存：key 为 dict_type，value 为字典项数组
const dictCache = new Map<string, DictOption[]>();

// 正在加载中的请求 Promise 缓存，避免同类型并发重复请求
const loadingMap = new Map<string, Promise<DictOption[]>>();

// 把后端字典记录转换为下拉选项
function toOptions(list: DictDataResponse[]): DictOption[] {
  // 仅过滤明确为禁用（status === 0）的字典项，
  // 兼容后端可能返回 number / string 两种类型的 status 字段
  return list
    .filter((item) => Number(item.status) !== 0)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((item) => ({
      label: item.label,
      value: item.value,
      raw: item,
    }));
}

/**
 * 加载指定类型的字典数据。
 * - 默认走缓存；force = true 时强制刷新。
 * - 同类型并发调用会复用同一个进行中的请求。
 */
export async function loadDict(
  dictType: string,
  force = false
): Promise<DictOption[]> {
  if (!force && dictCache.has(dictType)) {
    return dictCache.get(dictType) as DictOption[];
  }
  const inFlight = loadingMap.get(dictType);
  if (!force && inFlight) {
    return inFlight;
  }
  const task = (async () => {
    try {
      const { data } = await getDictDataByType(dictType);
      const options = toOptions(data.data || []);
      dictCache.set(dictType, options);
      return options;
    } finally {
      loadingMap.delete(dictType);
    }
  })();
  loadingMap.set(dictType, task);
  return task;
}

/**
 * 清空指定字典类型缓存（不传则清空全部）。
 */
export function clearDictCache(dictType?: string) {
  if (dictType) {
    dictCache.delete(dictType);
  } else {
    dictCache.clear();
  }
}

/**
 * 通知订阅者：某个字典类型已发生变化，需要重新拉取。
 * 传空字符串或不传时，广播所有已缓存的类型。
 */
export function notifyDictChange(dictType?: string) {
  if (dictType) {
    clearDictCache(dictType);
    dictBus.emit('change', { dictType });
    return;
  }
  // 广播所有已知类型，方便字典页一次性保存后让所有下拉同步
  const allTypes = Array.from(dictCache.keys());
  clearDictCache();
  allTypes.forEach((t) => dictBus.emit('change', { dictType: t }));
}

/**
 * Vue 组合式 API：在组件中使用某个字典类型。
 * - options：响应式的字典选项数组，可直接 v-for 渲染
 * - loading：加载状态
 * - refresh：手动强制刷新
 * - 自动订阅字典变更事件，组件卸载时自动取消订阅
 */
export function useDict(dictType: string): {
  options: Ref<DictOption[]>;
  loading: Ref<boolean>;
  refresh: () => Promise<void>;
} {
  const options = ref<DictOption[]>([]) as Ref<DictOption[]>;
  const loading = ref(false);

  const fetchData = async (force = false) => {
    loading.value = true;
    try {
      options.value = await loadDict(dictType, force);
    } catch {
      // 接口异常时保留旧数据，错误已由 axios 拦截器统一处理
    } finally {
      loading.value = false;
    }
  };

  // 字典变更事件回调：仅响应当前类型
  const handler = (payload: { dictType: string }) => {
    if (payload.dictType === dictType) {
      fetchData(true);
    }
  };
  dictBus.on('change', handler);

  onUnmounted(() => {
    dictBus.off('change', handler);
  });

  // 立即触发一次加载
  fetchData();

  return {
    options,
    loading,
    refresh: () => fetchData(true),
  };
}
