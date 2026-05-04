<template>
  <a-modal
    :visible="visible"
    :title="
      isEdit
        ? $t('system.config.form.title.edit')
        : $t('system.config.form.title.create')
    "
    :ok-loading="submitting"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form ref="formRef" :model="formData" :rules="rules" auto-label-width>
      <a-form-item field="name" :label="$t('system.config.form.name')">
        <a-input
          v-model="formData.name"
          :placeholder="$t('system.config.form.name.placeholder')"
          :disabled="isEdit"
        />
      </a-form-item>
      <a-form-item field="key" :label="$t('system.config.form.key')">
        <a-input
          v-model="formData.key"
          :placeholder="$t('system.config.form.key.placeholder')"
          :disabled="isEdit"
        />
      </a-form-item>
      <a-form-item field="value" :label="$t('system.config.form.value')">
        <a-textarea
          v-model="formData.value"
          :placeholder="$t('system.config.form.value.placeholder')"
        />
      </a-form-item>
      <a-form-item field="type" :label="$t('system.config.form.type')">
        <a-select
          v-model="formData.type"
          :placeholder="$t('system.config.form.type.placeholder')"
        >
          <a-option value="string">string</a-option>
          <a-option value="number">number</a-option>
          <a-option value="boolean">boolean</a-option>
          <a-option value="json">json</a-option>
        </a-select>
      </a-form-item>
      <a-form-item field="group" :label="$t('system.config.form.group')">
        <a-input
          v-model="formData.group"
          :placeholder="$t('system.config.form.group.placeholder')"
        />
      </a-form-item>
      <a-form-item field="status" :label="$t('system.config.status')">
        <a-switch
          :model-value="formData.status === 1"
          @change="(val: string | number | boolean) => { formData.status = val ? 1 : 0 }"
        />
      </a-form-item>
      <a-form-item field="remark" :label="$t('system.config.form.remark')">
        <a-textarea
          v-model="formData.remark"
          :placeholder="$t('system.config.form.remark.placeholder')"
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
  import { createConfig, updateConfig } from '@/api/config';
  import type { ConfigResponse, ConfigValueType } from '@/types/api';

  const props = defineProps<{
    visible: boolean;
    config?: ConfigResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
    (e: 'success'): void;
  }>();

  const { t } = useI18n();
  const formRef = ref();
  const submitting = ref(false);

  const isEdit = computed(() => !!props.config);

  const formData = ref({
    name: '',
    key: '',
    value: '',
    type: '' as ConfigValueType | '',
    group: '',
    status: 1,
    remark: '',
  });

  const rules = computed(() => ({
    name: [{ required: true, message: t('system.config.form.name.required') }],
    key: [{ required: true, message: t('system.config.form.key.required') }],
  }));

  watch(
    () => props.visible,
    (val) => {
      if (val && props.config) {
        formData.value = {
          name: props.config.name,
          key: props.config.key,
          value: props.config.value || '',
          type: props.config.type,
          group: props.config.group || '',
          status: props.config.status,
          remark: props.config.remark || '',
        };
      } else if (val) {
        formData.value = {
          name: '',
          key: '',
          value: '',
          type: '',
          group: '',
          status: 1,
          remark: '',
        };
      }
    }
  );

  const handleSubmit = async () => {
    const res = await formRef.value?.validate();
    if (res) return;

    submitting.value = true;
    try {
      if (isEdit.value && props.config) {
        await updateConfig(props.config.id, {
          value: formData.value.value || undefined,
          type: (formData.value.type as ConfigValueType) || undefined,
          group: formData.value.group || undefined,
          status: formData.value.status,
          remark: formData.value.remark || undefined,
        });
        Message.success(t('system.config.updateSuccess'));
      } else {
        await createConfig({
          name: formData.value.name,
          key: formData.value.key,
          value: formData.value.value || undefined,
          type: (formData.value.type as ConfigValueType) || undefined,
          group: formData.value.group || undefined,
          status: formData.value.status,
          remark: formData.value.remark || undefined,
        });
        Message.success(t('system.config.createSuccess'));
      }
      emit('update:visible', false);
      emit('success');
    } catch {
      // 错误已在拦截器中统一处理
    } finally {
      submitting.value = false;
    }
  };

  const handleCancel = () => {
    emit('update:visible', false);
  };
</script>
