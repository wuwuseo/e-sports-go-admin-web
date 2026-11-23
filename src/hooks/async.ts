import { ref } from 'vue';

/**
 * 把「置 loading → 执行 → 复位」的样板收敛到一处。
 * run 支持透传入参，便于把带查询参数的 loader 也纳入同一形态。
 */
export default function useAsync<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>
) {
  const loading = ref(false);
  const run = async (...args: A) => {
    loading.value = true;
    try {
      return await fn(...args);
    } finally {
      loading.value = false;
    }
  };
  return { loading, run };
}
