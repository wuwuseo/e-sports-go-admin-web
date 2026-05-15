<template>
  <a-modal
    :visible="visible"
    :title="$t('system.user.addToBlacklist')"
    :ok-loading="submitting"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form ref="formRef" :model="formData" auto-label-width>
      <a-form-item field="reason" :label="$t('system.user.blacklist.reason')">
        <a-textarea
          v-model="formData.reason"
          :placeholder="$t('system.user.blacklist.reason.placeholder')"
          :max-length="200"
          show-word-limit
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
  import { ref, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import useUserManagementStore from '@/store/modules/user-management';
  import type { UserResponse } from '@/types/api';

  const props = defineProps<{
    visible: boolean;
    user?: UserResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
    (e: 'success'): void;
  }>();

  const { t } = useI18n();
  const userManagementStore = useUserManagementStore();
  const formRef = ref();
  const submitting = ref(false);
  const formData = ref({
    reason: '',
  });

  watch(
    () => props.visible,
    (val) => {
      if (val) {
        formData.value = { reason: '' };
      }
    }
  );

  const handleSubmit = async () => {
    if (!props.user) return;

    submitting.value = true;
    try {
      await userManagementStore.addToBlacklist(props.user.id, {
        reason: formData.value.reason || undefined,
      });
      Message.success(t('system.user.addToBlacklistSuccess'));
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
