<template>
  <a-modal
    :visible="visible"
    :title="$t('navbar.profile.title')"
    :mask-closable="false"
    unmount-on-close
    :ok-loading="loading"
    @cancel="handleCancel"
    @ok="handleOk"
  >
    <a-form ref="formRef" :model="formData" :rules="rules" layout="vertical">
      <a-form-item field="username" :label="$t('navbar.profile.username')">
        <a-input v-model="formData.username" />
      </a-form-item>
      <a-form-item field="email" :label="$t('navbar.profile.email')">
        <a-input v-model="formData.email" />
      </a-form-item>
      <a-form-item field="phone" :label="$t('navbar.profile.phone')">
        <a-input v-model="formData.phone" />
      </a-form-item>
      <a-form-item field="avatar" :label="$t('navbar.profile.avatar')">
        <a-input v-model="formData.avatar" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
  import { ref, reactive } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import type { FormInstance } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { useUserStore } from '@/store';
  import { updateCurrentUser, updateCurrentAdmin } from '@/api/user';
  import { isAdminLogin } from '@/utils/auth';

  defineProps<{
    visible: boolean;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
  }>();

  const { t } = useI18n();

  const userStore = useUserStore();
  const formRef = ref<FormInstance>();
  const loading = ref(false);

  const formData = reactive({
    username: '',
    email: '',
    phone: '',
    avatar: '',
  });

  const rules = {
    username: [
      { required: true, message: t('navbar.profile.usernameRequired') },
    ],
  };

  const initFormData = () => {
    formData.username = userStore.name || '';
    formData.email = userStore.email || '';
    formData.phone = userStore.phone || '';
    formData.avatar = userStore.avatar || '';
  };

  // 暴露初始化方法供父组件调用
  defineExpose({ initFormData });

  const handleCancel = () => {
    emit('update:visible', false);
  };

  const handleOk = async () => {
    const valid = await formRef.value?.validate();
    if (valid) return;

    loading.value = true;
    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        avatar: formData.avatar,
      };

      if (isAdminLogin()) {
        await updateCurrentAdmin(payload);
      } else {
        await updateCurrentUser(payload);
      }

      // 刷新 store 中的用户信息
      if (isAdminLogin()) {
        await userStore.loadAdminInfo();
      } else {
        await userStore.info();
      }

      Message.success(t('navbar.profile.saveSuccess'));
      emit('update:visible', false);
    } finally {
      loading.value = false;
    }
  };
</script>
