<template>
  <a-modal
    :visible="visible"
    :title="
      isEdit
        ? $t('system.slide.form.editTitle')
        : $t('system.slide.form.createTitle')
    "
    :width="560"
    :mask-closable="false"
    @cancel="handleCancel"
    @before-ok="handleOk"
  >
    <a-form ref="formRef" :model="form" auto-label-width :rules="rules">
      <a-form-item field="title" :label="$t('system.slide.title')" required>
        <a-input
          v-model="form.title"
          :max-length="100"
          :placeholder="$t('system.slide.title.placeholder')"
        />
      </a-form-item>
      <a-form-item
        field="group_code"
        :label="$t('system.slide.group')"
        required
      >
        <a-select
          v-model="form.group_code"
          :placeholder="$t('system.slide.group.placeholder')"
          :loading="groupLoading"
          allow-clear
        >
          <a-option
            v-for="opt in groupOptions"
            :key="opt.value"
            :value="opt.value"
            :label="opt.label"
          />
        </a-select>
      </a-form-item>
      <a-form-item field="image" :label="$t('system.slide.image')" required>
        <div class="slide-image-field">
          <a-input
            v-model="form.image"
            :max-length="500"
            :placeholder="$t('system.slide.image.placeholder')"
          />
          <div v-if="form.image" class="slide-image-preview">
            <img :src="form.image" :alt="form.title" />
          </div>
          <AttachmentSelector
            :model-value="selectedAttachment"
            accept="image/*"
            @select="handleImageSelect"
          />
        </div>
      </a-form-item>
      <a-form-item field="link" :label="$t('system.slide.link')">
        <a-input
          v-model="form.link"
          :max-length="500"
          :placeholder="$t('system.slide.link.placeholder')"
        />
      </a-form-item>
      <a-form-item field="sort" :label="$t('system.slide.sort')">
        <a-input-number v-model="form.sort" :min="0" style="width: 140px" />
      </a-form-item>
      <a-form-item field="status" :label="$t('system.slide.status')">
        <a-radio-group v-model="form.status">
          <a-radio :value="1">{{ $t('system.slide.status.enabled') }}</a-radio>
          <a-radio :value="0">{{ $t('system.slide.status.disabled') }}</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item field="remark" :label="$t('system.slide.remark')">
        <a-textarea
          v-model="form.remark"
          :max-length="500"
          :auto-size="{ minRows: 2, maxRows: 4 }"
          :placeholder="$t('system.slide.remark.placeholder')"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
  import { ref, reactive, watch, computed } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { createSlide, updateSlide } from '@/api/slides';
  import { getDictDataByType } from '@/api/dict-data';
  import { resolveAttachmentAccessUrl } from '@/services/attachment-access.service';
  import AttachmentSelector from '@/components/attachment-selector/index.vue';
  import type {
    SlideResponse,
    DictDataResponse,
    AttachmentResponse,
  } from '@/types/api';

  const { t } = useI18n();

  const props = defineProps<{
    visible: boolean;
    record: SlideResponse | null;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
    (e: 'saved'): void;
  }>();

  const SLIDE_GROUP_DICT_TYPE = 'slide_group';

  const formRef = ref();
  const groupLoading = ref(false);
  const groupOptions = ref<DictDataResponse[]>([]);
  const selectedAttachment = ref<AttachmentResponse | null>(null);

  const isEdit = computed(() => !!props.record);

  const form = reactive({
    title: '',
    group_code: '',
    image: '',
    link: '',
    sort: 0,
    status: 1,
    remark: '',
  });

  const rules = {
    title: [{ required: true, message: t('system.slide.title.required') }],
    group_code: [{ required: true, message: t('system.slide.group.required') }],
    image: [{ required: true, message: t('system.slide.image.required') }],
  };

  const loadGroupOptions = async () => {
    groupLoading.value = true;
    try {
      const { data: responseData } = await getDictDataByType(
        SLIDE_GROUP_DICT_TYPE
      );
      groupOptions.value = responseData.data || [];
    } finally {
      groupLoading.value = false;
    }
  };

  const handleImageSelect = async (
    attachment: AttachmentResponse | AttachmentResponse[]
  ) => {
    const next = Array.isArray(attachment) ? attachment[0] : attachment;
    if (!next) return;
    selectedAttachment.value = next;
    // 统一上传约定:幻灯片图片存访问 URL 字符串(公开目录为永久直链)
    form.image = await resolveAttachmentAccessUrl(next.id);
  };

  const resetForm = () => {
    form.title = '';
    form.group_code = '';
    form.image = '';
    form.link = '';
    form.sort = 0;
    form.status = 1;
    form.remark = '';
    selectedAttachment.value = null;
    formRef.value?.clearValidate();
  };

  const fillForm = (record: SlideResponse) => {
    form.title = record.title;
    form.group_code = record.group_code;
    form.image = record.image;
    form.link = record.link || '';
    form.sort = record.sort;
    form.status = record.status;
    form.remark = record.remark || '';
    selectedAttachment.value = null;
  };

  watch(
    () => props.visible,
    (visible) => {
      if (!visible) return;
      loadGroupOptions();
      if (props.record) {
        fillForm(props.record);
      } else {
        resetForm();
      }
    }
  );

  const handleCancel = () => {
    emit('update:visible', false);
  };

  const handleOk = async () => {
    const errors = await formRef.value?.validate();
    if (errors) {
      return false;
    }
    try {
      if (props.record) {
        await updateSlide(props.record.id, {
          title: form.title,
          group_code: form.group_code,
          image: form.image,
          link: form.link,
          sort: form.sort,
          status: form.status,
          remark: form.remark,
        });
        Message.success(t('system.slide.message.updateSuccess'));
      } else {
        await createSlide({
          title: form.title,
          group_code: form.group_code,
          image: form.image,
          link: form.link,
          sort: form.sort,
          status: form.status,
          remark: form.remark,
        });
        Message.success(t('system.slide.message.createSuccess'));
      }
      emit('saved');
      emit('update:visible', false);
      return true;
    } catch (error) {
      return false;
    }
  };
</script>

<style scoped>
  .slide-image-field {
    width: 100%;
  }

  .slide-image-preview {
    margin: 8px 0;
  }

  .slide-image-preview img {
    max-width: 240px;
    max-height: 120px;
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
  }
</style>
