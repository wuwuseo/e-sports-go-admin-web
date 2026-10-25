<template>
  <div class="container page-container">
    <a-card class="general-card" title="上线自检">
      <div class="hint">
        逐项检查上线所需配置。「未配置」表示该能力目前只是代码闭环、实际不可用；
        标「降级」的项不影响交易主链路，但对应能力会走人工或缺失。
      </div>
      <div class="readiness-banner">
        <a-tag :color="!readiness ? 'gray' : readiness.ready ? 'green' : 'red'">
          {{
            !readiness
              ? '未检查'
              : readiness.ready
              ? '满足上线最低条件'
              : `存在 ${readiness.blockers} 个阻断项`
          }}
        </a-tag>
        <span v-if="readiness" class="muted">
          降级 {{ readiness.degraded }} 项 ·
          {{ new Date(readiness.generated_at).toLocaleString() }}
        </span>
        <a-button size="mini" :loading="readinessLoading" @click="loadReadiness"
          >重新检查</a-button
        >
      </div>
      <a-table
        :data="readiness?.checks || []"
        :loading="readinessLoading"
        row-key="key"
        :pagination="false"
        size="small"
      >
        <template #columns>
          <a-table-column title="检查项" :width="190">
            <template #cell="{ record }">{{ record.name }}</template>
          </a-table-column>
          <a-table-column title="状态" :width="90">
            <template #cell="{ record }">
              <a-tag :color="readinessColor(record.status)">{{
                readinessText(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="说明">
            <template #cell="{ record }">{{ record.detail }}</template>
          </a-table-column>
          <a-table-column title="下一步" :width="280">
            <template #cell="{ record }">{{ record.action || '—' }}</template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { fetchReadiness } from '../../api';
  import type { ReadinessReport } from '../../api';

  const readiness = ref<ReadinessReport | null>(null);
  const readinessLoading = ref(false);
  const readinessText = (status: string) =>
    ({ ready: '可用', degraded: '降级', missing: '未配置' }[status] || status);
  const readinessColor = (status: string) =>
    ({ ready: 'green', degraded: 'orange', missing: 'red' }[status] || 'gray');

  async function loadReadiness() {
    readinessLoading.value = true;
    try {
      readiness.value = (await fetchReadiness()).data.data || null;
    } catch {
      // 自检失败不打扰操作，保留上一次结果并提示手工重试。
      Message.warning('上线自检加载失败，可稍后点「重新检查」');
    } finally {
      readinessLoading.value = false;
    }
  }

  onMounted(loadReadiness);
</script>

<style scoped>
  .hint {
    margin-bottom: 12px;
  }

  .readiness-banner {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
  }

  .muted {
    color: var(--color-text-3);
    font-size: 12px;
  }
</style>
