<template>
  <a-modal
    :visible="visible"
    :title="$t('system.user.role.title')"
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
  import useUserManagementStore from '@/store/modules/user-management';
  import useRoleStore from '@/store/modules/role';
  import type { UserDetailResponse } from '@/types/api';

  const props = defineProps<{
    visible: boolean;
    user?: UserDetailResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
    (e: 'success'): void;
  }>();

  const { t } = useI18n();
  const userManagementStore = useUserManagementStore();
  const roleStore = useRoleStore();
  const submitting = ref(false);
  const selectedRoleIds = ref<number[]>([]);
  const allRoles = ref<any[]>([]);

  const loadAllRoles = async () => {
    try {
      allRoles.value = await roleStore.fetchAllRoles();
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
      if (val && props.user) {
        try {
          const userRoles = await userManagementStore.fetchUserRoles(
            props.user.id
          );
          selectedRoleIds.value = userRoles.map((r) => r.id);
        } catch (err) {
          // 错误已在API层处理
        }
      } else if (val) {
        selectedRoleIds.value = [];
      }
    }
  );

  const handleSubmit = async () => {
    if (!props.user) return;

    submitting.value = true;
    try {
      await userManagementStore.assignUserRoles(props.user.id, {
        role_ids: selectedRoleIds.value,
      });
      Message.success(t('system.user.assignRoleSuccess'));
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
