<template>
  <a-modal
    :visible="visible"
    :title="
      isEdit
        ? $t('system.dict.form.title.edit')
        : $t('system.dict.form.title.create')
    "
    :ok-loading="submitting"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form ref="formRef" :model="formData" :rules="rules" auto-label-width>
      <a-form-item field="dict_type" :label="$t('system.dict.form.dictType')">
        <a-input
          v-model="formData.dict_type"
          :placeholder="$t('system.dict.form.dictType.placeholder')"
          :disabled="isEdit"
        />
      </a-form-item>
      <a-form-item field="label" :label="$t('system.dict.form.label')">
        <a-input
          v-model="formData.label"
          :placeholder="$t('system.dict.form.label.placeholder')"
        />
      </a-form-item>
      <a-form-item field="value" :label="$t('system.dict.form.value')">
        <a-input
          v-model="formData.value"
          :placeholder="$t('system.dict.form.value.placeholder')"
        />
      </a-form-item>
      <a-form-item field="css_class" :label="$t('system.dict.form.cssClass')">
        <a-input
          v-model="formData.css_class"
          :placeholder="$t('system.dict.form.cssClass.placeholder')"
        />
      </a-form-item>
      <a-form-item field="is_default" :label="$t('system.dict.form.isDefault')">
        <a-switch v-model="formData.is_default" />
      </a-form-item>
      <a-form-item field="sort" :label="$t('system.dict.sort')">
        <a-input-number
          v-model="formData.sort"
          :placeholder="$t('system.dict.form.sort.placeholder')"
          :min="0"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item field="status" :label="$t('system.dict.status')">
        <a-switch
          :model-value="formData.status === 1"
          @change="(val: string | number | boolean) => { formData.status = val ? 1 : 0 }"
        />
      </a-form-item>
      <a-form-item field="remark" :label="$t('system.dict.form.remark')">
        <a-textarea
          v-model="formData.remark"
          :placeholder="$t('system.dict.form.remark.placeholder')"
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
  import { createDictData, updateDictData } from '@/api/dict-data';
  import type { DictDataResponse } from '@/types/api';

  const props = defineProps<{
    visible: boolean;
    dictData?: DictDataResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
    (e: 'success'): void;
  }>();

  const { t } = useI18n();
  const formRef = ref();
  const submitting = ref(false);

  const isEdit = computed(() => !!props.dictData);

  const formData = ref({
    dict_type: '',
    label: '',
    value: '',
    css_class: '',
    is_default: false,
    sort: 0,
    status: 1,
    remark: '',
  });

  const rules = computed(() => ({
    dict_type: [
      { required: true, message: t('system.dict.form.dictType.required') },
    ],
    label: [{ required: true, message: t('system.dict.form.label.required') }],
    value: [{ required: true, message: t('system.dict.form.value.required') }],
  }));

  watch(
    () => props.visible,
    (val) => {
      if (val && props.dictData) {
        formData.value = {
          dict_type: props.dictData.dict_type,
          label: props.dictData.label,
          value: props.dictData.value,
          css_class: props.dictData.css_class || '',
          is_default: props.dictData.is_default,
          sort: props.dictData.sort,
          status: props.dictData.status,
          remark: props.dictData.remark || '',
        };
      } else if (val) {
        formData.value = {
          dict_type: '',
          label: '',
          value: '',
          css_class: '',
          is_default: false,
          sort: 0,
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
      if (isEdit.value && props.dictData) {
        await updateDictData(props.dictData.id, {
          label: formData.value.label,
          value: formData.value.value,
          css_class: formData.value.css_class || undefined,
          is_default: formData.value.is_default,
          sort: formData.value.sort,
          status: formData.value.status,
          remark: formData.value.remark || undefined,
        });
        Message.success(t('system.dict.updateSuccess'));
      } else {
        await createDictData({
          dict_type: formData.value.dict_type,
          label: formData.value.label,
          value: formData.value.value,
          css_class: formData.value.css_class || undefined,
          is_default: formData.value.is_default,
          sort: formData.value.sort,
          status: formData.value.status,
          remark: formData.value.remark || undefined,
        });
        Message.success(t('system.dict.createSuccess'));
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
