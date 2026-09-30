<template>
  <div class="container page-container">
    <a-card class="general-card" :title="$t('demo.items.title')">
      <template #extra>
        <a-button :loading="loading" @click="loadItems">
          {{ $t('demo.items.refresh') }}
        </a-button>
      </template>
      <a-table :data="items" :loading="loading" row-key="id">
        <template #columns>
          <a-table-column data-index="id" title="ID" />
          <a-table-column data-index="title" :title="$t('demo.items.title')" />
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script lang="ts" setup>
  import { onMounted, ref } from 'vue';
  import { getDemoItems, type DemoItem } from '../api';

  const items = ref<DemoItem[]>([]);
  const loading = ref(false);

  async function loadItems() {
    loading.value = true;
    try {
      const response = await getDemoItems();
      items.value = response.data;
    } finally {
      loading.value = false;
    }
  }

  onMounted(loadItems);
</script>
