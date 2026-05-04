<template>
  <a-modal
    :visible="visible"
    :title="$t('system.role.permission.title')"
    :width="700"
    :footer="false"
    @cancel="handleCancel"
  >
    <a-spin :loading="loading" style="width: 100%">
      <a-tabs default-active-key="all">
        <a-tab-pane key="all" :title="$t('system.role.permission.tab.all')">
          <a-table
            :data="allPermissions"
            :pagination="false"
            size="small"
            row-key="id"
          >
            <template #columns>
              <a-table-column
                :title="$t('system.role.permission.object')"
                data-index="object"
              />
              <a-table-column
                :title="$t('system.role.permission.action')"
                data-index="action"
              />
              <a-table-column
                :title="$t('system.role.permission.description')"
                data-index="description"
              />
              <a-table-column
                :title="$t('system.role.permission.type')"
                data-index="type"
                :width="90"
              />
              <a-table-column title="" :width="80">
                <template #cell="{ record }">
                  <a-popconfirm
                    :content="$t('system.role.permission.removeConfirm')"
                    @ok="handleRemove(record)"
                  >
                    <a-button type="text" status="danger" size="mini">
                      <template #icon><icon-delete /></template>
                    </a-button>
                  </a-popconfirm>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>
        <a-tab-pane key="api" :title="$t('system.role.permission.tab.api')">
          <a-table
            :data="apiPermissions"
            :pagination="false"
            size="small"
            row-key="id"
          >
            <template #columns>
              <a-table-column
                :title="$t('system.role.permission.object')"
                data-index="object"
              />
              <a-table-column
                :title="$t('system.role.permission.action')"
                data-index="action"
              />
              <a-table-column
                :title="$t('system.role.permission.description')"
                data-index="description"
              />
              <a-table-column title="" :width="80">
                <template #cell="{ record }">
                  <a-popconfirm
                    :content="$t('system.role.permission.removeConfirm')"
                    @ok="handleRemove(record)"
                  >
                    <a-button type="text" status="danger" size="mini">
                      <template #icon><icon-delete /></template>
                    </a-button>
                  </a-popconfirm>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>
        <a-tab-pane key="menu" :title="$t('system.role.permission.tab.menu')">
          <a-table
            :data="menuPermissions"
            :pagination="false"
            size="small"
            row-key="id"
          >
            <template #columns>
              <a-table-column
                :title="$t('system.role.permission.object')"
                data-index="object"
              />
              <a-table-column
                :title="$t('system.role.permission.action')"
                data-index="action"
              />
              <a-table-column
                :title="$t('system.role.permission.description')"
                data-index="description"
              />
              <a-table-column title="" :width="80">
                <template #cell="{ record }">
                  <a-popconfirm
                    :content="$t('system.role.permission.removeConfirm')"
                    @ok="handleRemove(record)"
                  >
                    <a-button type="text" status="danger" size="mini">
                      <template #icon><icon-delete /></template>
                    </a-button>
                  </a-popconfirm>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>
        <a-tab-pane
          key="button"
          :title="$t('system.role.permission.tab.button')"
        >
          <a-table
            :data="buttonPermissions"
            :pagination="false"
            size="small"
            row-key="id"
          >
            <template #columns>
              <a-table-column
                :title="$t('system.role.permission.object')"
                data-index="object"
              />
              <a-table-column
                :title="$t('system.role.permission.action')"
                data-index="action"
              />
              <a-table-column
                :title="$t('system.role.permission.description')"
                data-index="description"
              />
              <a-table-column title="" :width="80">
                <template #cell="{ record }">
                  <a-popconfirm
                    :content="$t('system.role.permission.removeConfirm')"
                    @ok="handleRemove(record)"
                  >
                    <a-button type="text" status="danger" size="mini">
                      <template #icon><icon-delete /></template>
                    </a-button>
                  </a-popconfirm>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>

      <a-divider />

      <a-space direction="vertical" fill style="width: 100%">
        <a-typography-text bold>{{
          $t('system.role.permission.addTitle')
        }}</a-typography-text>
        <a-form :model="assignForm" layout="inline">
          <a-form-item :label="$t('system.role.permission.object')">
            <a-input
              v-model="assignForm.object"
              :placeholder="$t('system.role.permission.objectPlaceholder')"
            />
          </a-form-item>
          <a-form-item :label="$t('system.role.permission.action')">
            <a-input
              v-model="assignForm.action"
              :placeholder="$t('system.role.permission.actionPlaceholder')"
            />
          </a-form-item>
          <a-form-item :label="$t('system.role.permission.type')">
            <a-select v-model="assignForm.type" style="width: 120px">
              <a-option value="api">{{
                $t('system.role.permission.tab.api')
              }}</a-option>
              <a-option value="menu">{{
                $t('system.role.permission.tab.menu')
              }}</a-option>
              <a-option value="button">{{
                $t('system.role.permission.tab.button')
              }}</a-option>
            </a-select>
          </a-form-item>
          <a-form-item>
            <a-button type="primary" :loading="assigning" @click="handleAssign">
              <template #icon><icon-plus /></template>
              {{ $t('system.role.permission.addButton') }}
            </a-button>
          </a-form-item>
        </a-form>
      </a-space>
    </a-spin>
  </a-modal>
