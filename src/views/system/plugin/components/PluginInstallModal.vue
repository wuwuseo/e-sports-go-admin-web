<template>
  <a-modal
    :visible="visible"
    :title="$t('system.plugin.installModal.title')"
    :ok-loading="submitting"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-alert
      type="info"
      :content="$t('system.plugin.installModal.tips')"
      style="margin-bottom: 16px"
    />
    <a-form ref="formRef" :model="formData" :rules="rules" auto-label-width>
      <a-form-item
        field="package_path"
        :label="$t('system.plugin.installModal.packagePath')"
      >
        <a-input
          v-model="formData.package_path"
          :placeholder="$t('system.plugin.installModal.packagePathPlaceholder')"
          allow-clear
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
  import { computed, reactive, ref, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { installPlugin } from '@/api/plugin';

  const props = defineProps<{
    visible: boolean;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
    (e: 'success'): void;
  }>();

  const { t } = useI18n();
  const formRef = ref();
  const submitting = ref(false);

  const formData = reactive({
    package_path: '',
  });

  const rules = computed(() => ({
    package_path: [
      {
        required: true,
        message: t('system.plugin.installModal.packagePathRequired'),
      },
    ],
  }));

  const resetForm = () => {
    formData.package_path = '';
    formRef.value?.clearValidate?.();
  };

  watch(
    () => props.visible,
    (visible) => {
      if (!visible) {
        resetForm();
      }
    }
  );

  const handleSubmit = async () => {
    const errors = await formRef.value?.validate();
    if (errors) return;

    submitting.value = true;
    try {
      await installPlugin({
        package_path: formData.package_path.trim(),
      });
      Message.success(t('system.plugin.message.installSuccess'));
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
