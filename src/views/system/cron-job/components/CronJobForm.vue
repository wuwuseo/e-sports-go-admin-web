<template>
  <a-modal
    :visible="visible"
    :title="
      isEdit
        ? $t('system.cronJob.form.title.edit')
        : $t('system.cronJob.form.title.create')
    "
    :ok-loading="submitting"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form ref="formRef" :model="formData" :rules="rules" auto-label-width>
      <a-form-item field="name" :label="$t('system.cronJob.name')">
        <a-input
          v-model="formData.name"
          :placeholder="$t('system.cronJob.form.name.placeholder')"
        />
      </a-form-item>
      <a-form-item field="expression" :label="$t('system.cronJob.expression')">
        <a-input
          v-model="formData.expression"
          :placeholder="$t('system.cronJob.form.expression.placeholder')"
        />
      </a-form-item>
      <a-form-item field="type" :label="$t('system.cronJob.type')">
        <a-select
          v-model="formData.type"
          :placeholder="$t('system.cronJob.form.type.placeholder')"
        >
          <a-option value="shell">shell</a-option>
          <a-option value="curl">curl</a-option>
          <a-option value="task">task</a-option>
        </a-select>
      </a-form-item>
      <a-form-item field="command" :label="$t('system.cronJob.command')">
        <a-input
          v-model="formData.command"
          :placeholder="$t('system.cronJob.form.command.placeholder')"
        />
      </a-form-item>
      <a-form-item
        field="description"
        :label="$t('system.cronJob.description')"
      >
        <a-textarea
          v-model="formData.description"
          :placeholder="$t('system.cronJob.form.description.placeholder')"
          :max-length="200"
          show-word-limit
        />
      </a-form-item>
      <a-form-item field="enabled" :label="$t('system.cronJob.enabled')">
        <a-switch v-model="formData.enabled" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
  import { ref, computed, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { createCronJob, updateCronJob } from '@/api/cron-job';
  import type { CronJobResponse, CronJobType } from '@/types/api';

  const props = defineProps<{
    visible: boolean;
    cronJob?: CronJobResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
    (e: 'success'): void;
  }>();

  const { t } = useI18n();
  const formRef = ref();
  const submitting = ref(false);

  const isEdit = computed(() => !!props.cronJob);

  const formData = ref({
    name: '',
    expression: '',
    type: '' as CronJobType | '',
    command: '',
    description: '',
    enabled: true,
  });

  const rules = computed(() => ({
    name: [{ required: true, message: t('system.cronJob.form.name.required') }],
    expression: [
      {
        required: true,
        message: t('system.cronJob.form.expression.required'),
      },
    ],
    type: [{ required: true, message: t('system.cronJob.form.type.required') }],
    command: [
      {
        required: true,
        message: t('system.cronJob.form.command.required'),
      },
    ],
  }));

  watch(
    () => props.visible,
    (val) => {
      if (val && props.cronJob) {
        formData.value = {
          name: props.cronJob.name,
          expression: props.cronJob.expression,
          type: props.cronJob.type,
          command: props.cronJob.command,
          description: props.cronJob.description || '',
          enabled: props.cronJob.enabled,
        };
      } else if (val) {
        formData.value = {
          name: '',
          expression: '',
          type: '',
          command: '',
          description: '',
          enabled: true,
        };
      }
    }
  );

  const handleSubmit = async () => {
    const res = await formRef.value?.validate();
    if (res) return;

    submitting.value = true;
    try {
      if (isEdit.value && props.cronJob) {
        await updateCronJob(props.cronJob.id, {
          name: formData.value.name,
          expression: formData.value.expression,
          type: formData.value.type as CronJobType,
          command: formData.value.command,
          description: formData.value.description || undefined,
          enabled: formData.value.enabled,
        });
        Message.success(t('system.cronJob.updateSuccess'));
      } else {
        await createCronJob({
          name: formData.value.name,
          expression: formData.value.expression,
          type: formData.value.type as CronJobType,
          command: formData.value.command,
          description: formData.value.description || undefined,
          enabled: formData.value.enabled,
        });
        Message.success(t('system.cronJob.createSuccess'));
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