</template>

<script lang="ts" setup>
  import { ref, computed, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import {
    getRolePermissions,
    assignRolePermissions,
    removeRolePermissions,
  } from '@/api/role';
  import type {
    RoleResponse,
    PermissionResponse,
    PermissionType,
  } from '@/types/api';

  const { t } = useI18n();

  const props = defineProps<{
    visible: boolean;
    role?: RoleResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
  }>();

  const loading = ref(false);
  const assigning = ref(false);
  const permissions = ref<PermissionResponse[]>([]);

  const assignForm = ref({
    object: '',
    action: '',
    type: 'api' as PermissionType,
  });

  const allPermissions = computed(() => permissions.value);
  const apiPermissions = computed(() =>
    permissions.value.filter((p) => p.type === 'api')
  );
  const menuPermissions = computed(() =>
    permissions.value.filter((p) => p.type === 'menu')
  );
  const buttonPermissions = computed(() =>
    permissions.value.filter((p) => p.type === 'button')
  );

  const fetchPermissions = async () => {
    if (!props.role) return;
    loading.value = true;
    try {
      const res = await getRolePermissions({ role_name: props.role.name });
      permissions.value = res.data.data;
    } finally {
      loading.value = false;
    }
  };

  const handleAssign = async () => {
    if (!props.role) return;
    if (!assignForm.value.object || !assignForm.value.action) {
      Message.warning(t('system.role.permission.objectRequired'));
      return;
    }
    assigning.value = true;
    try {
      await assignRolePermissions({
        role_name: props.role.name,
        domain: 'default',
        permissions: [
          {
            object: assignForm.value.object,
            action: assignForm.value.action,
            type: assignForm.value.type,
          },
        ],
      });
      Message.success(t('system.role.permission.assignSuccess'));
      assignForm.value = { object: '', action: '', type: 'api' };
      fetchPermissions();
    } finally {
      assigning.value = false;
    }
  };

  const handleRemove = async (record: PermissionResponse) => {
    if (!props.role) return;
    try {
      await removeRolePermissions({
        role_name: props.role.name,
        domain: record.domain,
        permissions: [
          {
            object: record.object,
            action: record.action,
            type: record.type,
          },
        ],
      });
      Message.success(t('system.role.permission.removeSuccess'));
      fetchPermissions();
    } catch (err) {
      // error handled by interceptor
    }
  };

  const handleCancel = () => {
    emit('update:visible', false);
  };

  watch(
    () => props.visible,
    (val) => {
      if (val) {
        fetchPermissions();
      } else {
        permissions.value = [];
      }
    }
  );
</script>
