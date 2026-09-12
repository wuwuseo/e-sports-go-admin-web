<template>
  <a-modal
    :visible="visible"
    :title="$t('system.queueJob.form.title')"
    :ok-loading="submitting"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form ref="formRef" :model="formData" :rules="rules" auto-label-width>
      <a-form-item field="name" :label="$t('system.queueJob.form.name')">
        <a-select
          v-model="formData.name"
          :placeholder="$t('system.queueJob.form.name.placeholder')"
          :loading="handlersLoading"
          :disabled="handlers.length === 0"
          allow-search
        >
          <a-option v-for="h in handlers" :key="h" :value="h">
            {{ h }}
          </a-option>
        </a-select>
      </a-form-item>
      <a-form-item field="payload" :label="$t('system.queueJob.form.payload')">
        <a-textarea
          v-model="formData.payload"
          :placeholder="$t('system.queueJob.form.payload.placeholder')"
          :auto-size="{ minRows: 4, maxRows: 10 }"
          :max-length="10240"
          show-word-limit
        />
      </a-form-item>
      <a-form-item field="queue" :label="$t('system.queueJob.form.queue')">
        <a-select v-model="formData.queue">
          <a-option v-for="q in queueOptions" :key="q" :value="q">
            {{ q }}
          </a-option>
        </a-select>
      </a-form-item>
      <a-form-item
        field="delay_seconds"
        :label="$t('system.queueJob.form.delaySeconds')"
      >
        <a-input-number
          v-model="formData.delay_seconds"
          :min="0"
          :max="86400"
          style="width: 160px"
        />
      </a-form-item>
      <a-form-item
        field="max_retry"
        :label="$t('system.queueJob.form.maxRetry')"
      >
        <a-input-number
          v-model="formData.max_retry"
          :min="0"
          :max="100"
          :placeholder="$t('system.queueJob.form.maxRetry.placeholder')"
          style="width: 160px"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
  import { ref, computed, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { getQueueHandlers, enqueueQueueTask } from '@/api/queue-job';

  const props = defineProps<{
    visible: boolean;
    queueOptions?: string[];
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
    (e: 'success'): void;
  }>();

  const { t } = useI18n();
  const formRef = ref();
  const submitting = ref(false);
  const handlers = ref<string[]>([]);
  const handlersLoading = ref(false);

  const formData = ref({
    name: '',
    payload: '',
    queue: 'default',
    delay_seconds: 0,
    max_retry: undefined as number | undefined,
  });

  const rules = computed(() => ({
    name: [
      { required: true, message: t('system.queueJob.form.name.required') },
    ],
    payload: [
      {
        validator: (value: string, callback: (error?: string) => void) => {
          if (value && value.trim()) {
            try {
              JSON.parse(value);
            } catch {
              callback(t('system.queueJob.form.payload.invalid'));
              return;
            }
          }
          callback();
        },
      },
    ],
  }));

  const fetchHandlers = async () => {
    handlersLoading.value = true;
    try {
      const { data } = await getQueueHandlers();
      handlers.value = data.data || [];
    } catch {
      // error handled by interceptor
    } finally {
      handlersLoading.value = false;
    }
  };

  watch(
    () => props.visible,
    (val) => {
      if (val) {
        formData.value = {
          name: '',
          payload: '',
          queue: props.queueOptions?.[0] || 'default',
          delay_seconds: 0,
          max_retry: undefined,
        };
        formRef.value?.clearValidate();
        fetchHandlers();
      }
    }
  );

  const handleSubmit = async () => {
    const res = await formRef.value?.validate();
    if (res) return;

    submitting.value = true;
    try {
      const { data } = await enqueueQueueTask({
        name: formData.value.name,
        // 后端 payload 为 JSON 文本字符串，非对象
        payload: formData.value.payload,
        queue: formData.value.queue || undefined,
        delay_seconds: formData.value.delay_seconds || 0,
        max_retry: formData.value.max_retry,
      });
      Message.success(
        `${t('system.queueJob.enqueueSuccess')}: ${data.data?.task_id || ''}`
      );
      emit('update:visible', false);
      emit('success');
    } catch {
      // 错误已在拦截器中统一处理，保持弹窗打开以便修正
    } finally {
      submitting.value = false;
    }
  };

  const handleCancel = () => {
    emit('update:visible', false);
  };
</script>
