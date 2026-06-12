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
  import type { UserResponse, UserDetailResponse } from '@/types/api';

  const props = defineProps<{
    visible: boolean;
    user?: UserResponse | UserDetailResponse;
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
    [() => props.visible, () => props.user?.id],
    async ([val, userId]) => {
      // 弹窗关闭时立即清空，避免下次打开残留上一次的勾选
      if (!val) {
        selectedRoleIds.value = [];
        return;
      }
      // 弹窗打开但没有目标用户
      if (!props.user) {
        selectedRoleIds.value = [];
        return;
      }
      // 每次打开/切换用户，先重置为初始空态，再异步拉取该用户的真实角色
      selectedRoleIds.value = [];
      try {
        const currentUserId = userId;
        const userRoles = await userManagementStore.fetchUserRoles(
          props.user.id
        );
        // 防止异步竞态：请求返回时若已切换到另一个用户，则丢弃旧结果
        if (!props.visible || !props.user || props.user.id !== currentUserId) {
          return;
        }
        selectedRoleIds.value = userRoles.map((r) => r.id);
      } catch (err) {
        // 错误已在API层处理
      }
    },
    { immediate: true }
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
