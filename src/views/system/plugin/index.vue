<template>
  <div class="container page-container">
    <a-card class="general-card" :title="$t('menu.system.plugin')">
      <div class="page-toolbar">
        <div class="page-toolbar-left">
          <a-input-search
            v-model="keyword"
            :placeholder="$t('system.plugin.searchPlaceholder')"
            style="width: 260px"
            @search="handleSearch"
          />
          <a-select
            v-model="filterStatus"
            :placeholder="$t('system.plugin.statusFilter')"
            style="width: 140px"
            allow-clear
            @change="handleSearch"
          >
            <a-option value="installed">{{
              $t('system.plugin.status.installed')
            }}</a-option>
            <a-option value="enabled">{{
              $t('system.plugin.status.enabled')
            }}</a-option>
            <a-option value="disabled">{{
              $t('system.plugin.status.disabled')
            }}</a-option>
            <a-option value="error">{{
              $t('system.plugin.status.error')
            }}</a-option>
          </a-select>
        </div>
        <div class="page-toolbar-right">
          <a-button @click="handleRefresh">
            <template #icon><icon-refresh /></template>
            {{ $t('system.plugin.refresh') }}
          </a-button>
          <a-button type="primary" @click="installVisible = true">
            <template #icon><icon-plus /></template>
            {{ $t('system.plugin.install') }}
          </a-button>
        </div>
      </div>

      <a-row :gutter="12" style="margin-bottom: 20px">
        <a-col :span="6">
          <div class="stat-card compact-stat">
            <div class="stat-card-icon stat-total"><icon-apps /></div>
            <div>
              <div class="stat-card-value">{{ pluginStats.total }}</div>
              <div class="stat-card-label">{{
                $t('system.plugin.stats.total')
              }}</div>
            </div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card compact-stat">
            <div class="stat-card-icon stat-enabled">
              <icon-check-circle />
            </div>
            <div>
              <div class="stat-card-value">{{ pluginStats.enabled }}</div>
              <div class="stat-card-label">{{
                $t('system.plugin.stats.enabled')
              }}</div>
            </div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card compact-stat">
            <div class="stat-card-icon stat-inactive"><icon-stop /></div>
            <div>
              <div class="stat-card-value">{{ pluginStats.inactive }}</div>
              <div class="stat-card-label">{{
                $t('system.plugin.stats.inactive')
              }}</div>
            </div>
          </div>
        </a-col>
        <a-col :span="6">
          <div class="stat-card compact-stat">
            <div class="stat-card-icon stat-error">
              <icon-exclamation-circle />
            </div>
            <div>
              <div class="stat-card-value">{{ pluginStats.error }}</div>
              <div class="stat-card-label">{{
                $t('system.plugin.stats.error')
              }}</div>
            </div>
          </div>
        </a-col>
      </a-row>

      <a-table
        :data="tableData"
        :loading="loading"
        :pagination="pagination"
        row-key="plugin_id"
        @page-change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      >
        <template #columns>
          <a-table-column
            :title="$t('system.plugin.columns.plugin')"
            data-index="name"
            :width="260"
          >
            <template #cell="{ record }">
              <div class="plugin-info">
                <div class="plugin-name">
                  <icon-code
                    :style="{ color: statusColorValue(record.status) }"
                  />
                  <strong>{{ record.name }}</strong>
                </div>
                <div class="plugin-id">{{ record.plugin_id }}</div>
                <div class="plugin-desc">{{ record.description || '-' }}</div>
              </div>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.plugin.columns.version')"
            data-index="version"
            :width="90"
          />
          <a-table-column
            :title="$t('system.plugin.columns.author')"
            data-index="author"
            :width="120"
          />
          <a-table-column
            :title="$t('system.plugin.columns.engine')"
            :width="130"
          >
            <template #cell="{ record }">
              <a-space wrap size="mini">
                <a-tag color="blue">{{
                  getManifest(record)?.engine?.type || '-'
                }}</a-tag>
                <a-tag color="purple">{{
                  getManifest(record)?.engine?.protocol || '-'
                }}</a-tag>
              </a-space>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.plugin.columns.extensionPoints')"
            :width="180"
          >
            <template #cell="{ record }">
              <a-space wrap size="mini">
                <a-tag
                  v-for="point in getLimitedItems(
                    getManifest(record)?.extension_points || []
                  )"
                  :key="point"
                  color="green"
                >
                  {{ point }}
                </a-tag>
                <a-tag
                  v-if="getExtensionPoints(record).length > 2"
                  color="gray"
                >
                  +{{ getExtensionPoints(record).length - 2 }}
                </a-tag>
                <span v-if="getExtensionPoints(record).length === 0">-</span>
              </a-space>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.plugin.columns.permissions')"
            :width="160"
          >
            <template #cell="{ record }">
              <a-space wrap size="mini">
                <a-tag
                  v-for="permission in getLimitedItems(
                    getManifest(record)?.permissions || []
                  )"
                  :key="permission"
                  color="purple"
                >
                  {{ permission }}
                </a-tag>
                <a-tag v-if="getPermissions(record).length > 2" color="gray">
                  +{{ getPermissions(record).length - 2 }}
                </a-tag>
                <span v-if="getPermissions(record).length === 0">-</span>
              </a-space>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.plugin.columns.status')"
            data-index="status"
            :width="95"
            align="center"
          >
            <template #cell="{ record }">
              <a-tag :color="statusColor(record.status)">
                {{ $t(`system.plugin.status.${record.status}`) }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.plugin.columns.installedAt')"
            data-index="installed_at"
            :width="165"
          >
            <template #cell="{ record }">
              {{ formatOptionalDate(record.installed_at) }}
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.plugin.columns.enabledAt')"
            data-index="enabled_at"
            :width="165"
          >
            <template #cell="{ record }">
              {{ formatOptionalDate(record.enabled_at) }}
            </template>
          </a-table-column>
          <a-table-column
            :title="$t('system.plugin.columns.operations')"
            :width="260"
            fixed="right"
          >
            <template #cell="{ record }">
              <a-space>
                <a-button
                  type="text"
                  size="small"
                  @click="handleDetail(record)"
                >
                  <template #icon><icon-eye /></template>
                  {{ $t('system.plugin.action.detail') }}
                </a-button>
                <a-popconfirm
                  v-if="record.status !== 'enabled'"
                  :content="$t('system.plugin.action.enableConfirm')"
                  @ok="handleEnable(record)"
                >
                  <a-button
                    type="text"
                    size="small"
                    :loading="isActionLoading(record.plugin_id, 'enable')"
                  >
                    <template #icon><icon-play-arrow-fill /></template>
                    {{ $t('system.plugin.action.enable') }}
                  </a-button>
                </a-popconfirm>
                <a-popconfirm
                  v-if="record.status === 'enabled'"
                  :content="$t('system.plugin.action.disableConfirm')"
                  @ok="handleDisable(record)"
                >
                  <a-button
                    type="text"
                    size="small"
                    :loading="isActionLoading(record.plugin_id, 'disable')"
                  >
                    <template #icon><icon-stop /></template>
                    {{ $t('system.plugin.action.disable') }}
                  </a-button>
                </a-popconfirm>
                <a-popconfirm
                  :content="$t('system.plugin.action.uninstallConfirm')"
                  @ok="handleUninstall(record)"
                >
                  <a-button
                    type="text"
                    status="danger"
                    size="small"
                    :loading="isActionLoading(record.plugin_id, 'uninstall')"
                  >
                    <template #icon><icon-delete /></template>
                    {{ $t('system.plugin.action.uninstall') }}
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <PluginInstallModal
      v-model:visible="installVisible"
      @success="handleInstallSuccess"
    />
    <PluginDetailDrawer
      v-model:visible="detailVisible"
      :plugin="currentPlugin"
    />
  </div>
</template>

<script lang="ts" setup>
  import { onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import {
    disablePlugin,
    enablePlugin,
    getPluginDetail,
    getPlugins,
    uninstallPlugin,
  } from '@/api/plugin';
  import type {
    PluginManifest,
    PluginResponse,
    PluginStatus,
  } from '@/types/api';
  import { formatDateTime } from '@/utils';
  import PluginDetailDrawer from './components/PluginDetailDrawer.vue';
  import PluginInstallModal from './components/PluginInstallModal.vue';

  type PluginAction = 'enable' | 'disable' | 'uninstall';
  type PluginRecord = PluginResponse & {
    plugin_id: string;
    manifest?: PluginManifest;
  };
  type PluginListPayload =
    | PluginResponse[]
    | {
        data?: PluginResponse[];
        items?: PluginResponse[];
        total?: number;
      };

  const { t } = useI18n();

  const keyword = ref('');
  const filterStatus = ref<PluginStatus | undefined>(undefined);
  const loading = ref(false);
  const tableData = ref<PluginRecord[]>([]);
  const currentPage = ref(1);
  const pageSize = ref(10);
  const installVisible = ref(false);
  const detailVisible = ref(false);
  const currentPlugin = ref<PluginRecord | undefined>(undefined);
  const actionLoading = reactive<Record<string, boolean>>({});
  const pluginStats = reactive({
    total: 0,
    enabled: 0,
    inactive: 0,
    error: 0,
  });

  const pagination = reactive({
    current: 1,
    pageSize: 10,
    total: 0,
    showTotal: true,
    showPageSize: true,
  });

  const statusColorMap: Record<PluginStatus, string> = {
    installed: 'blue',
    enabled: 'green',
    disabled: 'gray',
    error: 'red',
  };

  const statusValueMap: Record<PluginStatus, string> = {
    installed: 'var(--primary-500)',
    enabled: 'var(--success)',
    disabled: '#64748b',
    error: 'var(--danger)',
  };

  const parseManifest = (
    record: PluginResponse
  ): PluginManifest | undefined => {
    if (record.manifest) return record.manifest;
    if (!record.manifest_json) return undefined;
    if (typeof record.manifest_json === 'string') {
      try {
        return JSON.parse(record.manifest_json) as PluginManifest;
      } catch {
        return undefined;
      }
    }
    return record.manifest_json;
  };

  const normalizePlugin = (record: PluginResponse): PluginRecord => ({
    ...record,
    plugin_id: record.plugin_id || String(record.id || ''),
    manifest: parseManifest(record),
  });

  const getPluginPayload = (payload?: PluginListPayload) => {
    if (Array.isArray(payload)) {
      return {
        list: payload,
        total: payload.length,
      };
    }

    const list = payload?.data || payload?.items || [];
    return {
      list,
      total: payload?.total ?? list.length,
    };
  };

  const getManifest = (record: PluginRecord): PluginManifest | undefined =>
    record.manifest;

  const getLimitedItems = (items: string[]) => items.slice(0, 2);

  const getExtensionPoints = (record: PluginRecord) =>
    getManifest(record)?.extension_points || [];

  const getPermissions = (record: PluginRecord) =>
    getManifest(record)?.permissions || [];

  const statusColor = (status: PluginStatus) => statusColorMap[status];

  const statusColorValue = (status: PluginStatus) => statusValueMap[status];

  const formatOptionalDate = (value?: string) =>
    value ? formatDateTime(value) : '-';

  const updateStats = (list: PluginRecord[], total: number) => {
    pluginStats.total = total;
    pluginStats.enabled = list.filter(
      (item) => item.status === 'enabled'
    ).length;
    pluginStats.inactive = list.filter((item) =>
      ['installed', 'disabled'].includes(item.status)
    ).length;
    pluginStats.error = list.filter((item) => item.status === 'error').length;
  };

  const fetchStats = async () => {
    try {
      const pageSizeForStats = 100;
      const firstPage = await getPlugins({
        page: 1,
        page_size: pageSizeForStats,
      });
      const firstPayload = getPluginPayload(firstPage.data.data);
      const { total } = firstPayload;
      const allPlugins = firstPayload.list.map(normalizePlugin);
      const pageCount = Math.ceil(total / pageSizeForStats);
      const remainingPages = Array.from(
        { length: Math.max(pageCount - 1, 0) },
        (_, index) => index + 2
      );
      const remainingResponses = await Promise.all(
        remainingPages.map((page) =>
          getPlugins({
            page,
            page_size: pageSizeForStats,
          })
        )
      );

      remainingResponses.forEach(({ data }) => {
        const payload = getPluginPayload(data.data);
        allPlugins.push(...payload.list.map(normalizePlugin));
      });

      updateStats(allPlugins, total || allPlugins.length);
    } catch {
      // 错误已在拦截器中统一处理
    }
  };

  const fetchData = async () => {
    loading.value = true;
    try {
      const { data } = await getPlugins({
        page: currentPage.value,
        page_size: pageSize.value,
        keyword: keyword.value || undefined,
        status: filterStatus.value,
      });
      const payload = getPluginPayload(data.data);
      tableData.value = payload.list.map(normalizePlugin);
      pagination.total = payload.total;
      pagination.current = currentPage.value;
      pagination.pageSize = pageSize.value;
    } catch {
      // 错误已在拦截器中统一处理
    } finally {
      loading.value = false;
    }
  };

  const handleRefresh = async () => {
    await Promise.all([fetchData(), fetchStats()]);
  };

  const handleSearch = () => {
    currentPage.value = 1;
    fetchData();
  };

  const handlePageChange = (page: number) => {
    currentPage.value = page;
    fetchData();
  };

  const handlePageSizeChange = (size: number) => {
    pageSize.value = size;
    currentPage.value = 1;
    fetchData();
  };

  const getActionKey = (pluginId: string, action: PluginAction) =>
    `${pluginId}:${action}`;

  const isActionLoading = (pluginId: string, action: PluginAction) =>
    actionLoading[getActionKey(pluginId, action)];

  const setActionLoading = (
    pluginId: string,
    action: PluginAction,
    value: boolean
  ) => {
    actionLoading[getActionKey(pluginId, action)] = value;
  };

  const handleDetail = async (record: PluginRecord) => {
    currentPlugin.value = record;
    detailVisible.value = true;
    try {
      const { data } = await getPluginDetail(record.plugin_id);
      currentPlugin.value = normalizePlugin(data.data);
    } catch {
      // 详情接口失败时仍展示列表已有信息
    }
  };

  const handleEnable = async (record: PluginRecord) => {
    setActionLoading(record.plugin_id, 'enable', true);
    try {
      await enablePlugin(record.plugin_id);
      Message.success(t('system.plugin.message.enableSuccess'));
      await handleRefresh();
    } catch {
      // 错误已在拦截器中统一处理
    } finally {
      setActionLoading(record.plugin_id, 'enable', false);
    }
  };

  const handleDisable = async (record: PluginRecord) => {
    setActionLoading(record.plugin_id, 'disable', true);
    try {
      await disablePlugin(record.plugin_id);
      Message.success(t('system.plugin.message.disableSuccess'));
      await handleRefresh();
    } catch {
      // 错误已在拦截器中统一处理
    } finally {
      setActionLoading(record.plugin_id, 'disable', false);
    }
  };

  const handleUninstall = async (record: PluginRecord) => {
    setActionLoading(record.plugin_id, 'uninstall', true);
    try {
      await uninstallPlugin(record.plugin_id);
      Message.success(t('system.plugin.message.uninstallSuccess'));
      await handleRefresh();
    } catch {
      // 错误已在拦截器中统一处理
    } finally {
      setActionLoading(record.plugin_id, 'uninstall', false);
    }
  };

  const handleInstallSuccess = () => {
    currentPage.value = 1;
    handleRefresh();
  };

  onMounted(() => {
    handleRefresh();
  });
</script>

<script lang="ts">
  export default {
    name: 'SystemPlugin',
  };
</script>

<style scoped lang="less">
  .compact-stat {
    padding: 10px 16px;

    .stat-card-icon {
      width: 32px;
      height: 32px;
      font-size: 16px;
    }

    .stat-card-value {
      font-size: 16px;
    }
  }

  .stat-total {
    color: #2563eb;
    background: linear-gradient(135deg, #dbeafe, #eff6ff);
  }

  .stat-enabled {
    color: #10b981;
    background: linear-gradient(135deg, #d1fae5, #ecfdf5);
  }

  .stat-inactive {
    color: #f59e0b;
    background: linear-gradient(135deg, #fef3c7, #fffbeb);
  }

  .stat-error {
    color: #ef4444;
    background: linear-gradient(135deg, #fee2e2, #fef2f2);
  }

  .plugin-info {
    min-width: 0;
  }

  .plugin-name {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .plugin-id {
    margin-top: 4px;
    font-size: 12px;
    color: var(--primary-600);
  }

  .plugin-desc {
    margin-top: 4px;
    overflow: hidden;
    font-size: 12px;
    color: rgb(var(--gray-5));
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
