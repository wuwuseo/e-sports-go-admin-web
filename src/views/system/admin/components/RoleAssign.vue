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
    [() => props.visible, () => props.admin?.id],
    async ([val, adminId]) => {
      // 弹窗关闭时立即清空，避免下次打开残留上一次的勾选
      if (!val) {
        selectedRoleIds.value = [];
        return;
      }
      // 弹窗打开但没有目标管理员
      if (!props.admin) {
        selectedRoleIds.value = [];
        return;
      }
      // 每次打开/切换管理员，先重置为初始空态，再异步拉取该管理员的真实角色
      selectedRoleIds.value = [];
      try {
        const currentAdminId = adminId;
        const adminRoles = await adminManagementStore.fetchAdminRoles(
          props.admin.id
        );
        // 防止异步竞态：请求返回时若已切换到另一个管理员，则丢弃旧结果
        if (
          !props.visible ||
          !props.admin ||
          props.admin.id !== currentAdminId
        ) {
          return;
        }
        selectedRoleIds.value = adminRoles
          .filter((role) => !isSuperAdminRole(role))
          .map((role) => role.id);
      } catch (err) {
        // 错误已在API层处理
      }
    },
    { immediate: true }
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
