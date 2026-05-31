<template>
  <div class="container">
    <a-card class="general-card" :title="$t('message.manage.title')">
      <!-- 顶部操作 -->
      <template #extra>
        <a-space>
          <a-button type="primary" @click="goBroadcast">
            <template #icon><icon-plus /></template>
            {{ $t('message.manage.toBroadcast') }}
          </a-button>
          <a-button @click="loadList()">
            <template #icon><icon-refresh /></template>
            {{ $t('message.manage.refresh') }}
          </a-button>
        </a-space>
      </template>

      <!-- 筛选栏 -->
      <a-form
        :model="searchForm"
        layout="inline"
        class="search-form"
        @submit.prevent="handleSearch"
      >
        <a-form-item :label="$t('message.manage.filter.keyword')">
          <a-input
            v-model="searchForm.keyword"
            :placeholder="$t('message.center.search.keyword.placeholder')"
            style="width: 220px"
            allow-clear
            @press-enter="handleSearch"
          >
            <template #prefix><icon-search /></template>
          </a-input>
        </a-form-item>
        <a-form-item :label="$t('message.manage.filter.type')">
          <a-select
            v-model="searchForm.type"
            :placeholder="$t('message.manage.filter.type.placeholder')"
            style="width: 140px"
            allow-clear
          >
            <a-option value="system">
              {{ $t('message.center.tab.system') }}
            </a-option>
            <a-option value="business">
              {{ $t('message.center.tab.business') }}
            </a-option>
            <a-option value="task">
              {{ $t('message.center.tab.task') }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="$t('message.manage.filter.level')">
          <a-select
            v-model="searchForm.level"
            :placeholder="$t('message.center.search.level.placeholder')"
            style="width: 130px"
            allow-clear
          >
            <a-option value="info">
              {{ $t('message.center.level.info') }}
            </a-option>
            <a-option value="warning">
              {{ $t('message.center.level.warning') }}
            </a-option>
            <a-option value="error">
              {{ $t('message.center.level.error') }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="$t('message.manage.filter.status')">
          <a-select
            v-model="searchForm.read_status"
            :placeholder="$t('message.manage.filter.status.placeholder')"
            style="width: 130px"
            allow-clear
          >
            <a-option :value="0">
              {{ $t('message.manage.status.published') }}
            </a-option>
            <a-option :value="1">
              {{ $t('message.manage.status.read') }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="$t('message.manage.filter.time')">
          <a-range-picker v-model="timeRange" style="width: 320px" show-time />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" html-type="submit">
              <template #icon><icon-search /></template>
              {{ $t('message.center.search.submit') }}
            </a-button>
            <a-button @click="handleReset">
              <template #icon><icon-refresh /></template>
              {{ $t('message.center.search.reset') }}
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <a-divider style="margin: 12px 0 16px" />

      <!-- 批量操作条 -->
      <a-row class="batch-bar">
        <a-col :span="24">
          <a-space wrap>
            <a-popconfirm
              :content="$t('message.center.confirm.deleteBatch')"
              type="warning"
              @ok="handleBatchDelete"
            >
              <a-button :disabled="!selectedKeys.length" status="danger">
                <template #icon><icon-delete /></template>
                {{ $t('message.manage.batch.delete') }}
              </a-button>
            </a-popconfirm>
            <a-popconfirm
              :content="$t('message.manage.confirm.clearExpired')"
              type="warning"
              @ok="handleClearRead"
            >
              <a-button>
                <template #icon><icon-eraser /></template>
                {{ $t('message.manage.clearExpired') }}
              </a-button>
            </a-popconfirm>
            <span v-if="selectedKeys.length" class="select-tip">
              {{ $t('message.manage.selectedTip', { n: selectedKeys.length }) }}
            </span>
          </a-space>
        </a-col>
      </a-row>

      <!-- 表格 -->
      <a-table
        v-model:selected-keys="selectedKeys"
        :data="list"
        :loading="loading"
        :pagination="pagination"
        :row-selection="rowSelection"
        :scroll="{ x: 1200 }"
        row-key="id"
        size="medium"
        stripe
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column title="ID" data-index="id" :width="80" fixed="left" />
          <a-table-column
            :title="$t('message.center.column.title')"
            data-index="title"
            :ellipsis="true"
            :tooltip="true"
            :min-width="200"
          >
            <template #cell="{ record }">
              <a-link @click="openDetail(record)">
                {{ record.title }}
              </a-link>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('message.center.column.content')"
            data-index="content"
            :ellipsis="true"
            :tooltip="true"
            :min-width="240"
          />
          <a-table-column
            :title="$t('message.center.column.type')"
            data-index="type"
            :width="110"
          >
            <template #cell="{ record }">
              <a-tag :color="typeColor(record.type)">
                {{ typeLabel(record.type) }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('message.center.column.level')"
            data-index="level"
            :width="100"
          >
            <template #cell="{ record }">
              <a-tag v-if="record.level === 'error'" color="red">
                {{ $t('message.center.level.error') }}
              </a-tag>
              <a-tag v-else-if="record.level === 'warning'" color="orange">
                {{ $t('message.center.level.warning') }}
              </a-tag>
              <a-tag v-else color="blue">
                {{ $t('message.center.level.info') }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('message.manage.column.status')"
            data-index="read_at"
            :width="110"
          >
            <template #cell="{ record }">
              <a-badge
                v-if="!record.read_at"
                status="processing"
                :text="$t('message.manage.status.published')"
              />
              <a-badge
                v-else
                status="success"
                :text="$t('message.manage.status.read')"
              />
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('message.manage.column.receiver')"
            data-index="user_uid"
            :width="160"
            :ellipsis="true"
            :tooltip="true"
          >
            <template #cell="{ record }">
              <span>{{ record.user_uid || '-' }}</span>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('message.center.column.createdAt')"
            data-index="created_at"
            :width="170"
          >
            <template #cell="{ record }">
              {{ formatTime(record.created_at) }}
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('message.center.column.operations')"
            :width="180"
            fixed="right"
          >
            <template #cell="{ record }">
              <a-space>
                <a-link @click="openDetail(record)">
                  {{ $t('message.center.op.view') }}
                </a-link>
                <a-popconfirm
                  :content="$t('message.center.confirm.delete')"
                  type="warning"
                  @ok="removeOne(record)"
                >
                  <a-link status="danger">
                    {{ $t('message.center.op.delete') }}
                  </a-link>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <!-- 详情抽屉 -->
    <a-drawer
      v-model:visible="detailVisible"
      :title="$t('message.detail.title')"
      :width="detailDrawerWidth"
      unmount-on-close
    >
      <a-spin :loading="detailLoading" style="width: 100%">
        <a-descriptions
          v-if="detailRecord"
          :column="1"
          :data="detailDescriptions"
          bordered
          size="medium"
        />
        <div v-if="detailRecord" class="detail-content">
          <div class="detail-label">{{ $t('message.detail.content') }}</div>
          <!-- eslint-disable vue/no-v-html -->
          <div
            v-if="detailRecord.content_html"
            class="detail-html"
            v-html="detailRecord.content_html"
          ></div>
          <!-- eslint-enable vue/no-v-html -->
          <div v-else class="detail-text">{{ detailRecord.content }}</div>
        </div>
      </a-spin>
      <template #footer>
        <a-space>
          <a-popconfirm
            v-if="detailRecord"
            :content="$t('message.center.confirm.delete')"
            type="warning"
            @ok="removeFromDetail"
          >
            <a-button status="danger">
              {{ $t('message.center.op.delete') }}
            </a-button>
          </a-popconfirm>
          <a-button @click="detailVisible = false">
            {{ $t('message.detail.close') }}
          </a-button>
        </a-space>
      </template>
    </a-drawer>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRouter } from 'vue-router';
  import { Message } from '@arco-design/web-vue';
  import {
    clearMessages,
    deleteMessage,
    deleteMessageBatch,
    getMessageDetail,
    MessageBizType,
    MessageLevel,
    MessageListParams,
    MessagePageResp,
    MessageRecord,
    queryMessageList,
  } from '@/api/message';

  const { t } = useI18n();
  const router = useRouter();

  // 列表状态
  const list = ref<MessageRecord[]>([]);
  const loading = ref(false);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(20);

  // 搜索表单
  const searchForm = reactive<{
    keyword: string;
    type?: MessageBizType;
    level?: MessageLevel;
    read_status?: 0 | 1;
  }>({
    keyword: '',
    type: undefined,
    level: undefined,
    read_status: undefined,
  });

  // 时间范围
  const timeRange = ref<string[]>([]);

  // 选中行
  const selectedKeys = ref<number[]>([]);
  const rowSelection = {
    type: 'checkbox' as const,
    showCheckedAll: true,
  };

  // 详情抽屉宽度：响应式
  const detailDrawerWidth = computed(() => {
    if (typeof window === 'undefined') return 560;
    const w = window.innerWidth;
    if (w < 768) return Math.min(w - 32, 360);
    if (w < 1280) return 480;
    return 600;
  });

  // 类型颜色与标签
  const typeColorMap: Record<MessageBizType, string> = {
    system: 'blue',
    business: 'green',
    task: 'orange',
  };

  const isMessageBizType = (type: unknown): type is MessageBizType =>
    type === 'system' || type === 'business' || type === 'task';

  const typeColor = (type: unknown) =>
    isMessageBizType(type) ? typeColorMap[type] : 'gray';

  const typeLabel = (type: unknown) => {
    if (type === 'system') return t('message.center.tab.system');
    if (type === 'business') return t('message.center.tab.business');
    if (type === 'task') return t('message.center.tab.task');
    return '-';
  };

  // 时间格式化
  const formatTime = (iso?: string | null) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // 分页配置
  const pagination = computed(() => ({
    current: page.value,
    pageSize: pageSize.value,
    total: total.value,
    showTotal: true,
    showPageSize: true,
    pageSizeOptions: [10, 20, 50, 100],
  }));

  // 组装查询参数
  const buildParams = (
    extra: Partial<MessageListParams> = {}
  ): MessageListParams => {
    const params: MessageListParams = {
      page: extra.page ?? page.value,
      page_size: extra.page_size ?? pageSize.value,
      keyword: searchForm.keyword.trim() || undefined,
      type: searchForm.type,
      level: searchForm.level,
      read_status: searchForm.read_status,
      sort: 'created_at_desc',
    };
    if (timeRange.value && timeRange.value.length === 2) {
      params.start_time = new Date(timeRange.value[0]).toISOString();
      params.end_time = new Date(timeRange.value[1]).toISOString();
    }
    return params;
  };

  // 加载列表
  const loadList = async (extra: Partial<MessageListParams> = {}) => {
    loading.value = true;
    try {
      const params = buildParams(extra);
      const resp = await queryMessageList(params);
      // 兼容 axios 拦截器可能拆封：data 直接返回 MessagePageResp，或仍包一层
      const raw = resp as unknown as
        | MessagePageResp
        | { data?: MessagePageResp | { data?: MessagePageResp } };
      let payload: MessagePageResp | undefined;
      if (
        (raw as MessagePageResp)?.data &&
        Array.isArray((raw as MessagePageResp).data)
      ) {
        payload = raw as MessagePageResp;
      } else {
        const r1 = (
          raw as { data?: MessagePageResp | { data?: MessagePageResp } }
        )?.data;
        if (r1 && Array.isArray((r1 as MessagePageResp).data)) {
          payload = r1 as MessagePageResp;
        } else if (r1 && (r1 as { data?: MessagePageResp }).data) {
          payload = (r1 as { data?: MessagePageResp }).data;
        }
      }
      list.value = payload?.data ?? [];
      total.value = payload?.total ?? 0;
      page.value = payload?.page ?? params.page ?? 1;
    } catch {
      list.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  };

  // 搜索
  const handleSearch = () => {
    selectedKeys.value = [];
    page.value = 1;
    loadList({ page: 1 });
  };

  // 重置
  const handleReset = () => {
    searchForm.keyword = '';
    searchForm.type = undefined;
    searchForm.level = undefined;
    searchForm.read_status = undefined;
    timeRange.value = [];
    selectedKeys.value = [];
    page.value = 1;
    loadList({ page: 1 });
  };

  // 分页变化
  const handlePageChange = (p: number) => {
    page.value = p;
    loadList({ page: p, page_size: pageSize.value });
  };
  const handlePageSizeChange = (size: number) => {
    pageSize.value = size;
    page.value = 1;
    loadList({ page: 1, page_size: size });
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (!selectedKeys.value.length) {
      Message.warning(t('message.center.tip.selectFirst'));
      return;
    }
    await deleteMessageBatch([...selectedKeys.value]);
    Message.success(t('message.center.tip.deleteSuccess'));
    selectedKeys.value = [];
    loadList();
  };

  // 清空已读（避免误删未投递的消息）
  const handleClearRead = async () => {
    const params: { type?: MessageBizType; read_status?: 0 | 1 } = {
      read_status: 1,
    };
    if (searchForm.type) params.type = searchForm.type;
    const resp = await clearMessages(params);
    const raw = resp as unknown as
      | { deleted?: number }
      | { data?: { deleted?: number } | { data?: { deleted?: number } } };
    let deleted = 0;
    if (typeof (raw as { deleted?: number })?.deleted === 'number') {
      deleted = (raw as { deleted: number }).deleted;
    } else {
      const r1 = (
        raw as { data?: { deleted?: number } | { data?: { deleted?: number } } }
      )?.data;
      if (r1 && typeof (r1 as { deleted?: number }).deleted === 'number') {
        deleted = (r1 as { deleted: number }).deleted;
      } else if (r1 && (r1 as { data?: { deleted?: number } }).data) {
        deleted = (r1 as { data: { deleted?: number } }).data.deleted ?? 0;
      }
    }
    Message.success(t('message.center.tip.clearSuccess', { count: deleted }));
    selectedKeys.value = [];
    loadList();
  };

  // 单条删除
  const removeOne = async (record: MessageRecord) => {
    await deleteMessage(record.id);
    Message.success(t('message.center.tip.deleteSuccess'));
    loadList();
  };

  // 跳转到发送页
  const goBroadcast = () => {
    router.push({ name: 'MessageBroadcast' });
  };

  // 详情
  const detailVisible = ref(false);
  const detailLoading = ref(false);
  const detailRecord = ref<MessageRecord | null>(null);

  const openDetail = async (record: MessageRecord) => {
    detailVisible.value = true;
    detailLoading.value = true;
    detailRecord.value = record;
    try {
      const resp = await getMessageDetail(record.id);
      const raw = resp as unknown as
        | MessageRecord
        | { data?: MessageRecord | { data?: MessageRecord } };
      let full: MessageRecord | undefined;
      if ((raw as MessageRecord)?.id) {
        full = raw as MessageRecord;
      } else {
        const r1 = (raw as { data?: MessageRecord | { data?: MessageRecord } })
          ?.data;
        if (r1 && (r1 as MessageRecord).id) {
          full = r1 as MessageRecord;
        } else if (r1 && (r1 as { data?: MessageRecord }).data) {
          full = (r1 as { data: MessageRecord }).data;
        }
      }
      if (full) detailRecord.value = full;
    } finally {
      detailLoading.value = false;
    }
  };

  // 详情中删除
  const removeFromDetail = async () => {
    if (!detailRecord.value) return;
    await deleteMessage(detailRecord.value.id);
    Message.success(t('message.center.tip.deleteSuccess'));
    detailVisible.value = false;
    loadList();
  };

  // 详情描述项
  const detailDescriptions = computed(() => {
    const r = detailRecord.value;
    if (!r) return [];
    return [
      { label: t('message.detail.subject'), value: r.title },
      { label: t('message.detail.type'), value: typeLabel(r.type) },
      { label: t('message.detail.level'), value: r.level || 'info' },
      { label: t('message.manage.column.receiver'), value: r.user_uid || '-' },
      {
        label: t('message.manage.column.status'),
        value: r.read_at
          ? t('message.manage.status.read')
          : t('message.manage.status.published'),
      },
      { label: t('message.detail.createdAt'), value: formatTime(r.created_at) },
      { label: t('message.detail.readAt'), value: formatTime(r.read_at) },
    ];
  });

  onMounted(() => {
    loadList({ page: 1 });
  });
</script>

<style scoped lang="less">
  .container {
    padding: 16px 20px;
  }

  .search-form {
    :deep(.arco-form-item) {
      margin-bottom: 12px;
    }
  }

  .batch-bar {
    margin-bottom: 12px;
  }

  .select-tip {
    margin-left: 8px;
    color: rgb(var(--gray-6));
    font-size: 12px;
  }

  .detail-content {
    margin-top: 16px;

    .detail-label {
      margin-bottom: 8px;
      color: rgb(var(--gray-8));
      font-weight: 500;
    }

    .detail-html,
    .detail-text {
      padding: 12px;
      background: var(--color-fill-2);
      border-radius: 4px;
      line-height: 1.7;
      word-break: break-word;
    }
  }

  @media (max-width: 768px) {
    .container {
      padding: 12px;
    }
  }
</style>
