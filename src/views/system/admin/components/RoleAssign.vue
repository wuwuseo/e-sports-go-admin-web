<template>
  <a-modal
    :visible="visible"
    :title="$t('system.admin.role.title')"
    :ok-loading="submitting"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-checkbox-group v-model="selectedRoleIds">
      <a-space direction="vertical" fill>
        <a-checkbox v-for="role in allRoles" :key="role.id" :value="role.id">
          <div style="display: flex; align-items: center; gap: 8px">
            <span>{{ role.display_name }}</span>
            <a-tag v-if="role.is_system" size="small">System</a-tag>
          </div>
        </a-checkbox>
      </a-space>
    </a-checkbox-group>
  </a-modal>
</template>

<script lang="ts" setup>
  import { ref, watch, onMounted } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import useAdminManagementStore from '@/store/modules/admin-management';
  import useRoleStore from '@/store/modules/role';
  import type { AdminDetailResponse, RoleResponse } from '@/types/api';

  const props = defineProps<{
    visible: boolean;
    admin?: AdminDetailResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
    (e: 'success'): void;
  }>();

  const { t } = useI18n();
  const adminManagementStore = useAdminManagementStore();
  const roleStore = useRoleStore();
  const submitting = ref(false);
  const selectedRoleIds = ref<number[]>([]);
  const allRoles = ref<RoleResponse[]>([]);

  const isSuperAdminRole = (role: RoleResponse) => {
    return role.name === 'super_admin' || role.display_name === '超级管理员';
  };

  const loadAllRoles = async () => {
    try {
      const roles = await roleStore.fetchAllRoles();
      allRoles.value = roles.filter((role) => !isSuperAdminRole(role));
    } catch (err) {
      // 错误已在API层处理
    }
  };

  onMounted(async () => {
    await loadAllRoles();
  });

  watch(
    () => props.visible,
    async (val) => {
      if (val && props.admin) {
        try {
          const adminRoles = await adminManagementStore.fetchAdminRoles(
            props.admin.id
          );
          selectedRoleIds.value = adminRoles
            .filter((role) => !isSuperAdminRole(role))
            .map((role) => role.id);
        } catch (err) {
          // 错误已在API层处理
        }
      } else if (val) {
        selectedRoleIds.value = [];
      }
    }
  );

  const handleSubmit = async () => {
    if (!props.admin) return;

    submitting.value = true;
    try {
      await adminManagementStore.assignAdminRoles(props.admin.id, {
        role_ids: selectedRoleIds.value,
      });
      Message.success(t('system.admin.assignRoleSuccess'));
      emit('update:visible', false);
      emit('success');
    } finally {
      submitting.value = false;
    }
  };

  const handleCancel = () => {
    emit('update:visible', false);
  };
</script>
