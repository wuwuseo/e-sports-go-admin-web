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
      <a-form-item field="username" :label="$t('system.admin.form.username')">
        <a-input
          v-model="formData.username"
          :placeholder="$t('system.admin.form.username.placeholder')"
          :disabled="isView"
        />
      </a-form-item>
      <a-form-item field="email" :label="$t('system.admin.form.email')">
        <a-input
          v-model="formData.email"
          :placeholder="$t('system.admin.form.email.placeholder')"
          :disabled="isView"
        />
      </a-form-item>
      <a-form-item field="phone" :label="$t('system.admin.form.phone')">
        <a-input
          v-model="formData.phone"
          :placeholder="$t('system.admin.form.phone.placeholder')"
          :disabled="isView"
        />
      </a-form-item>
      <a-form-item
        v-if="!isEdit"
        field="password"
        :label="$t('system.admin.form.password')"
      >
        <a-input-password
          v-model="formData.password"
          :placeholder="$t('system.admin.form.password.placeholder')"
          :disabled="isView"
        />
      </a-form-item>
      <a-form-item v-if="!isView" :label="$t('system.admin.form.isSuperAdmin')">
        <a-switch v-model="formData.isSuperAdmin" />
      </a-form-item>
      <a-form-item
        v-if="isEdit || isView"
        :label="$t('system.admin.form.status')"
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
  import useAdminManagementStore from '@/store/modules/admin-management';
  import type { AdminDetailResponse } from '@/types/api';

  const props = defineProps<{
    visible: boolean;
    admin?: AdminDetailResponse;
    mode?: 'create' | 'edit' | 'view';
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
    (e: 'success'): void;
  }>();

  const { t } = useI18n();
  const adminStore = useAdminManagementStore();
  const formRef = ref();
  const submitting = ref(false);

  const isEdit = computed(() => props.mode === 'edit');
  const isView = computed(() => props.mode === 'view');

  const title = computed(() => {
    if (isEdit.value) {
      return t('system.admin.form.title.edit');
    }
    if (isView.value) {
      return t('system.admin.form.title.view');
    }
    return t('system.admin.form.title.create');
  });

  const formData = ref({
    username: '',
    email: '',
    phone: '',
    password: '',
    isSuperAdmin: false,
    status: 'active' as 'active' | 'inactive',
  });

  const rules = computed(() => ({
    username: [
      {
        required: !isView.value,
        message: t('system.admin.form.username.required'),
      },
    ],
    email: [
      {
        required: !isView.value,
        message: t('system.admin.form.email.required'),
      },
      { type: 'email', message: '请输入正确的邮箱格式' },
    ],
    password: [
      {
        required: !isEdit.value && !isView.value,
        message: t('system.admin.form.password.required'),
      },
    ],
  }));

  watch(
    () => props.visible,
    (val) => {
      if (val && props.admin) {
        formData.value = {
          username: props.admin.username,
          email: props.admin.email,
          phone: props.admin.phone || '',
          password: '',
          isSuperAdmin: props.admin.is_super_admin,
          status: props.admin.status,
        };
      } else if (val) {
        formData.value = {
          username: '',
          email: '',
          phone: '',
          password: '',
          isSuperAdmin: false,
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
      if (isEdit.value && props.admin) {
        // 目前 API 没有提供管理员更新方法，预留
        Message.info('管理员编辑功能暂未开放');
      } else {
        await adminStore.createAdmin({
          username: formData.value.username,
          email: formData.value.email,
          password: formData.value.password,
          phone: formData.value.phone || undefined,
          is_super_admin: formData.value.isSuperAdmin,
        });
        Message.success(t('system.admin.createSuccess'));
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
