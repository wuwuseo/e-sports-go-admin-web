<template>
  <a-modal
    :visible="visible"
    :title="
      isEdit
        ? $t('system.permission.form.title.edit')
        : $t('system.permission.form.title.create')
    "
    :ok-loading="submitting"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form ref="formRef" :model="formData" :rules="rules" auto-label-width>
      <a-form-item field="role_name" :label="$t('system.permission.roleName')">
        <a-input
          v-model="formData.role_name"
          :placeholder="$t('system.permission.form.roleName.placeholder')"
        />
      </a-form-item>
      <a-form-item field="domain" :label="$t('system.permission.domain')">
        <a-input
          v-model="formData.domain"
          :placeholder="$t('system.permission.form.domain.placeholder')"
        />
      </a-form-item>
      <a-form-item field="object" :label="$t('system.permission.object')">
        <a-input
          v-model="formData.object"
          :placeholder="$t('system.permission.form.object.placeholder')"
        />
      </a-form-item>
      <a-form-item field="action" :label="$t('system.permission.action')">
        <a-input
          v-model="formData.action"
          :placeholder="$t('system.permission.form.action.placeholder')"
        />
      </a-form-item>
      <a-form-item field="type" :label="$t('system.permission.type')">
        <a-select
          v-model="formData.type"
          :placeholder="$t('system.permission.form.type.placeholder')"
        >
          <a-option value="api">API</a-option>
          <a-option value="menu">Menu</a-option>
          <a-option value="button">Button</a-option>
        </a-select>
      </a-form-item>
      <a-form-item
        field="description"
        :label="$t('system.permission.description')"
      >
        <a-textarea
          v-model="formData.description"
          :placeholder="$t('system.permission.form.description.placeholder')"
          :max-length="200"
          show-word-limit
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
  import { ref, computed, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import usePermissionStore from '@/store/modules/permission';
  import type { PermissionResponse, PermissionType } from '@/types/api';

  const props = defineProps<{
    visible: boolean;
    permission?: PermissionResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
    (e: 'success'): void;
  }>();

  const { t } = useI18n();
  const permissionStore = usePermissionStore();
  const formRef = ref();
  const submitting = ref(false);

  const isEdit = computed(() => !!props.permission);

  const formData = ref({
    role_name: '',
    domain: '',
    object: '',
    action: '',
    type: '' as PermissionType | '',
    description: '',
  });

  const rules = computed(() => ({
    role_name: [
      {
        required: true,
        message: t('system.permission.form.roleName.required'),
      },
    ],
    domain: [
      { required: true, message: t('system.permission.form.domain.required') },
    ],
    object: [
      { required: true, message: t('system.permission.form.object.required') },
    ],
    action: [
      { required: true, message: t('system.permission.form.action.required') },
    ],
    type: [
      { required: true, message: t('system.permission.form.type.required') },
    ],
  }));

  watch(
    () => props.visible,
    (val) => {
      if (val && props.permission) {
        formData.value = {
          role_name: props.permission.role_name,
          domain: props.permission.domain,
          object: props.permission.object,
          action: props.permission.action,
          type: props.permission.type,
          description: props.permission.description || '',
        };
      } else if (val) {
        formData.value = {
          role_name: '',
          domain: '',
          object: '',
          action: '',
          type: '',
          description: '',
        };
      }
    }
  );

  const handleSubmit = async () => {
    const res = await formRef.value?.validate();
    if (res) return;

    submitting.value = true;
    try {
      if (isEdit.value && props.permission) {
        await permissionStore.updatePermission({
          id: props.permission.id,
          role_name: formData.value.role_name,
          domain: formData.value.domain,
          object: formData.value.object,
          action: formData.value.action,
          type: formData.value.type as PermissionType,
          description: formData.value.description || undefined,
        });
        Message.success(t('system.permission.updateSuccess'));
      } else {
        await permissionStore.createPermission({
          role_name: formData.value.role_name,
          domain: formData.value.domain,
          object: formData.value.object,
          action: formData.value.action,
          type: formData.value.type as PermissionType,
          description: formData.value.description || undefined,
        });
        Message.success(t('system.permission.createSuccess'));
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
