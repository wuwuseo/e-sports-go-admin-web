<template>
  <a-drawer
    :visible="visible"
    :title="$t('system.plugin.detail.title')"
    :width="720"
    :footer="false"
    unmount-on-close
    @cancel="handleCancel"
  >
    <template v-if="plugin">
      <a-alert
        v-if="plugin.status === 'error' && plugin.error_message"
        type="error"
        :content="plugin.error_message"
        style="margin-bottom: 16px"
      />

      <a-descriptions
        :title="$t('system.plugin.detail.basic')"
        :column="1"
        bordered
      >
        <a-descriptions-item :label="$t('system.plugin.detail.pluginId')">
          {{ plugin.plugin_id }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.plugin.detail.name')">
          {{ plugin.name }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.plugin.columns.version')">
          {{ plugin.version }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.plugin.columns.author')">
          {{ plugin.author || '-' }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.plugin.columns.status')">
          <a-tag :color="statusColor">{{ statusText }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.plugin.detail.description')">
          {{ plugin.description || '-' }}
        </a-descriptions-item>
      </a-descriptions>

      <a-descriptions
        :title="$t('system.plugin.detail.install')"
        :column="1"
        bordered
        style="margin-top: 20px"
      >
        <a-descriptions-item :label="$t('system.plugin.detail.installPath')">
          <code>{{ plugin.install_path || '-' }}</code>
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.plugin.columns.installedAt')">
          {{ formatOptionalDate(plugin.installed_at) }}
        </a-descriptions-item>
        <a-descriptions-item :label="$t('system.plugin.columns.enabledAt')">
          {{ formatOptionalDate(plugin.enabled_at) }}
        </a-descriptions-item>
      </a-descriptions>

      <a-tabs style="margin-top: 20px">
        <a-tab-pane key="engine" :title="$t('system.plugin.detail.engine')">
          <a-descriptions :column="1" bordered>
            <a-descriptions-item label="type">
              {{ manifest?.engine?.type || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="protocol">
              {{ manifest?.engine?.protocol || '-' }}
            </a-descriptions-item>
            <a-descriptions-item :label="$t('system.plugin.detail.entry')">
              <div class="entry-list">
                <div
                  v-for="[platform, entry] in engineEntries"
                  :key="platform"
                  class="entry-item"
                >
                  <a-tag color="blue">{{ platform }}</a-tag>
                  <code>{{ entry }}</code>
                </div>
                <span v-if="engineEntries.length === 0">-</span>
              </div>
            </a-descriptions-item>
          </a-descriptions>
        </a-tab-pane>

        <a-tab-pane
          key="compatibility"
          :title="$t('system.plugin.detail.compatibility')"
        >
          <a-descriptions :column="1" bordered>
            <a-descriptions-item :label="$t('system.plugin.detail.app')">
              {{ manifest?.compatibility?.app || '-' }}
            </a-descriptions-item>
            <a-descriptions-item :label="$t('system.plugin.detail.api')">
              {{ manifest?.compatibility?.api || '-' }}
            </a-descriptions-item>
          </a-descriptions>
        </a-tab-pane>

        <a-tab-pane
          key="permissions"
          :title="$t('system.plugin.detail.permissions')"
        >
          <a-space wrap>
            <a-tag
              v-for="permission in manifest?.permissions || []"
              :key="permission"
              color="purple"
            >
              {{ permission }}
            </a-tag>
            <span v-if="!manifest?.permissions?.length">-</span>
          </a-space>
        </a-tab-pane>

        <a-tab-pane
          key="extensionPoints"
          :title="$t('system.plugin.detail.extensionPoints')"
        >
          <a-space wrap>
            <a-tag
              v-for="point in manifest?.extension_points || []"
              :key="point"
              color="green"
            >
              {{ point }}
            </a-tag>
            <span v-if="!manifest?.extension_points?.length">-</span>
          </a-space>
        </a-tab-pane>

        <a-tab-pane key="manifest" :title="$t('system.plugin.detail.manifest')">
          <pre class="manifest-json">{{ manifestJson }}</pre>
        </a-tab-pane>
      </a-tabs>
    </template>
  </a-drawer>
</template>

<script lang="ts" setup>
  import { computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import type {
    PluginManifest,
    PluginResponse,
    PluginStatus,
  } from '@/types/api';
  import { formatDateTime } from '@/utils';

  const props = defineProps<{
    visible: boolean;
    plugin?: PluginResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
  }>();

  const { t } = useI18n();

  const statusColorMap: Record<PluginStatus, string> = {
    installed: 'blue',
    enabled: 'green',
    disabled: 'gray',
    error: 'red',
  };

  const manifest = computed<PluginManifest | undefined>(() => {
    if (!props.plugin) return undefined;
    if (props.plugin.manifest) return props.plugin.manifest;
    if (!props.plugin.manifest_json) return undefined;
    if (typeof props.plugin.manifest_json === 'string') {
      try {
        return JSON.parse(props.plugin.manifest_json) as PluginManifest;
      } catch {
        return undefined;
      }
    }
    return props.plugin.manifest_json;
  });

  const statusColor = computed(() =>
    props.plugin ? statusColorMap[props.plugin.status] : 'gray'
  );

  const statusText = computed(() =>
    props.plugin ? t(`system.plugin.status.${props.plugin.status}`) : '-'
  );

  const engineEntries = computed(() =>
    Object.entries(manifest.value?.engine?.entry || {})
  );

  const manifestJson = computed(() =>
    JSON.stringify(manifest.value || {}, null, 2)
  );

  const formatOptionalDate = (value?: string) => {
    return value ? formatDateTime(value) : '-';
  };

  const handleCancel = () => {
    emit('update:visible', false);
  };
</script>

<style scoped lang="less">
  .entry-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .entry-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .manifest-json {
    max-height: 360px;
    padding: 12px;
    overflow: auto;
    background: var(--bg-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    font-size: 12px;
    line-height: 1.6;
  }
</style>
