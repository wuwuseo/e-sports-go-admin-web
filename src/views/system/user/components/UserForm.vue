<template>
  <a-modal
    :visible="visible"
    :title="title"
    :ok-loading="submitting"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="rules as any"
      auto-label-width
    >
      <a-form-item field="username" :label="$t('system.user.form.username')">
        <a-input
          v-model="formData.username"
          :placeholder="$t('system.user.form.username.placeholder')"
          :disabled="isView"
        />
      </a-form-item>
      <a-form-item field="email" :label="$t('system.user.form.email')">
        <a-input
          v-model="formData.email"
          :placeholder="$t('system.user.form.email.placeholder')"
          :disabled="isView"
        />
      </a-form-item>
      <a-form-item field="phone" :label="$t('system.user.form.phone')">
        <a-input
          v-model="formData.phone"
          :placeholder="$t('system.user.form.phone.placeholder')"
          :disabled="isView"
        />
      </a-form-item>
      <a-form-item
        v-if="!isEdit"
        field="password"
        :label="$t('system.user.form.password')"
      >
        <a-input-password
          v-model="formData.password"
          :placeholder="$t('system.user.form.password.placeholder')"
          :disabled="isView"
        />
      </a-form-item>
      <a-form-item
        v-if="isEdit || isView"
        :label="$t('system.user.form.status')"
      >
        <a-tag :color="formData.status === 'active' ? 'green' : 'red'">
          {{
            formData.status === 'active'
              ? $t('common.status.active')
              : $t('common.status.inactive')
          }}
        </a-tag>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
  import { ref, computed, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import useUserManagementStore from '@/store/modules/user-management';
  import type { UserResponse, UserDetailResponse } from '@/types/api';

  const props = defineProps<{
    visible: boolean;
    user?: UserResponse | UserDetailResponse;
    mode?: 'create' | 'edit' | 'view';
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
    (e: 'success'): void;
  }>();

  const { t } = useI18n();
  const userManagementStore = useUserManagementStore();
  const formRef = ref();
  const submitting = ref(false);

  const isEdit = computed(() => props.mode === 'edit');
  const isView = computed(() => props.mode === 'view');

  const title = computed(() => {
    if (isEdit.value) {
      return t('system.user.form.title.edit');
    }
    if (isView.value) {
      return t('system.user.form.title.view');
    }
    return t('system.user.form.title.create');
  });

  const formData = ref({
    username: '',
    email: '',
    phone: '',
    password: '',
    status: 'active' as 'active' | 'inactive',
  });

  const rules = computed(() => ({
    username: [
      {
        required: !isView.value,
        message: t('system.user.form.username.required'),
      },
    ],
    email: [
      {
        required: !isView.value,
        message: t('system.user.form.email.required'),
      },
      { type: 'email', message: '请输入正确的邮箱格式' },
    ],
    password: [
      {
        required: !isEdit.value && !isView.value,
        message: t('system.user.form.password.required'),
      },
    ],
  }));

  watch(
    () => props.visible,
    (val) => {
      if (val && props.user) {
        formData.value = {
          username: props.user.username,
          email: props.user.email,
          phone: props.user.phone || '',
          password: '',
          status: props.user.status,
        };
      } else if (val) {
        formData.value = {
          username: '',
          email: '',
          phone: '',
          password: '',
          status: 'active',
        };
      }
    }
  );

  const handleSubmit = async () => {
    if (isView.value) {
      emit('update:visible', false);
      return;
    }

    const res = await formRef.value?.validate();
    if (res) return;

    submitting.value = true;
    try {
      if (isEdit.value && props.user) {
        await userManagementStore.updateUser(props.user.id, {
          username: formData.value.username,
          email: formData.value.email,
          phone: formData.value.phone || undefined,
          password: formData.value.password || undefined,
        });
        Message.success(t('system.user.updateSuccess'));
      } else {
        await userManagementStore.createUser({
          username: formData.value.username,
          email: formData.value.email,
          password: formData.value.password,
          phone: formData.value.phone || undefined,
        });
        Message.success(t('system.user.createSuccess'));
      }
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
