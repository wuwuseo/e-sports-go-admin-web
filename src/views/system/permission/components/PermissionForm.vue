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
      <a-form-item field="name" :label="$t('system.permission.name')">
        <a-input
          v-model="formData.name"
          :placeholder="$t('system.permission.form.name.placeholder')"
        />
      </a-form-item>
      <a-form-item field="code" :label="$t('system.permission.code')">
        <a-input
          v-model="formData.code"
          :placeholder="$t('system.permission.form.code.placeholder')"
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
      <a-form-item field="domain" :label="$t('system.permission.domain')">
        <a-input
          v-model="formData.domain"
          :placeholder="$t('system.permission.form.domain.placeholder')"
        />
      </a-form-item>
      <a-form-item
        v-if="formData.type === 'api'"
        field="method"
        :label="$t('system.permission.method')"
      >
        <a-select
          v-model="formData.method"
          :placeholder="$t('system.permission.form.method.placeholder')"
          allow-clear
        >
          <a-option value="GET">GET</a-option>
          <a-option value="POST">POST</a-option>
          <a-option value="PUT">PUT</a-option>
          <a-option value="DELETE">DELETE</a-option>
          <a-option value="PATCH">PATCH</a-option>
        </a-select>
      </a-form-item>
      <a-form-item
        v-if="formData.type === 'api'"
        field="path"
        :label="$t('system.permission.path')"
      >
        <a-input
          v-model="formData.path"
          :placeholder="$t('system.permission.form.path.placeholder')"
        />
      </a-form-item>
      <a-form-item
        v-if="formData.type === 'menu'"
        field="menu_path"
        :label="$t('system.permission.menuPath')"
      >
        <a-input
          v-model="formData.menu_path"
          :placeholder="$t('system.permission.form.menuPath.placeholder')"
        />
      </a-form-item>
      <a-form-item
        v-if="formData.type === 'menu'"
        field="component"
        :label="$t('system.permission.component')"
      >
        <a-input
          v-model="formData.component"
          :placeholder="$t('system.permission.form.component.placeholder')"
        />
      </a-form-item>
      <a-form-item field="icon" :label="$t('system.permission.icon')">
        <a-input
          v-model="formData.icon"
          :placeholder="$t('system.permission.form.icon.placeholder')"
        />
      </a-form-item>
      <a-form-item field="parent_id" :label="$t('system.permission.parent')">
        <a-input-number
          v-model="formData.parent_id"
          :placeholder="$t('system.permission.form.parent.placeholder')"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item
        field="sort_order"
        :label="$t('system.permission.sortOrder')"
      >
        <a-input-number
          v-model="formData.sort_order"
          :placeholder="$t('system.permission.form.sortOrder.placeholder')"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item field="status" :label="$t('system.permission.status')">
        <a-switch
          v-model="formData.status"
          :checked-value="1"
          :unchecked-value="0"
        />
      </a-form-item>
      <a-form-item field="is_common" :label="$t('system.permission.isCommon')">
        <a-switch v-model="formData.is_common" />
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
  import useSysPermissionStore from '@/store/modules/sys-permission';
  import type { SysPermissionResponse, SysPermissionType } from '@/types/api';

  const props = defineProps<{
    visible: boolean;
    permission?: SysPermissionResponse;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
    (e: 'success'): void;
  }>();

  const { t } = useI18n();
  const sysPermissionStore = useSysPermissionStore();
  const formRef = ref();
  const submitting = ref(false);

  const isEdit = computed(() => !!props.permission);

  const formData = ref({
    name: '',
    code: '',
    type: '' as SysPermissionType | '',
    domain: '',
    path: '',
    method: '',
    menu_path: '',
    component: '',
    icon: '',
    parent_id: undefined as number | undefined,
    sort_order: 0,
    status: 1,
    is_common: false,
    description: '',
  });

  const rules = computed(() => ({
    name: [
      {
        required: true,
        message: t('system.permission.form.name.required'),
      },
    ],
    code: [
      { required: true, message: t('system.permission.form.code.required') },
    ],
    type: [
      { required: true, message: t('system.permission.form.type.required') },
    ],
    domain: [
      { required: true, message: t('system.permission.form.domain.required') },
    ],
  }));

  watch(
    () => props.visible,
    (val) => {
      if (val && props.permission) {
        formData.value = {
          name: props.permission.name,
          code: props.permission.code,
          type: props.permission.type,
          domain: props.permission.domain,
          path: props.permission.path || '',
          method: props.permission.method || '',
          menu_path: props.permission.menu_path || '',
          component: props.permission.component || '',
          icon: props.permission.icon || '',
          parent_id: props.permission.parent_id,
          sort_order: props.permission.sort_order || 0,
          status: props.permission.status,
          is_common: props.permission.is_common || false,
          description: props.permission.description || '',
        };
      } else if (val) {
        formData.value = {
          name: '',
          code: '',
          type: '',
          domain: '',
          path: '',
          method: '',
          menu_path: '',
          component: '',
          icon: '',
          parent_id: undefined,
          sort_order: 0,
          status: 1,
          is_common: false,
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
        await sysPermissionStore.updateSysPermission(props.permission.id, {
          name: formData.value.name,
          code: formData.value.code,
          type: formData.value.type as SysPermissionType,
          domain: formData.value.domain,
          path: formData.value.path || undefined,
          method: formData.value.method || undefined,
          menu_path: formData.value.menu_path || undefined,
          component: formData.value.component || undefined,
          icon: formData.value.icon || undefined,
          parent_id: formData.value.parent_id,
          sort_order: formData.value.sort_order,
          status: formData.value.status,
          is_common: formData.value.is_common,
          description: formData.value.description || undefined,
        });
        Message.success(t('system.permission.updateSuccess'));
      } else {
        await sysPermissionStore.createSysPermission({
          name: formData.value.name,
          code: formData.value.code,
          type: formData.value.type as SysPermissionType,
          domain: formData.value.domain,
          path: formData.value.path || undefined,
          method: formData.value.method || undefined,
          menu_path: formData.value.menu_path || undefined,
          component: formData.value.component || undefined,
          icon: formData.value.icon || undefined,
          parent_id: formData.value.parent_id,
          sort_order: formData.value.sort_order,
          status: formData.value.status,
          is_common: formData.value.is_common,
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
