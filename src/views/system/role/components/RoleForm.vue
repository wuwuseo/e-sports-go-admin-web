<template>
  <a-modal
    :visible="visible"
    :title="
      isEdit
        ? $t('system.role.form.title.edit')
        : $t('system.role.form.title.create')
    "
    :ok-loading="submitting"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form ref="formRef" :model="formData" :rules="rules" auto-label-width>
      <a-form-item
        field="name"
        :label="$t('system.role.form.name')"
        :disabled="isEdit"
      >
        <a-input
          v-model="formData.name"
          :placeholder="$t('system.role.form.name.placeholder')"
          :disabled="isEdit"
        />
      </a-form-item>
      <a-form-item
        field="display_name"
        :label="$t('system.role.form.displayName')"
      >
        <a-input
          v-model="formData.display_name"
          :placeholder="$t('system.role.form.displayName.placeholder')"
        />
      </a-form-item>
      <a-form-item
        field="description"
        :label="$t('system.role.form.description')"
      >
        <a-textarea
          v-model="formData.description"
          :placeholder="$t('system.role.form.description.placeholder')"
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
  import useRoleStore from '@/store/modules/role';
  import type { RoleResponse } from '@/types/api';

  const props = defineProps<{
    visible: boolean;
    role?: RoleResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
    (e: 'success'): void;
  }>();

  const { t } = useI18n();
  const roleStore = useRoleStore();
  const formRef = ref();
  const submitting = ref(false);

  const isEdit = computed(() => !!props.role);

  const formData = ref({
    name: '',
    display_name: '',
    description: '',
  });

  const rules = computed(() => ({
    name: [{ required: true, message: t('system.role.form.name.required') }],
    display_name: [
      {
        required: true,
        message: t('system.role.form.displayName.required'),
      },
    ],
  }));

  watch(
    () => props.visible,
    (val) => {
      if (val && props.role) {
        formData.value = {
          name: props.role.name,
          display_name: props.role.display_name,
          description: props.role.description || '',
        };
      } else if (val) {
        formData.value = {
          name: '',
          display_name: '',
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
      if (isEdit.value && props.role) {
        await roleStore.updateRole(props.role.id, {
          display_name: formData.value.display_name,
          description: formData.value.description || undefined,
        });
        Message.success(t('system.role.updateSuccess'));
      } else {
        await roleStore.createRole({
          name: formData.value.name,
          display_name: formData.value.display_name,
          description: formData.value.description || undefined,
        });
        Message.success(t('system.role.createSuccess'));
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
