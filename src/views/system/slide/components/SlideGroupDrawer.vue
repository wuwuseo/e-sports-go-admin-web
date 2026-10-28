<template>
  <a-drawer
    :visible="visible"
    :width="720"
    :title="$t('system.slide.groupManage.title')"
    :footer="false"
    unmount-on-close
    @cancel="handleClose"
  >
    <a-space style="margin-bottom: 12px">
      <a-button v-if="canManage" type="primary" @click="handleCreate">
        <template #icon><icon-plus /></template>
        {{ $t('system.slide.groupManage.create') }}
      </a-button>
      <a-button :loading="loading" @click="loadData">
        <template #icon><icon-refresh /></template>
        {{ $t('system.slide.groupManage.refresh') }}
      </a-button>
    </a-space>

    <a-table
      :data="groups"
      :loading="loading"
      :pagination="false"
      :empty="$t('system.slide.groupManage.empty')"
      row-key="id"
      size="small"
    >
      <template #columns>
        <a-table-column
          :title="$t('system.slide.groupManage.label')"
          data-index="label"
          :ellipsis="true"
          :tooltip="true"
        />
        <a-table-column
          :title="$t('system.slide.groupManage.value')"
          data-index="value"
          :width="140"
        />
        <a-table-column
          :title="$t('system.slide.groupManage.count')"
          data-index="slide_count"
          :width="90"
          align="center"
        />
        <a-table-column
          :title="$t('system.slide.sort')"
          data-index="sort"
          :width="70"
          align="center"
        />
        <a-table-column
          :title="$t('system.slide.status')"
          :width="80"
          align="center"
        >
          <template #cell="{ record }">
            <a-tag :color="record.status === 1 ? 'green' : 'red'">
              {{
                record.status === 1
                  ? $t('system.slide.status.enabled')
                  : $t('system.slide.status.disabled')
              }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column
          :title="$t('system.slide.operations')"
          :width="130"
          align="center"
          fixed="right"
        >
          <template #cell="{ record }">
            <a-space>
              <a-button
                v-if="canManage"
                type="text"
                size="small"
                @click="handleEdit(record)"
              >
                <template #icon><icon-edit /></template>
                {{ $t('system.slide.edit') }}
              </a-button>
              <a-popconfirm
                v-if="canManage"
                :content="
                  record.slide_count > 0
                    ? $t('system.slide.groupManage.deleteBlocked')
                    : $t('system.slide.groupManage.deleteConfirm')
                "
                :disabled="record.slide_count > 0"
                type="warning"
                @ok="handleDelete(record)"
              >
                <a-button
                  type="text"
                  size="small"
                  status="danger"
                  :disabled="record.slide_count > 0"
                >
                  <template #icon><icon-delete /></template>
                  {{ $t('system.slide.delete') }}
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </a-table-column>
      </template>
    </a-table>

    <a-modal
      v-model:visible="formVisible"
      :title="
        editingId
          ? $t('system.slide.groupManage.form.editTitle')
          : $t('system.slide.groupManage.form.createTitle')
      "
      :width="480"
      :mask-closable="false"
      @before-ok="handleSubmit"
    >
      <a-form ref="formRef" :model="form" auto-label-width :rules="rules">
        <a-form-item
          field="label"
          :label="$t('system.slide.groupManage.label')"
          required
        >
          <a-input
            v-model="form.label"
            :max-length="100"
            :placeholder="$t('system.slide.groupManage.labelPlaceholder')"
          />
        </a-form-item>
        <a-form-item
          field="value"
          :label="$t('system.slide.groupManage.value')"
          required
        >
          <a-input
            v-model="form.value"
            :max-length="100"
            :placeholder="$t('system.slide.groupManage.valuePlaceholder')"
          />
          <template #extra>
            <span class="group-value-hint">
              {{ $t('system.slide.groupManage.valueHint') }}
            </span>
          </template>
        </a-form-item>
        <a-form-item field="sort" :label="$t('system.slide.sort')">
          <a-input-number v-model="form.sort" :min="0" style="width: 140px" />
        </a-form-item>
        <a-form-item field="status" :label="$t('system.slide.status')">
          <a-radio-group v-model="form.status">
            <a-radio :value="1">{{
              $t('system.slide.status.enabled')
            }}</a-radio>
            <a-radio :value="0">{{
              $t('system.slide.status.disabled')
            }}</a-radio>
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
  </a-drawer>
</template>

<script lang="ts" setup>
  import { ref, reactive, watch, computed } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import {
    getSlideGroups,
    createSlideGroup,
    updateSlideGroup,
    deleteSlideGroup,
  } from '@/api/slide-groups';
  import type { SlideGroupResponse } from '@/types/api';
  import usePermission from '@/hooks/permission';

  const props = defineProps<{
    visible: boolean;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void;
    (e: 'changed'): void;
  }>();

  const { t } = useI18n();
  const { hasButtonPermission } = usePermission();
  const canManage = computed(() => hasButtonPermission('slide:group'));

  const loading = ref(false);
  const groups = ref<SlideGroupResponse[]>([]);
  const formVisible = ref(false);
  const editingId = ref<number | null>(null);
  const formRef = ref();

  const form = reactive({
    label: '',
    value: '',
    sort: 0,
    status: 1,
    remark: '',
  });

  const GROUP_VALUE_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

  const rules = {
    label: [
      {
        required: true,
        message: t('system.slide.groupManage.labelRequired'),
      },
    ],
    value: [
      {
        required: true,
        message: t('system.slide.groupManage.valueRequired'),
      },
      {
        validator: (value: string, callback: (error?: string) => void) => {
          if (value && !GROUP_VALUE_PATTERN.test(value)) {
            callback(t('system.slide.groupManage.valueInvalid'));
            return;
          }
          callback();
        },
      },
    ],
  };

  const loadData = async () => {
    loading.value = true;
    try {
      const { data: responseData } = await getSlideGroups();
      groups.value = responseData.data || [];
    } finally {
      loading.value = false;
    }
  };

  const resetForm = () => {
    form.label = '';
    form.value = '';
    form.sort = groups.value.length * 10;
    form.status = 1;
    form.remark = '';
    formRef.value?.clearValidate();
  };

  const handleCreate = () => {
    editingId.value = null;
    resetForm();
    formVisible.value = true;
  };

  const handleEdit = (record: SlideGroupResponse) => {
    editingId.value = record.id;
    form.label = record.label;
    form.value = record.value;
    form.sort = record.sort;
    form.status = record.status;
    form.remark = record.remark || '';
    formVisible.value = true;
  };

  const handleSubmit = async () => {
    const errors = await formRef.value?.validate();
    if (errors) {
      return false;
    }
    try {
      if (editingId.value) {
        await updateSlideGroup(editingId.value, {
          label: form.label,
          value: form.value,
          sort: form.sort,
          status: form.status,
          remark: form.remark,
        });
        Message.success(t('system.slide.groupManage.message.updateSuccess'));
      } else {
        await createSlideGroup({
          label: form.label,
          value: form.value,
          sort: form.sort,
          status: form.status,
          remark: form.remark,
        });
        Message.success(t('system.slide.groupManage.message.createSuccess'));
      }
      await loadData();
      emit('changed');
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleDelete = async (record: SlideGroupResponse) => {
    try {
      await deleteSlideGroup(record.id);
      Message.success(t('system.slide.groupManage.message.deleteSuccess'));
      await loadData();
      emit('changed');
    } catch (error) {
      // 错误提示由 axios 拦截器统一处理
    }
  };

  const handleClose = () => {
    emit('update:visible', false);
  };

  watch(
    () => props.visible,
    (visible) => {
      if (visible) loadData();
    }
  );
</script>

<style scoped>
  .group-value-hint {
    color: var(--color-text-3);
    font-size: 12px;
  }
</style>
