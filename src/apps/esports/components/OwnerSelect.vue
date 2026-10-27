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
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { listCustomers, listPlayers } from '../api';

  // 归属人搜索选择：客户余额归属客户、陪玩猫粮归属陪玩。
  // 输入即远程按关键词查询，避免一次拉全量后在本地过滤找不到老客户。
  interface OwnerOption {
    id: number;
    name: string;
  }

  type OwnerType = 'customer' | 'player';

  const props = withDefaults(
    defineProps<{
      modelValue?: number;
      ownerType: OwnerType;
      placeholder?: string;
      disabled?: boolean;
      // 首次打开时预取的数量；后续搜索仍按关键词远程取数。
      limit?: number;
      // 已知归属人的显示名（如从行数据带入）；避免回显成数字 ID。
      initialLabel?: string;
    }>(),
    {
      modelValue: 0,
      placeholder: '',
      disabled: false,
      limit: 50,
      initialLabel: '',
    }
  );

  const emit = defineEmits<{
    (e: 'update:modelValue', value: number): void;
    (e: 'select', option: OwnerOption | null): void;
  }>();

  const options = ref<OwnerOption[]>([]);
  const loading = ref(false);
  const selected = ref<OwnerOption | null>(null);
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let requestToken = 0;
  let errorShown = false;

  const resolvedPlaceholder = computed(
    () =>
      props.placeholder ||
      (props.ownerType === 'player' ? '搜索陪玩昵称' : '搜索客户姓名或手机号')
  );

  async function load(keyword = '') {
    requestToken += 1;
    const token = requestToken;
    loading.value = true;
    try {
      let rows: OwnerOption[];
      if (props.ownerType === 'player') {
        const result = await listPlayers(keyword);
        rows = (result.data.data || []).map((item) => ({
          id: item.id,
          name: item.display_name,
        }));
      } else {
        const result = await listCustomers({
          keyword: keyword || undefined,
          limit: props.limit,
        });
        const { data } = result.data;
        const customers = Array.isArray(data) ? data : data?.items || [];
        rows = customers.map((item) => ({
          id: item.id,
          name: item.display_name,
        }));
      }
      if (token !== requestToken) return;
      // 选中项不在本次搜索结果里时仍保留，避免下拉回显变成数字 ID。
      const current = selected.value;
      if (current && !rows.some((item) => item.id === current.id)) {
        rows.unshift(current);
      }
      options.value = rows;
      errorShown = false;
    } catch {
      if (token !== requestToken) return;
      if (!errorShown) {
        errorShown = true;
        Message.error('加载归属人列表失败，请稍后重试');
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
    () => props.ownerType,
    () => {
      selected.value = null;
      options.value = [];
      load('');
    }
  );

  watch(
    () => props.modelValue,
    (value) => {
      if (!value) {
        selected.value = null;
        return;
      }
      const option = options.value.find((item) => item.id === value) || null;
      if (option) {
        selected.value = option;
      } else if (props.initialLabel) {
        // 选项还没加载到该 ID 时先用外部传入的名称占位，加载后按 option 覆盖。
        selected.value = { id: value, name: props.initialLabel };
      }
    }
  );

  onMounted(() => load(''));

  onBeforeUnmount(() => {
    if (searchTimer) clearTimeout(searchTimer);
  });
</script>
