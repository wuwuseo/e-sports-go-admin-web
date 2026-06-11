<template>
  <a-modal
    :visible="visible"
    :title="title"
    :ok-loading="submitting"
    width="560px"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form ref="formRef" :model="formData" :rules="rules" auto-label-width>
      <a-form-item field="parent_id" :label="$t('system.department.parent')">
        <a-tree-select
          v-model="formData.parent_id"
          :data="departmentOptions"
          :placeholder="$t('system.department.form.parent.placeholder')"
          allow-search
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item field="name" :label="$t('system.department.name')">
        <a-input
          v-model="formData.name"
          :placeholder="$t('system.department.form.name.placeholder')"
          :max-length="100"
          show-word-limit
        />
      </a-form-item>
      <a-form-item field="sort" :label="$t('system.department.sort')">
        <a-input-number
          v-model="formData.sort"
          :placeholder="$t('system.department.form.sort.placeholder')"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item field="status" :label="$t('system.department.status')">
        <a-radio-group v-model="formData.status" type="button">
          <a-radio value="active">{{
            $t('system.department.status.active')
          }}</a-radio>
          <a-radio value="inactive">{{
            $t('system.department.status.inactive')
          }}</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item field="leader" :label="$t('system.department.leader')">
        <a-input
          v-model="formData.leader"
          :placeholder="$t('system.department.form.leader.placeholder')"
        />
      </a-form-item>
      <a-form-item field="phone" :label="$t('system.department.phone')">
        <a-input
          v-model="formData.phone"
          :placeholder="$t('system.department.form.phone.placeholder')"
        />
      </a-form-item>
      <a-form-item field="email" :label="$t('system.department.email')">
        <a-input
          v-model="formData.email"
          :placeholder="$t('system.department.form.email.placeholder')"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import { createDepartment, updateDepartment } from '@/api/department';
  import type {
    Department,
    DepartmentStatus,
    DepartmentTreeNode,
  } from '@/types/api';

  interface DepartmentOption {
    key: number;
    title: string;
    disabled?: boolean;
    children?: DepartmentOption[];
  }

  const props = defineProps<{
    visible: boolean;
    mode: 'create' | 'addChild' | 'edit';
    department?: Department;
    departments: DepartmentTreeNode[];
    parentId?: number;
  }>();

  const emit = defineEmits<{
    (e: 'update:visible', val: boolean): void;
    (e: 'success'): void;
  }>();

  const { t } = useI18n();
  const formRef = ref();
  const submitting = ref(false);

  const defaultFormData = () => ({
    parent_id: 0,
    name: '',
    sort: 0,
    status: 'active' as DepartmentStatus,
    leader: '',
    phone: '',
    email: '',
  });

  const formData = ref(defaultFormData());

  const title = computed(() => {
    if (props.mode === 'edit') {
      return t('system.department.form.title.edit');
    }
    if (props.mode === 'addChild') {
      return t('system.department.form.title.addChild');
    }
    return t('system.department.form.title.create');
  });

  const currentDepartmentId = computed(() =>
    props.mode === 'edit' ? props.department?.id : undefined
  );

  const buildOptions = (
    nodes: DepartmentTreeNode[],
    excludeId?: number
  ): DepartmentOption[] => {
    return nodes.map((node) => {
      const isExcluded = node.id === excludeId;
      return {
        key: node.id,
        title: node.name,
        disabled: isExcluded,
        children: node.children?.length
          ? buildOptions(node.children, excludeId).map((child) => ({
              ...child,
              disabled: isExcluded || child.disabled,
            }))
          : undefined,
      };
    });
  };

  const departmentOptions = computed<DepartmentOption[]>(() => [
    {
      key: 0,
      title: t('system.department.parent.none'),
    },
    ...buildOptions(props.departments, currentDepartmentId.value),
  ]);

  const rules = computed(() => ({
    name: [
      {
        required: true,
        message: t('system.department.form.name.required'),
      },
      {
        maxLength: 100,
        message: t('system.department.form.name.max'),
      },
    ],
    email: [
      {
        validator: (
          value: string | undefined,
          callback: (error?: string) => void
        ) => {
          if (!value) {
            callback();
            return;
          }
          const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
          callback(
            valid ? undefined : t('system.department.form.email.invalid')
          );
        },
      },
    ],
  }));

  watch(
    () => props.visible,
    (val) => {
      if (!val) {
        return;
      }

      if (props.mode === 'edit' && props.department) {
        formData.value = {
          parent_id: props.department.parent_id || 0,
          name: props.department.name,
          sort: props.department.sort,
          status: props.department.status,
          leader: props.department.leader || '',
          phone: props.department.phone || '',
          email: props.department.email || '',
        };
        return;
      }

      formData.value = {
        ...defaultFormData(),
        parent_id: props.parentId || 0,
      };
    }
  );

  const trimOptional = (value: string) => value.trim() || undefined;

  const handleSubmit = async () => {
    const errors = await formRef.value?.validate();
    if (errors) return;

    submitting.value = true;
    try {
      const payload = {
        name: formData.value.name.trim(),
        parent_id: formData.value.parent_id || 0,
        sort: Number(formData.value.sort || 0),
        status: formData.value.status,
        leader: trimOptional(formData.value.leader),
        phone: trimOptional(formData.value.phone),
        email: trimOptional(formData.value.email),
      };

      if (props.mode === 'edit' && props.department) {
        await updateDepartment(props.department.id, payload);
        Message.success(t('system.department.updateSuccess'));
      } else {
        await createDepartment(payload);
        Message.success(t('system.department.createSuccess'));
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
