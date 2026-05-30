<template>
  <div class="container">
    <a-card class="general-card" :title="$t('message.center.title')">
      <!-- 顶部工具条：跳转 / 全部已读 / 清空 -->
      <template #extra>
        <a-space>
          <a-button @click="goPreference">
            <template #icon><icon-settings /></template>
            {{ $t('message.center.preference') }}
          </a-button>
          <a-button @click="handleAllRead">
            <template #icon><icon-check-circle /></template>
            {{ $t('message.center.allRead') }}
          </a-button>
          <a-popconfirm
            :content="$t('message.center.confirm.clear')"
            type="warning"
            @ok="handleClear"
          >
            <a-button status="danger">
              <template #icon><icon-delete /></template>
              {{ $t('message.center.clear') }}
            </a-button>
          </a-popconfirm>
        </a-space>
      </template>

      <!-- Tab 切换 -->
      <a-tabs
        v-model:active-key="activeTab"
        type="rounded"
        @change="handleTabChange"
      >
        <a-tab-pane key="all" :title="tabTitle('all')" />
        <a-tab-pane key="system" :title="tabTitle('system')" />
        <a-tab-pane key="business" :title="tabTitle('business')" />
        <a-tab-pane key="task" :title="tabTitle('task')" />
      </a-tabs>

      <!-- 筛选栏 -->
      <a-row style="margin-bottom: 16px">
        <a-col :span="24">
          <a-space wrap>
            <a-input
              v-model="searchForm.keyword"
              :placeholder="$t('message.center.search.keyword.placeholder')"
              style="width: 200px"
              allow-clear
            >
              <template #prefix><icon-search /></template>
            </a-input>
            <a-select
              v-model="searchForm.level"
              :placeholder="$t('message.center.search.level.placeholder')"
              style="width: 130px"
              allow-clear
            >
              <a-option value="info">{{
                $t('message.center.level.info')
              }}</a-option>
              <a-option value="warning">{{
                $t('message.center.level.warning')
              }}</a-option>
              <a-option value="error">{{
                $t('message.center.level.error')
              }}</a-option>
            </a-select>
            <a-select
              v-model="searchForm.read_status"
              :placeholder="$t('message.center.search.readStatus.placeholder')"
              style="width: 130px"
              allow-clear
            >
              <a-option :value="0">{{
                $t('message.center.readStatus.unread')
              }}</a-option>
              <a-option :value="1">{{
                $t('message.center.readStatus.read')
              }}</a-option>
            </a-select>
            <a-range-picker
              v-model="timeRange"
              style="width: 300px"
              show-time
            />
            <a-button type="primary" @click="handleSearch">
              <template #icon><icon-search /></template>
              {{ $t('message.center.search.submit') }}
            </a-button>
            <a-button @click="handleReset">
              <template #icon><icon-refresh /></template>
              {{ $t('message.center.search.reset') }}
            </a-button>
          </a-space>
        </a-col>
      </a-row>

      <!-- 批量操作条 -->
      <a-row style="margin-bottom: 12px">
        <a-col :span="24">
          <a-space>
            <a-button :disabled="!selectedKeys.length" @click="handleBatchRead">
              {{ $t('message.center.batch.markRead') }}
            </a-button>
            <a-button
              :disabled="!selectedKeys.length"
              @click="handleBatchUnread"
            >
              {{ $t('message.center.batch.markUnread') }}
            </a-button>
            <a-popconfirm
              :content="$t('message.center.confirm.deleteBatch')"
              type="warning"
              @ok="handleBatchDelete"
            >
              <a-button :disabled="!selectedKeys.length" status="danger">
                {{ $t('message.center.batch.delete') }}
              </a-button>
            </a-popconfirm>
            <span v-if="selectedKeys.length" class="select-tip">
              已选 {{ selectedKeys.length }} 项
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
        row-key="id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column title="ID" data-index="id" :width="80" />
          <a-table-column
            :title="$t('message.center.column.title')"
            data-index="title"
            :ellipsis="true"
            :tooltip="true"
          >
            <template #cell="{ record }">
              <a-link @click="openDetail(record)">
                <span :class="{ unread: !record.read_at }">
                  {{ record.title }}
                </span>
              </a-link>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('message.center.column.content')"
            data-index="content"
            :ellipsis="true"
            :tooltip="true"
          />
          <a-table-column
            :title="$t('message.center.column.type')"
            data-index="type"
            :width="100"
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
            :width="90"
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
            :title="$t('message.center.column.status')"
            data-index="read_at"
            :width="90"
          >
            <template #cell="{ record }">
              <a-badge
                v-if="!record.read_at"
                status="processing"
                :text="$t('message.center.readStatus.unread')"
              />
              <a-badge
                v-else
                status="success"
                :text="$t('message.center.readStatus.read')"
              />
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
            :width="220"
            fixed="right"
          >
            <template #cell="{ record }">
              <a-space>
                <a-link @click="openDetail(record)">
                  {{ $t('message.center.op.view') }}
                </a-link>
                <a-link v-if="!record.read_at" @click="markOne(record)">
                  {{ $t('message.center.op.read') }}
                </a-link>
                <a-link v-else @click="unmarkOne(record)">
                  {{ $t('message.center.op.unread') }}
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
      :width="520"
      unmount-on-close
    >
      <a-spin :loading="detailLoading" style="width: 100%">
        <a-descriptions
          v-if="detailRecord"
          :column="1"
          :data="detailDescriptions"
          bordered
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
        <a-button @click="detailVisible = false">
          {{ $t('message.detail.close') }}
        </a-button>
      </template>
    </a-drawer>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useRouter } from 'vue-router';
  import { Message } from '@arco-design/web-vue';
  import { storeToRefs } from 'pinia';
  import { useMessageStore } from '@/store';
  import {
    MessageRecord,
    MessageBizType,
    MessageLevel,
    MessageListParams,
  } from '@/api/message';

  const { t } = useI18n();
  const router = useRouter();
  const messageStore = useMessageStore();
  const { list, loading, total, page, pageSize, unread } =
    storeToRefs(messageStore);

  // 当前 Tab：'all' 或 具体业务类型
  const activeTab = ref<'all' | MessageBizType>('all');

  // 搜索表单（不含 type / 时间范围，单独处理）
  const searchForm = reactive<{
    keyword: string;
    level?: MessageLevel;
    read_status?: 0 | 1;
  }>({
    keyword: '',
    level: undefined,
    read_status: undefined,
  });

  // 时间范围（Arco range-picker 输出 [string, string]）
  const timeRange = ref<string[]>([]);

  // 选中行
  const selectedKeys = ref<number[]>([]);
  const rowSelection = {
    type: 'checkbox' as const,
    showCheckedAll: true,
  };

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
    return t('message.center.tab.task');
  };

  // Tab 标题（带未读数）
  const tabTitle = (key: 'all' | MessageBizType) => {
    if (key === 'all') {
      const n = unread.value.total;
      return n
        ? `${t('message.center.tab.all')} (${n})`
        : t('message.center.tab.all');
    }
    const map = {
      system: unread.value.system,
      business: unread.value.business,
      task: unread.value.task,
    };
    const label = t(`message.center.tab.${key}`);
    return map[key] ? `${label} (${map[key]})` : label;
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

  // 组装查询参数
  const buildParams = (extra: Partial<MessageListParams> = {}) => {
    const params: MessageListParams & { pageSize?: number } = {
      page: extra.page ?? 1,
      page_size: extra.page_size ?? pageSize.value,
      keyword: searchForm.keyword || undefined,
      level: searchForm.level,
      read_status: searchForm.read_status,
      sort: 'created_at_desc',
    };
    if (activeTab.value !== 'all') {
      params.type = activeTab.value;
    }
    if (timeRange.value && timeRange.value.length === 2) {
      params.start_time = new Date(timeRange.value[0]).toISOString();
      params.end_time = new Date(timeRange.value[1]).toISOString();
    }
    return params;
  };

  // 加载列表
  const loadList = async (extra: Partial<MessageListParams> = {}) => {
    await messageStore.fetchList(buildParams(extra));
  };

  // Tab 切换
  const handleTabChange = () => {
    selectedKeys.value = [];
    loadList({ page: 1 });
  };

  // 搜索
  const handleSearch = () => {
    selectedKeys.value = [];
    loadList({ page: 1 });
  };

  // 重置
  const handleReset = () => {
    searchForm.keyword = '';
    searchForm.level = undefined;
    searchForm.read_status = undefined;
    timeRange.value = [];
    selectedKeys.value = [];
    loadList({ page: 1 });
  };

  // 分页变化
  const handlePageChange = (p: number) => {
    loadList({ page: p, page_size: pageSize.value });
  };
  const handlePageSizeChange = (size: number) => {
    loadList({ page: 1, page_size: size });
  };

  // 批量已读
  const handleBatchRead = async () => {
    if (!selectedKeys.value.length) {
      Message.warning(t('message.center.tip.selectFirst'));
      return;
    }
    await messageStore.markRead([...selectedKeys.value]);
    Message.success(t('message.center.tip.opSuccess'));
    selectedKeys.value = [];
    messageStore.fetchUnreadCount();
  };

  // 批量未读
  const handleBatchUnread = async () => {
    if (!selectedKeys.value.length) {
      Message.warning(t('message.center.tip.selectFirst'));
      return;
    }
    await messageStore.markUnread([...selectedKeys.value]);
    Message.success(t('message.center.tip.opSuccess'));
    selectedKeys.value = [];
    messageStore.fetchUnreadCount();
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (!selectedKeys.value.length) {
      Message.warning(t('message.center.tip.selectFirst'));
      return;
    }
    await messageStore.removeBatch([...selectedKeys.value]);
    Message.success(t('message.center.tip.deleteSuccess'));
    selectedKeys.value = [];
  };

  // 全部已读
  const handleAllRead = async () => {
    await messageStore.markAllRead();
    Message.success(t('message.center.tip.opSuccess'));
  };

  // 清空（按当前 tab 类型清空已读消息，避免误删）
  const handleClear = async () => {
    const params: { type?: MessageBizType; read_status?: 0 | 1 } = {
      read_status: 1,
    };
    if (activeTab.value !== 'all') {
      params.type = activeTab.value;
    }
    const deleted = await messageStore.clear(params);
    Message.success(t('message.center.tip.clearSuccess', { count: deleted }));
  };

  // 单条已读 / 未读 / 删除
  const markOne = async (record: MessageRecord) => {
    await messageStore.markRead([record.id]);
    Message.success(t('message.center.tip.opSuccess'));
    messageStore.fetchUnreadCount();
  };
  const unmarkOne = async (record: MessageRecord) => {
    await messageStore.markUnread([record.id]);
    Message.success(t('message.center.tip.opSuccess'));
    messageStore.fetchUnreadCount();
  };
  const removeOne = async (record: MessageRecord) => {
    await messageStore.remove(record.id);
    Message.success(t('message.center.tip.deleteSuccess'));
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
      const full = await messageStore.fetchDetail(record.id);
      if (full) detailRecord.value = full;
      // 打开详情顺便标记已读
      if (!record.read_at) {
        await messageStore.markRead([record.id]);
        messageStore.fetchUnreadCount();
      }
    } finally {
      detailLoading.value = false;
    }
  };

  // 详情描述项
  const detailDescriptions = computed(() => {
    const r = detailRecord.value;
    if (!r) return [];
    return [
      { label: t('message.detail.subject'), value: r.title },
      { label: t('message.detail.type'), value: typeLabel(r.type) },
      { label: t('message.detail.level'), value: r.level || 'info' },
      { label: t('message.detail.createdAt'), value: formatTime(r.created_at) },
      { label: t('message.detail.readAt'), value: formatTime(r.read_at) },
    ];
  });

  // 跳转偏好页
  const goPreference = () => {
    router.push({ name: 'MessagePreference' });
  };

  onMounted(() => {
    loadList({ page: 1 });
    messageStore.fetchUnreadCount();
  });
</script>

<style scoped lang="less">
  .container {
    padding: 16px 20px;
  }

  .unread {
    font-weight: 600;
    color: rgb(var(--primary-6));
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
</style>
