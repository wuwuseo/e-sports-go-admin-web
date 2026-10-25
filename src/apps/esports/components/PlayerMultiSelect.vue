<template>
  <a-select
    :model-value="modelValue"
    :placeholder="resolvedPlaceholder"
    :loading="loading"
    :disabled="disabled"
    multiple
    allow-search
    allow-clear
    :filter-option="false"
    :max-tag-count="6"
    @search="onSearch"
    @popup-visible-change="onPopupVisibleChange"
    @update:model-value="onUpdate"
  >
    <a-option
      v-for="item in options"
      :key="item.id"
      :value="item.id"
      :disabled="isFull && !modelValue.includes(item.id)"
    >
      {{ item.display_name }}（#{{ item.id }}）
    </a-option>
  </a-select>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue';
  import { listPlayers } from '../api';

  // 陪玩多选搜索：报单等场景指定多个陪玩（第一个作为主陪玩）。
  // 远程按关键词搜索，选中项保留在选项里，重新搜索不会丢失已选。
  interface PlayerOption {
    id: number;
    display_name: string;
  }

  const props = withDefaults(
    defineProps<{
      modelValue?: number[];
      placeholder?: string;
      disabled?: boolean;
      // 可选数量上限（多人单按商品席位数）。
      max?: number;
    }>(),
    {
      modelValue: () => [],
      placeholder: '',
      disabled: false,
      max: 0,
    }
  );

  const emit = defineEmits<{
    (e: 'update:modelValue', value: number[]): void;
  }>();

  const options = ref<PlayerOption[]>([]);
  const selectedOptions = ref<PlayerOption[]>([]);
  const loading = ref(false);
  let requestToken = 0;

  const resolvedPlaceholder = computed(
    () => props.placeholder || '搜索并选择陪玩（可多选）'
  );
  const isFull = computed(
    () => props.max > 0 && (props.modelValue?.length ?? 0) >= props.max
  );

  function mergeOptions(items: PlayerOption[]) {
    const known = new Map<number, PlayerOption>();
    [...selectedOptions.value, ...options.value, ...items].forEach((item) => {
      known.set(item.id, item);
    });
    options.value = [...known.values()];
  }

  async function load(keyword: string) {
    requestToken += 1;
    const token = requestToken;
    loading.value = true;
    try {
      const res = await listPlayers(keyword);
      if (token !== requestToken) return;
      mergeOptions(
        (res.data.data || []).map((item) => ({
          id: item.id,
          display_name: item.display_name,
        }))
      );
    } finally {
      if (token === requestToken) loading.value = false;
    }
  }

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  function onSearch(value: string) {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => load(value.trim()), 250);
  }

  function onPopupVisibleChange(visible: boolean) {
    if (visible) load('');
  }

  function onUpdate(value: unknown) {
    const ids = Array.isArray(value) ? (value as number[]) : [];
    emit('update:modelValue', ids);
  }

  // 外部直接设值（如固排一键带入）时同步远端名称：刷新当前选中项缓存。
  watch(
    () => props.modelValue,
    () => {
      selectedOptions.value = props.modelValue
        .map((id) => options.value.find((item) => item.id === id))
        .filter((item): item is PlayerOption => !!item);
    },
    { deep: true }
  );

  onMounted(() => {
    load('');
  });
</script>
