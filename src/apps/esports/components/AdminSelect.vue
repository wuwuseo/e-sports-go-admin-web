<template>
  <a-select
    :model-value="modelValue > 0 ? modelValue : undefined"
    :placeholder="resolvedPlaceholder"
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
      {{ item.name }}
    </a-option>
  </a-select>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue';
  import { listCsStaff } from '../api';

  // 客服（员工）搜索选择：管理端各处「负责客服 / 处理客服 / 考官 / 转单目标」
  // 统一用本组件按姓名选择，不再手填数字 ID。数据源为独立客服列表接口，
  // 无权限 / 接口失败时下拉为空并提示，不降级手填。
  interface AdminOption {
    id: number;
    name: string;
  }

  const props = withDefaults(
    defineProps<{
      modelValue?: number;
      placeholder?: string;
      disabled?: boolean;
      // 首次打开时预取的数量；后续搜索仍按关键词远程取数。
      limit?: number;
    }>(),
    {
      modelValue: 0,
      placeholder: '',
      disabled: false,
      limit: 50,
    }
  );

  const emit = defineEmits<{
    (e: 'update:modelValue', value: number): void;
  }>();

  const options = ref<AdminOption[]>([]);
  const loading = ref(false);
  const loadFailed = ref(false);
  let requestToken = 0;

  const resolvedPlaceholder = computed(() =>
    loadFailed.value
      ? '客服列表加载失败'
      : props.placeholder || '搜索并选择客服'
  );

  async function load(keyword: string) {
    requestToken += 1;
    const token = requestToken;
    loading.value = true;
    try {
      const res = await listCsStaff(keyword, props.limit);
      if (token !== requestToken) return;
      options.value = res.data.data || [];
      loadFailed.value = false;
    } catch {
      if (token !== requestToken) return;
      // 不降级手填：保留失败态提示，用户可重试展开。
      loadFailed.value = true;
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
    // 每次展开重置为初始列表，避免上次搜索词把选项过滤得只剩几条。
    if (visible) load('');
  }

  function onUpdate(value: unknown) {
    emit('update:modelValue', typeof value === 'number' ? value : 0);
  }

  onMounted(() => {
    load('');
  });
</script>
