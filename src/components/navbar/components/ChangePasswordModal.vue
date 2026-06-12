<template>
  <a-modal
    :visible="visible"
    :title="$t('navbar.changePassword.title')"
    :mask-closable="false"
    unmount-on-close
    :ok-loading="loading"
    @cancel="handleCancel"
    @ok="handleOk"
  >
    <a-form ref="formRef" :model="formData" :rules="rules" layout="vertical">
      <a-form-item
        field="old_password"
        :label="$t('navbar.changePassword.oldPassword')"
      >
        <a-input-password v-model="formData.old_password" />
      </a-form-item>
      <a-form-item
        field="new_password"
        :label="$t('navbar.changePassword.newPassword')"
      >
        <a-input-password v-model="formData.new_password" />
      </a-form-item>
      <a-form-item
        field="confirm_password"
        :label="$t('navbar.changePassword.confirmPassword')"
      >
        <a-input-password v-model="formData.confirm_password" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
  import { ref, reactive } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import type { FormInstance, FieldRule } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { changePassword, changeAdminPassword } from '@/api/user';
  import { isAdminLogin } from '@/utils/auth';

  defineProps<{
    visible: boolean;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
  }>();

  const { t } = useI18n();

  const formRef = ref<FormInstance>();
  const loading = ref(false);

  const formData = reactive({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const rules: Record<string, FieldRule[]> = {
    old_password: [
      {
        required: true,
        message: t('navbar.changePassword.oldPasswordRequired'),
      },
    ],
    new_password: [
      {
        required: true,
        message: t('navbar.changePassword.newPasswordRequired'),
      },
    ],
    confirm_password: [
      {
        required: true,
        message: t('navbar.changePassword.confirmPasswordRequired'),
      },
      {
        validator: (value, callback) => {
          if (value !== formData.new_password) {
            callback(t('navbar.changePassword.passwordMismatch'));
          } else {
            callback();
          }
        },
      },
    ],
  };

  const handleCancel = () => {
    emit('update:visible', false);
  };

  const resetForm = () => {
    formData.old_password = '';
    formData.new_password = '';
    formData.confirm_password = '';
  };

  const handleOk = async () => {
    const valid = await formRef.value?.validate();
    if (valid) return;

    loading.value = true;
    try {
      const payload = {
        old_password: formData.old_password,
        new_password: formData.new_password,
      };

      if (isAdminLogin()) {
        await changeAdminPassword(payload);
      } else {
        await changePassword(payload);
      }

      Message.success(t('navbar.changePassword.success'));
      resetForm();
      emit('update:visible', false);
    } finally {
      loading.value = false;
    }
  };
</script>
