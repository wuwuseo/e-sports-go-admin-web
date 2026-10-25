<template>
  <!-- 管理员列表接口不可用（如客服无管理员管理权限）时降级为手填 ID。 -->
  <a-input-number
    v-if="failed"
    :model-value="modelValue > 0 ? modelValue : undefined"
    :placeholder="failedPlaceholder"
    :min="1"
    :precision="0"
    :style="{ width: '100%' }"
    @update:model-value="(v: number | undefined) => emit('update:modelValue', v ?? 0)"
  />
  <a-select
    v-else
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
      {{ item.username }}
    </a-option>
  </a-select>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue';
  import { getAdmins } from '@/api/user';

  // 客服（管理员）搜索选择：管理端各处「客服 ID / 负责客服 / 处理客服 / 考官」
  // 统一用本组件按姓名选择，不再手填数字 ID。列表接口取不到时降级手填。
  interface AdminOption {
    id: number;
    username: string;
  }

  const props = withDefaults(
    defineProps<{
      modelValue?: number;
      placeholder?: string;
      // 降级手填时的占位提示（可含「客服管理员 ID」等上下文）。
      failedPlaceholder?: string;
      disabled?: boolean;
      // 首次打开时预取的数量；后续搜索仍按关键词远程取数。
      limit?: number;
    }>(),
    {
      modelValue: 0,
      placeholder: '',
      failedPlaceholder: '客服管理员 ID',
      disabled: false,
      limit: 50,
    }
  );

  const emit = defineEmits<{
    (e: 'update:modelValue', value: number): void;
  }>();

  const options = ref<AdminOption[]>([]);
  const loading = ref(false);
  const failed = ref(false);
  let requestToken = 0;

  const resolvedPlaceholder = computed(
    () => props.placeholder || '搜索并选择客服'
  );

  async function load(keyword: string) {
    requestToken += 1;
    const token = requestToken;
    loading.value = true;
    try {
      const res = await getAdmins({
        page: 1,
        page_size: props.limit,
        status: 'active',
        keyword: keyword || undefined,
      });
      if (token !== requestToken) return;
      options.value = (res.data.data.data || []).map((item) => ({
        id: item.id,
        username: item.username,
      }));
    } catch {
      if (token !== requestToken) return;
      failed.value = true;
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
    if (visible && !failed.value) load('');
  }

  function onUpdate(value: unknown) {
    emit('update:modelValue', typeof value === 'number' ? value : 0);
  }

  onMounted(() => {
    load('');
  });
</script>
