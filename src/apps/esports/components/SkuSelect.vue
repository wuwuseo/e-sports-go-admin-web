<template>
  <a-select
    :model-value="modelValue > 0 ? modelValue : undefined"
    :placeholder="placeholder"
    :loading="loading"
    :disabled="disabled"
    allow-search
    allow-clear
    :filter-option="false"
    @search="onSearch"
    @popup-visible-change="onPopupVisibleChange"
    @update:model-value="onUpdate"
  >
    <a-option v-for="item in options" :key="item.id" :value="item.id">
      {{ item.title }}<span v-if="item.code"> · {{ item.code }}</span>
    </a-option>
  </a-select>
</template>

<script setup lang="ts">
  import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { listSkus } from '../api';
  import type { EsportsSku } from '../api';

  // 商品（SKU）搜索选择：关键词同时匹配商品名与编码，选项回显商品名而不是 ID。
  interface SkuOption {
    id: number;
    title: string;
    code: string;
  }

  const props = withDefaults(
    defineProps<{
      modelValue?: number;
      // 仅在售（报单）或全部状态（补录历史单 / 售后规则）由调用方决定。
      status?: EsportsSku['status'];
      placeholder?: string;
      disabled?: boolean;
      // 已选商品不在最近搜索结果里时的兜底名称，避免下拉回显数字 ID。
      fallbackTitle?: string;
      limit?: number;
    }>(),
    {
      modelValue: 0,
      status: undefined,
      placeholder: '搜索商品名称或编码',
      disabled: false,
      fallbackTitle: '',
      limit: 50,
    }
  );

  const emit = defineEmits<{
    (e: 'update:modelValue', value: number): void;
    (e: 'select', option: SkuOption | null): void;
  }>();

  const options = ref<SkuOption[]>([]);
  const loading = ref(false);
  const selected = ref<SkuOption | null>(null);
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let requestToken = 0;
  let errorShown = false;

  const toOption = (sku: EsportsSku): SkuOption => ({
    id: sku.id,
    title: sku.title,
    code: sku.code,
  });

  function selectedFallback(): SkuOption | null {
    if (props.modelValue <= 0) return null;
    return {
      id: props.modelValue,
      title: props.fallbackTitle || '已选商品',
      code: '',
    };
  }

  async function load(keyword = '') {
    requestToken += 1;
    const token = requestToken;
    loading.value = true;
    try {
      const result = await listSkus({
        keyword: keyword || undefined,
        status: props.status,
        limit: props.limit,
      });
      if (token !== requestToken) return;
      const rows = (result.data.data || []).map(toOption);
      const current = selected.value || selectedFallback();
      if (current && !rows.some((item) => item.id === current.id)) {
        rows.unshift(current);
      }
      options.value = rows;
      if (current && !selected.value) selected.value = current;
      errorShown = false;
    } catch {
      if (token !== requestToken) return;
      if (!errorShown) {
        errorShown = true;
        Message.error('加载商品列表失败，请稍后重试');
      }
    } finally {
      if (token === requestToken) loading.value = false;
    }
  }

  function onSearch(keyword: string) {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => load(keyword.trim()), 250);
  }

  function onPopupVisibleChange(visible: boolean) {
    // 每次展开重置为初始列表，避免上次搜索词把选项过滤得只剩几条。
    if (visible) load('');
  }

  function onUpdate(value: unknown) {
    const id = typeof value === 'number' ? value : 0;
    const option = options.value.find((item) => item.id === id) || null;
    selected.value = option;
    emit('update:modelValue', id);
    emit('select', option);
  }

  watch(
    () => props.status,
    () => {
      selected.value = null;
      options.value = [];
      load('');
    }
  );

  watch(
    () => [props.modelValue, props.fallbackTitle] as const,
    ([value, fallbackTitle]) => {
      if (!value) {
        selected.value = null;
        return;
      }
      const option =
        options.value.find((item) => item.id === value) ||
        (fallbackTitle ? { id: value, title: fallbackTitle, code: '' } : null);
      if (option) selected.value = option;
    }
  );

  onMounted(() => load(''));

  onBeforeUnmount(() => {
    if (searchTimer) clearTimeout(searchTimer);
  });
</script>
