import { ref } from 'vue';

/** 把「置 loading → 执行 → 复位」的样板收敛到一处。 */
export default function useAsync<T>(fn: () => Promise<T>) {
  const loading = ref(false);
  const run = async () => {
    loading.value = true;
    try {
      return await fn();
    } finally {
      loading.value = false;
    }
  };
  return { loading, run };
}
